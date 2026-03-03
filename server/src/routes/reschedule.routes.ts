import { Router, Response } from "express";
import { prisma } from "../utils/prisma";
import { protectRoute, AuthRequest } from "../middlewares/auth.middleware";
import { NotifType } from "@prisma/client";

export const rescheduleRouter = Router({ mergeParams: true }); // mounted at /api/events/:id
rescheduleRouter.use(protectRoute);

// ── helper: create notifications in bulk ─────────────────────────────────────
async function notify(
    userIds: string[],
    type: NotifType,
    title: string,
    body: string,
    link?: string
) {
    const unique = [...new Set(userIds)];
    if (unique.length === 0) return;
    await prisma.notification.createMany({
        data: unique.map((userId) => ({ userId, type, title, body, link })),
    });
}

// ── POST /api/events/:id/reschedule-requests ─────────────────────────────────
// Participant submits a reschedule request
rescheduleRouter.post("/", async (req: AuthRequest, res: Response): Promise<void> => {
    const eventId = req.params.id as string;
    const requesterId = req.user!.userId;
    const { reason, suggestedStartDate, suggestedEndDate } = req.body as {
        reason: string;
        suggestedStartDate?: string;
        suggestedEndDate?: string;
    };

    if (!reason?.trim()) {
        res.status(400).json({ success: false, message: "Reason is required" });
        return;
    }

    const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: { creator: { select: { id: true, name: true } } },
    });
    if (!event) { res.status(404).json({ success: false, message: "Event not found" }); return; }

    // Check requester is a participant or creator
    const isParticipant = await prisma.eventParticipant.findUnique({
        where: { eventId_userId: { eventId, userId: requesterId } },
    });
    if (!isParticipant && event.creatorId !== requesterId) {
        res.status(403).json({ success: false, message: "You are not part of this event" });
        return;
    }

    const request = await prisma.rescheduleRequest.create({
        data: {
            eventId,
            requesterId,
            reason,
            suggestedStartDate: suggestedStartDate ? new Date(suggestedStartDate) : undefined,
            suggestedEndDate: suggestedEndDate ? new Date(suggestedEndDate) : undefined,
        },
        include: { requester: { select: { id: true, name: true } } },
    });

    // Notify the creator
    await notify(
        [event.creatorId],
        "RESCHEDULE_REQUEST",
        `Reschedule Requested: ${event.title}`,
        `${request.requester.name} requested to reschedule "${event.title}". Reason: ${reason}`,
        `/dashboard/events?reviewRequest=${request.id}`
    );

    res.status(201).json({ success: true, data: request });
});

// ── GET /api/events/:id/reschedule-requests ───────────────────────────────────
// Creator sees pending requests
rescheduleRouter.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
    const eventId = req.params.id as string;
    const userId = req.user!.userId;

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) { res.status(404).json({ success: false, message: "Event not found" }); return; }
    if (event.creatorId !== userId && req.user!.role !== "SENIOR_MANAGEMENT") {
        res.status(403).json({ success: false, message: "Unauthorized" }); return;
    }

    const requests = await prisma.rescheduleRequest.findMany({
        where: { eventId },
        include: { requester: { select: { id: true, name: true, designation: true, avatar: true } } },
        orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: requests });
});

// ── GET /api/events/:id/reschedule-requests/:reqId ──────────────────────────
// Fetch single request details
rescheduleRouter.get("/:reqId", async (req: AuthRequest, res: Response): Promise<void> => {
    const { id: eventId, reqId } = req.params;

    const request = await prisma.rescheduleRequest.findUnique({
        where: { id: reqId as string },
        include: {
            requester: { select: { id: true, name: true, avatar: true } },
            event: { select: { id: true, title: true, startDate: true, endDate: true } }
        }
    });

    if (!request || (eventId && request.eventId !== eventId)) {
        res.status(404).json({ success: false, message: "Request not found" });
        return;
    }

    res.json({ success: true, data: request });
});

// ── PATCH /api/events/:id/reschedule-requests/:reqId ──────────────────────────
// Creator approves or rejects
rescheduleRouter.patch("/:reqId", async (req: AuthRequest, res: Response): Promise<void> => {
    const { id: eventId, reqId } = req.params as { id: string; reqId: string };
    const { action } = req.body as { action: "APPROVE" | "REJECT" };
    const userId = req.user!.userId;

    const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
            participants: { select: { userId: true } },
        },
    });
    if (!event) { res.status(404).json({ success: false, message: "Event not found" }); return; }
    if (event.creatorId !== userId) { res.status(403).json({ success: false, message: "Only the creator can approve/reject" }); return; }

    const rr = await prisma.rescheduleRequest.findUnique({ where: { id: reqId } });
    if (!rr || rr.eventId !== eventId) { res.status(404).json({ success: false, message: "Request not found" }); return; }

    if (action === "APPROVE") {
        // 1. Update the event dates (use suggested or keep existing)
        await prisma.event.update({
            where: { id: eventId },
            data: {
                startDate: rr.suggestedStartDate ?? event.startDate,
                endDate: rr.suggestedEndDate ?? event.endDate,
            },
        });

        // 2. Reset all participants' invite status back to PENDING (re-confirmation needed)
        await prisma.eventParticipant.updateMany({
            where: { eventId },
            data: { status: "PENDING" },
        });

        // 3. Mark request as approved
        await prisma.rescheduleRequest.update({ where: { id: reqId }, data: { status: "APPROVED" } });

        // 4. Notify all participants about the reschedule
        const participantIds = event.participants.map((p) => p.userId);
        await notify(
            participantIds,
            "EVENT_RESCHEDULED",
            `Event Rescheduled: ${event.title}`,
            `The event "${event.title}" has been rescheduled. Please review the new time and confirm your attendance.`,
            `/dashboard/events`
        );

        // 5. Notify requester of approval
        await notify(
            [rr.requesterId],
            "RESCHEDULE_APPROVED",
            `Reschedule Approved: ${event.title}`,
            `Your reschedule request for "${event.title}" has been approved.`,
            `/dashboard/events`
        );

    } else if (action === "REJECT") {
        await prisma.rescheduleRequest.update({ where: { id: reqId }, data: { status: "REJECTED" } });

        await notify(
            [rr.requesterId],
            "RESCHEDULE_REJECTED",
            `Reschedule Rejected: ${event.title}`,
            `Your reschedule request for "${event.title}" was declined by the organiser.`,
            `/dashboard/events`
        );
    } else {
        res.status(400).json({ success: false, message: "action must be APPROVE or REJECT" });
        return;
    }

    res.json({ success: true, message: `Request ${action.toLowerCase()}d` });
});
