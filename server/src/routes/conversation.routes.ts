import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { protectRoute, AuthRequest } from "../middlewares/auth.middleware";

export const conversationRouter = Router();
conversationRouter.use(protectRoute);

// ─── GET /api/conversations ─────────────────────────────────────────────────
// List all conversations the logged-in user is a member of
conversationRouter.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    try {
        const convos = await prisma.conversation.findMany({
            where: { members: { some: { userId } } },
            include: {
                members: {
                    include: { user: { select: { id: true, name: true, avatar: true, role: true } } },
                },
                messages: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    include: { sender: { select: { id: true, name: true } } },
                },
                project: { select: { id: true, name: true } },
                task: { select: { id: true, title: true } },
                event: { select: { id: true, title: true } },
                decision: { select: { id: true, summary: true } },
            },
            orderBy: { updatedAt: "desc" },
        });
        res.json({ success: true, data: convos });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// ─── POST /api/conversations ─────────────────────────────────────────────────
// Create a DIRECT or GROUP conversation
const CreateSchema = z.object({
    type: z.enum(["DIRECT", "GROUP"]),
    name: z.string().optional(),
    memberIds: z.array(z.string()).min(1),
    projectId: z.string().optional(),
    taskId: z.string().optional(),
    eventId: z.string().optional(),
    decisionId: z.string().optional(),
});

