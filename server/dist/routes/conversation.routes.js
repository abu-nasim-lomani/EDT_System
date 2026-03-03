"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.conversationRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../utils/prisma");
const auth_middleware_1 = require("../middlewares/auth.middleware");
exports.conversationRouter = (0, express_1.Router)();
exports.conversationRouter.use(auth_middleware_1.protectRoute);
// ─── GET /api/conversations ─────────────────────────────────────────────────
// List all conversations the logged-in user is a member of
exports.conversationRouter.get("/", async (req, res) => {
    const userId = req.user.userId;
    try {
        const convos = await prisma_1.prisma.conversation.findMany({
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
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
// ─── POST /api/conversations ─────────────────────────────────────────────────
// Create a DIRECT or GROUP conversation
const CreateSchema = zod_1.z.object({
    type: zod_1.z.enum(["DIRECT", "GROUP"]),
    name: zod_1.z.string().optional(),
    memberIds: zod_1.z.array(zod_1.z.string()).min(1),
    projectId: zod_1.z.string().optional(),
    taskId: zod_1.z.string().optional(),
    eventId: zod_1.z.string().optional(),
    decisionId: zod_1.z.string().optional(),
});
exports.conversationRouter.post("/", async (req, res) => {
    const userId = req.user.userId;
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
            const existing = await prisma_1.prisma.conversation.findFirst({
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
        const conv = await prisma_1.prisma.conversation.create({
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
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
// ─── GET /api/conversations/:id ──────────────────────────────────────────────
// Get conversation details + recent messages
exports.conversationRouter.get("/:id", async (req, res) => {
    const userId = req.user.userId;
    const { id } = req.params;
    try {
        const conv = await prisma_1.prisma.conversation.findFirst({
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
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
// ─── PATCH /api/conversations/:id ────────────────────────────────────────────
// Update group name/avatar (admin only)
exports.conversationRouter.patch("/:id", async (req, res) => {
    const userId = req.user.userId;
    const { id } = req.params;
    const { name, avatar } = req.body;
    try {
        const member = await prisma_1.prisma.convMember.findUnique({
            where: { conversationId_userId: { conversationId: id, userId } },
        });
        if (!member || member.role !== "ADMIN") {
            res.status(403).json({ success: false, message: "Only admins can update group info." });
            return;
        }
        const updated = await prisma_1.prisma.conversation.update({
            where: { id },
            data: { name, avatar },
        });
        res.json({ success: true, data: updated });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
// ─── GET /api/conversations/:id/messages ────────────────────────────────────
// Get messages (cursor-based pagination, newest first)
exports.conversationRouter.get("/:id/messages", async (req, res) => {
    const userId = req.user.userId;
    const { id } = req.params;
    const { cursor, limit = "50" } = req.query;
    try {
        const isMember = await prisma_1.prisma.convMember.findUnique({
            where: { conversationId_userId: { conversationId: id, userId } },
        });
        if (!isMember) {
            res.status(403).json({ success: false, message: "Not a member of this conversation." });
            return;
        }
        const messages = await prisma_1.prisma.message.findMany({
            where: { conversationId: id },
            orderBy: { createdAt: "asc" },
            take: parseInt(limit, 10),
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            include: { sender: { select: { id: true, name: true, avatar: true } } },
        });
        res.json({ success: true, data: messages });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
// ─── POST /api/conversations/:id/messages ───────────────────────────────────
// Send a message
exports.conversationRouter.post("/:id/messages", async (req, res) => {
    const userId = req.user.userId;
    const { id } = req.params;
    const { text } = req.body;
    if (!text || !text.trim()) {
        res.status(400).json({ success: false, message: "Message text is required." });
        return;
    }
    try {
        // Check membership and get conversation with all members + sender name
        const conv = await prisma_1.prisma.conversation.findFirst({
            where: { id, members: { some: { userId } } },
            select: {
                id: true,
                type: true,
                name: true,
                members: { select: { userId: true } },
            },
        });
        if (!conv) {
            res.status(403).json({ success: false, message: "Not a member of this conversation." });
            return;
        }
        // Get sender name
        const sender = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { name: true },
        });
        const senderName = sender?.name ?? "Someone";
        const convName = conv.type === "GROUP" ? (conv.name ?? "Group") : senderName;
        // Create message and bump conversation timestamp
        const [msg] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.message.create({
                data: { text: text.trim(), senderId: userId, conversationId: id },
                include: { sender: { select: { id: true, name: true, avatar: true } } },
            }),
            prisma_1.prisma.conversation.update({ where: { id }, data: { updatedAt: new Date() } }),
        ]);
        // Create notifications for all OTHER members (fire-and-forget, non-blocking)
        const otherMemberIds = conv.members
            .map((m) => m.userId)
            .filter((uid) => uid !== userId);
        if (otherMemberIds.length > 0) {
            prisma_1.prisma.notification.createMany({
                data: otherMemberIds.map((recipientId) => ({
                    type: "NEW_MESSAGE",
                    title: conv.type === "GROUP"
                        ? `New message in ${convName}`
                        : `New message from ${senderName}`,
                    body: text.trim().length > 80 ? text.trim().slice(0, 80) + "…" : text.trim(),
                    link: `/dashboard/messages?conv=${id}`,
                    userId: recipientId,
                })),
            }).then(() => {
                console.log(`[MSG NOTIF] Created ${otherMemberIds.length} notification(s) for conv ${id}`);
            }).catch((err) => {
                console.error(`[MSG NOTIF] Failed to create notifications:`, err.message);
            });
        }
        res.status(201).json({ success: true, data: msg });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
// ─── POST /api/conversations/:id/members ────────────────────────────────────
// Add a member to a GROUP (admin only)
exports.conversationRouter.post("/:id/members", async (req, res) => {
    const userId = req.user.userId;
    const { id } = req.params;
    const { memberId } = req.body;
    if (!memberId) {
        res.status(400).json({ success: false, message: "memberId is required." });
        return;
    }
    try {
        const member = await prisma_1.prisma.convMember.findUnique({
            where: { conversationId_userId: { conversationId: id, userId } },
        });
        if (!member || member.role !== "ADMIN") {
            res.status(403).json({ success: false, message: "Only admins can add members." });
            return;
        }
        const newMember = await prisma_1.prisma.convMember.create({
            data: { conversationId: id, userId: memberId, role: "MEMBER" },
            include: { user: { select: { id: true, name: true, avatar: true, role: true } } },
        });
        res.status(201).json({ success: true, data: newMember });
    }
    catch (e) {
        if (e.code === "P2002") {
            res.status(409).json({ success: false, message: "User is already a member." });
            return;
        }
        res.status(500).json({ success: false, message: e.message });
    }
});
// ─── DELETE /api/conversations/:id/members/:userId ──────────────────────────
// Remove a member from a GROUP (admin only, cannot remove yourself if last admin)
exports.conversationRouter.delete("/:id/members/:memberId", async (req, res) => {
    const requesterId = req.user.userId;
    const { id, memberId } = req.params;
    try {
        const requester = await prisma_1.prisma.convMember.findUnique({
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
        await prisma_1.prisma.convMember.delete({
            where: { conversationId_userId: { conversationId: id, userId: memberId } },
        });
        res.json({ success: true, message: "Member removed." });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
//# sourceMappingURL=conversation.routes.js.map