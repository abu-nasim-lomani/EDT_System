"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../utils/prisma");
const auth_middleware_1 = require("../middlewares/auth.middleware");
exports.eventRouter = (0, express_1.Router)();
exports.eventRouter.use(auth_middleware_1.protectRoute);
const EventSchema = zod_1.z.object({
    title: zod_1.z.string().min(2),
    description: zod_1.z.string().optional(),
    agenda: zod_1.z.string().optional(),
    type: zod_1.z.enum(["MEETING", "TRAINING", "REVIEW", "PRESENTATION", "WEBINAR", "OTHER"]).optional(),
    startDate: zod_1.z.string().datetime(),
    endDate: zod_1.z.string().datetime(),
    projectId: zod_1.z.string().uuid().optional(),
    previousEventId: zod_1.z.string().uuid().optional(),
    participantIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
});
// ── GET /api/events ──
exports.eventRouter.get("/", async (req, res) => {
    const projectId = req.query.projectId;
    const events = await prisma_1.prisma.event.findMany({
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
exports.eventRouter.post("/", async (req, res) => {
    const parsed = EventSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ success: false, errors: parsed.error.flatten() });
        return;
    }
    const { participantIds, ...data } = parsed.data;
    // Conflict detection: check if any invited participant already has an overlapping event
    const conflicts = [];
    if (participantIds?.length) {
        for (const uid of participantIds) {
            const overlap = await prisma_1.prisma.event.findFirst({
                where: {
                    participants: { some: { userId: uid, status: "ACCEPTED" } },
                    AND: [
                        { startDate: { lt: new Date(data.endDate) } },
                        { endDate: { gt: new Date(data.startDate) } },
                    ],
                },
                select: { id: true, title: true },
            });
            if (overlap)
                conflicts.push(uid);
        }
    }
    const event = await prisma_1.prisma.event.create({
        data: {
            ...data,
            creatorId: req.user.userId,
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
exports.eventRouter.patch("/:id/invite-response", async (req, res) => {
    const eventId = req.params.id;
    const { status, declineReason } = req.body;
    const userId = req.user.userId;
    const updated = await prisma_1.prisma.eventParticipant.update({
        where: { eventId_userId: { eventId, userId } },
        data: { status, declineReason },
    });
    res.json({ success: true, data: updated });
});
// ── PATCH /api/events/:id/complete ──
// Organiser adds minutes and marks event as complete
exports.eventRouter.patch("/:id/complete", async (req, res) => {
    const id = req.params.id;
    const event = await prisma_1.prisma.event.findUnique({ where: { id } });
    if (!event) {
        res.status(404).json({ success: false, message: "Event not found" });
        return;
    }
    if (event.status === "COMPLETED") {
        res.status(400).json({ success: false, message: "Event already completed" });
        return;
    }
    const { minutes } = req.body;
    const completed = await prisma_1.prisma.event.update({
        where: { id },
        data: { status: "COMPLETED", minutes },
    });
    res.json({ success: true, data: completed });
});
// ── PATCH /api/events/:id ── (edit/reschedule by creator)
exports.eventRouter.patch("/:id", async (req, res) => {
    const id = req.params.id;
    const event = await prisma_1.prisma.event.findUnique({ where: { id } });
    if (!event) {
        res.status(404).json({ success: false, message: "Event not found" });
        return;
    }
    if (event.creatorId !== req.user.userId && req.user.role !== "SENIOR_MANAGEMENT") {
        res.status(403).json({ success: false, message: "Unauthorized" });
        return;
    }
    const { title, description, agenda, startDate, endDate, projectId } = req.body;
    const updated = await prisma_1.prisma.event.update({
        where: { id },
        data: {
            ...(title && { title }),
            ...(description !== undefined && { description }),
            ...(agenda !== undefined && { agenda }),
            ...(startDate && { startDate: new Date(startDate) }),
            ...(endDate && { endDate: new Date(endDate) }),
            ...(projectId !== undefined && { projectId: projectId || null }),
        },
    });
    res.json({ success: true, data: updated });
});
// ── DELETE /api/events/:id ──
exports.eventRouter.delete("/:id", async (req, res) => {
    const id = req.params.id;
    const event = await prisma_1.prisma.event.findUnique({ where: { id } });
    if (!event) {
        res.status(404).json({ success: false, message: "Event not found" });
        return;
    }
    if (event.creatorId !== req.user.userId && req.user.role !== "SENIOR_MANAGEMENT") {
        res.status(403).json({ success: false, message: "Unauthorized" });
        return;
    }
    await prisma_1.prisma.event.delete({ where: { id } });
    res.json({ success: true, message: "Event deleted" });
});
// ── GET /api/events/:id ──
exports.eventRouter.get("/:id", async (req, res) => {
    const id = req.params.id;
    const event = await prisma_1.prisma.event.findUnique({
        where: { id },
        include: {
            creator: { select: { id: true, name: true, avatar: true } },
            participants: { include: { user: { select: { id: true, name: true, avatar: true, role: true } } } },
            documents: true,
            previousEvent: { select: { id: true, title: true, startDate: true } },
            nextEvents: { select: { id: true, title: true, startDate: true } },
        },
    });
    if (!event) {
        res.status(404).json({ success: false, message: "Event not found" });
        return;
    }
    res.json({ success: true, data: event });
});
// ── GET /api/events/:id/decisions ──
exports.eventRouter.get("/:id/decisions", async (req, res) => {
    try {
        const eventId = req.params.id;
        const decisions = await prisma_1.prisma.decision.findMany({
            where: { eventId },
            include: {
                task: {
                    select: { id: true, title: true, status: true }
                }
            },
            orderBy: { createdAt: "desc" }
        });
        res.json({ success: true, data: decisions });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// ── POST /api/events/:id/decisions ──
exports.eventRouter.post("/:id/decisions", async (req, res) => {
    try {
        const eventId = req.params.id;
        const { summary } = req.body;
        if (!summary?.trim()) {
            res.status(400).json({ success: false, message: "Summary is required" });
            return;
        }
        const decision = await prisma_1.prisma.decision.create({
            data: { summary: summary.trim(), eventId }
        });
        res.status(201).json({ success: true, data: decision });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
//# sourceMappingURL=event.routes.js.map