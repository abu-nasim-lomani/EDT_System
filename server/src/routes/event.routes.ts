import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { protectRoute, AuthRequest } from "../middlewares/auth.middleware";

export const eventRouter = Router();
eventRouter.use(protectRoute);

const EventSchema = z.object({
    title: z.string().min(2),
    description: z.string().optional(),
    agenda: z.string().optional(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    projectId: z.string().uuid().optional(),
    previousEventId: z.string().uuid().optional(),
    participantIds: z.array(z.string().uuid()).optional(),
});

// ── GET /api/events ──
eventRouter.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
    const projectId = req.query.projectId as string | undefined;
    const events = await prisma.event.findMany({
        where: { ...(projectId && { projectId }) },
        include: {
            creator: { select: { id: true, name: true, avatar: true } },
            participants: { include: { user: { select: { id: true, name: true, avatar: true } } } },
            project: { select: { id: true, name: true } },
            documents: true,
        },
        orderBy: { startDate: "asc" },
    });
    res.json({ success: true, data: events });
});

// ── POST /api/events ──
eventRouter.post("/", async (req: AuthRequest, res: Response): Promise<void> => {
    const parsed = EventSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ success: false, errors: parsed.error.flatten() }); return; }

    const { participantIds, ...data } = parsed.data;

    // Conflict detection: check if any invited participant already has an overlapping event
    const conflicts: string[] = [];
    if (participantIds?.length) {
        for (const uid of participantIds) {
            const overlap = await prisma.event.findFirst({
                where: {
                    participants: { some: { userId: uid, status: "ACCEPTED" } },
                    AND: [
                        { startDate: { lt: new Date(data.endDate) } },
                        { endDate: { gt: new Date(data.startDate) } },
                    ],
                },
                select: { id: true, title: true },
            });
            if (overlap) conflicts.push(uid);
        }
    }

    const event = await prisma.event.create({
        data: {
            ...data,
            creatorId: req.user!.userId,
            participants: participantIds?.length
                ? { create: participantIds.map((uid) => ({ userId: uid, status: "PENDING" })) }
                : undefined,
        },
        include: {
            participants: { include: { user: { select: { id: true, name: true } } } },
        },
    });

    res.status(201).json({
        success: true,
        data: event,
        ...(conflicts.length && { conflictUserIds: conflicts, warning: "Some participants have overlapping events" }),
    });
});

// ── PATCH /api/events/:id/invite-response ──
// Participant accepts or declines an invitation
eventRouter.patch("/:id/invite-response", async (req: AuthRequest, res: Response): Promise<void> => {
    const eventId = req.params.id as string;
    const { status, declineReason } = req.body as { status: "ACCEPTED" | "DECLINED"; declineReason?: string };
    const userId = req.user!.userId;

    const updated = await prisma.eventParticipant.update({
        where: { eventId_userId: { eventId, userId } },
        data: { status, declineReason },
    });
    res.json({ success: true, data: updated });
});

// ── PATCH /api/events/:id/complete ──
// Organiser adds minutes and marks event as complete
eventRouter.patch("/:id/complete", async (req: AuthRequest, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) { res.status(404).json({ success: false, message: "Event not found" }); return; }
    if (event.status === "COMPLETED") { res.status(400).json({ success: false, message: "Event already completed" }); return; }

    const { minutes } = req.body as { minutes: string };
    const completed = await prisma.event.update({
        where: { id },
        data: { status: "COMPLETED", minutes },
    });
    res.json({ success: true, data: completed });
});

// ── GET /api/events/:id ──
eventRouter.get("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const event = await prisma.event.findUnique({
        where: { id },
        include: {
            creator: { select: { id: true, name: true, avatar: true } },
            participants: { include: { user: { select: { id: true, name: true, avatar: true, role: true } } } },
            documents: true,
            previousEvent: { select: { id: true, title: true, startDate: true } },
            nextEvents: { select: { id: true, title: true, startDate: true } },
        },
    });
    if (!event) { res.status(404).json({ success: false, message: "Event not found" }); return; }
    res.json({ success: true, data: event });
});