conversationRouter.post("/", async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const parsed = CreateSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ success: false, message: parsed.error.issues[0].message });
        return;
    }
    const { type, name, memberIds, projectId, taskId, eventId, decisionId } = parsed.data;

    try {
        // For DIRECT chats: prevent duplicate conversation between same 2 users
        if (type === "DIRECT") {
            const otherId = memberIds.find(id => id !== userId) ?? memberIds[0];
            const existing = await prisma.conversation.findFirst({
                where: {
                    type: "DIRECT",
                    members: { every: { userId: { in: [userId, otherId] } } },
                },
                include: { members: true },
            });
            // Extra check: must have exactly 2 members
            if (existing && existing.members.length === 2) {
                res.json({ success: true, data: existing, isExisting: true });
                return;
            }
        }

        const allMemberIds = Array.from(new Set([userId, ...memberIds]));
        const conv = await prisma.conversation.create({
            data: {
                type,
                name: type === "GROUP" ? name : undefined,
                projectId,
                taskId,
                eventId,
                decisionId,
                members: {
                    create: allMemberIds.map(id => ({
                        userId: id,
                        role: id === userId ? "ADMIN" : "MEMBER",
                    })),
                },
            },
            include: {
                members: {
                    include: { user: { select: { id: true, name: true, avatar: true, role: true } } },
                },
                project: { select: { id: true, name: true } },
                task: { select: { id: true, title: true } },
                event: { select: { id: true, title: true } },
                decision: { select: { id: true, summary: true } },
            },
        });
        res.status(201).json({ success: true, data: conv });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// ─── GET /api/conversations/:id ──────────────────────────────────────────────
// Get conversation details + recent messages
conversationRouter.get("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    try {
        const conv = await prisma.conversation.findFirst({
            where: { id, members: { some: { userId } } },
            include: {
                members: {
                    include: { user: { select: { id: true, name: true, avatar: true, role: true } } },
                },
                project: { select: { id: true, name: true } },
                task: { select: { id: true, title: true } },
                event: { select: { id: true, title: true } },
                decision: { select: { id: true, summary: true } },
            },
        });
        if (!conv) {
            res.status(404).json({ success: false, message: "Conversation not found or access denied." });
            return;
        }
        res.json({ success: true, data: conv });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// ─── PATCH /api/conversations/:id ────────────────────────────────────────────
// Update group name/avatar (admin only)
conversationRouter.patch("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const { name, avatar } = req.body;
    try {
        const member = await prisma.convMember.findUnique({
            where: { conversationId_userId: { conversationId: id, userId } },
        });
        if (!member || member.role !== "ADMIN") {
            res.status(403).json({ success: false, message: "Only admins can update group info." });
            return;
        }
        const updated = await prisma.conversation.update({
            where: { id },
            data: { name, avatar },
        });
        res.json({ success: true, data: updated });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// ─── GET /api/conversations/:id/messages ────────────────────────────────────
// Get messages (cursor-based pagination, newest first)
conversationRouter.get("/:id/messages", async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const { cursor, limit = "50" } = req.query as { cursor?: string; limit?: string };
    try {
        const isMember = await prisma.convMember.findUnique({
            where: { conversationId_userId: { conversationId: id, userId } },
        });
        if (!isMember) {
            res.status(403).json({ success: false, message: "Not a member of this conversation." });
            return;
        }
        const messages = await prisma.message.findMany({
            where: { conversationId: id },
            orderBy: { createdAt: "asc" },
            take: parseInt(limit, 10),
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            include: { sender: { select: { id: true, name: true, avatar: true } } },
        });
        res.json({ success: true, data: messages });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// ─── POST /api/conversations/:id/messages ───────────────────────────────────
// Send a message
conversationRouter.post("/:id/messages", async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const { text } = req.body;
    if (!text || !text.trim()) {
        res.status(400).json({ success: false, message: "Message text is required." });
        return;
    }
    try {
        type ConvWithMembers = { id: string; type: string; name: string | null; members: { userId: string }[] } | null;
        // Check membership and get conversation with all members + sender name
        const conv = await (prisma.conversation.findFirst({
            where: { id, members: { some: { userId } } },
            select: {
                id: true,
                type: true,
                name: true,
                members: { select: { userId: true } },
            },
        }) as unknown as Promise<ConvWithMembers>);
        if (!conv) {
            res.status(403).json({ success: false, message: "Not a member of this conversation." });
            return;
        }

        // Get sender name
        const sender = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true },
        });

        const senderName = sender?.name ?? "Someone";
        const convName = conv.type === "GROUP" ? (conv.name ?? "Group") : senderName;

        // Create message and bump conversation timestamp
        const [msg] = await prisma.$transaction([
            prisma.message.create({
                data: { text: text.trim(), senderId: userId, conversationId: id },
                include: { sender: { select: { id: true, name: true, avatar: true } } },
            }),
            prisma.conversation.update({ where: { id }, data: { updatedAt: new Date() } }),
        ]);

        // Create notifications for all OTHER members (fire-and-forget, non-blocking)
        const otherMemberIds = conv.members
            .map((m: { userId: string }) => m.userId)
            .filter((uid: string) => uid !== userId);

        if (otherMemberIds.length > 0) {
            prisma.notification.createMany({
                data: otherMemberIds.map((recipientId: string) => ({
                    type: "NEW_MESSAGE" as const,
                    title: conv.type === "GROUP"
                        ? `New message in ${convName}`
                        : `New message from ${senderName}`,
                    body: text.trim().length > 80 ? text.trim().slice(0, 80) + "…" : text.trim(),
                    link: `/dashboard/messages?conv=${id}`,
                    userId: recipientId,
                })),
            }).then(() => {
                console.log(`[MSG NOTIF] Created ${otherMemberIds.length} notification(s) for conv ${id}`);
            }).catch((err: Error) => {
                console.error(`[MSG NOTIF] Failed to create notifications:`, err.message);
            });
        }

        res.status(201).json({ success: true, data: msg });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
});



// ─── POST /api/conversations/:id/members ────────────────────────────────────
// Add a member to a GROUP (admin only)
conversationRouter.post("/:id/members", async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const { memberId } = req.body;
    if (!memberId) {
        res.status(400).json({ success: false, message: "memberId is required." });
        return;
    }
    try {
        const member = await prisma.convMember.findUnique({
            where: { conversationId_userId: { conversationId: id, userId } },
        });
        if (!member || member.role !== "ADMIN") {
            res.status(403).json({ success: false, message: "Only admins can add members." });
            return;
        }
        const newMember = await prisma.convMember.create({
            data: { conversationId: id, userId: memberId, role: "MEMBER" },
            include: { user: { select: { id: true, name: true, avatar: true, role: true } } },
        });
        res.status(201).json({ success: true, data: newMember });
    } catch (e: any) {
        if (e.code === "P2002") {
            res.status(409).json({ success: false, message: "User is already a member." });
            return;
        }
        res.status(500).json({ success: false, message: e.message });
    }
});

// ─── DELETE /api/conversations/:id/members/:userId ──────────────────────────
// Remove a member from a GROUP (admin only, cannot remove yourself if last admin)
conversationRouter.delete("/:id/members/:memberId", async (req: AuthRequest, res: Response): Promise<void> => {
    const requesterId = req.user!.userId;
    const { id, memberId } = req.params as Record<string, string>;
    try {
        const requester = await prisma.convMember.findUnique({
            where: { conversationId_userId: { conversationId: id, userId: requesterId } },
        });
        if (!requester || requester.role !== "ADMIN") {
            res.status(403).json({ success: false, message: "Only admins can remove members." });
            return;
        }
        if (requesterId === memberId) {
            res.status(400).json({ success: false, message: "You cannot remove yourself. Transfer admin first." });
            return;
        }
        await prisma.convMember.delete({
            where: { conversationId_userId: { conversationId: id, userId: memberId } },
        });
        res.json({ success: true, message: "Member removed." });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
});
