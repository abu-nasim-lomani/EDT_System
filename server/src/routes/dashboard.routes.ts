import { Router, Response } from "express";
import { prisma } from "../utils/prisma";
import { protectRoute, requireRole, AuthRequest } from "../middlewares/auth.middleware";

export const dashboardRouter = Router();
dashboardRouter.use(protectRoute);

// ── GET /api/dashboard/stats ──
// SM-level overview: all project/task/event counts
dashboardRouter.get("/stats", requireRole("SENIOR_MANAGEMENT"), async (_req: AuthRequest, res: Response): Promise<void> => {
    const [
        totalProjects,
        activeProjects,
        pendingProjects,
        stuckProjects,
        completedProjects,
        totalTasks,
        completedTasks,
        pendingTasks,
        stuckTasks,
        upcomingEvents,
        conflictCount,
    ] = await Promise.all([
        prisma.project.count(),
        prisma.project.count({ where: { status: "IN_PROGRESS" } }),
        prisma.project.count({ where: { status: "PENDING" } }),
        prisma.project.count({ where: { status: "STUCK" } }),
        prisma.project.count({ where: { status: "COMPLETED" } }),
        prisma.task.count(),
        prisma.task.count({ where: { status: "COMPLETED" } }),
        prisma.task.count({ where: { status: "PENDING" } }),
        prisma.task.count({ where: { status: "STUCK" } }),
        prisma.event.count({ where: { status: "SCHEDULED", startDate: { gte: new Date() } } }),
        // Naive conflict count: events sharing the same time window
        prisma.event.count({
            where: {
                status: "SCHEDULED",
                participants: { some: { status: "PENDING" } },
            },
        }),
    ]);

    res.json({
        success: true,
        data: {
            projects: { total: totalProjects, active: activeProjects, pending: pendingProjects, stuck: stuckProjects, completed: completedProjects },
            tasks: { total: totalTasks, completed: completedTasks, pending: pendingTasks, stuck: stuckTasks },
            events: { upcoming: upcomingEvents, pendingInvites: conflictCount },
        },
    });
});

// ── GET /api/dashboard/my-todo ──
// Personal to-do: tasks and events assigned to the current user
dashboardRouter.get("/my-todo", async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { filter } = req.query as { filter?: "today" | "week" | "month" | "all" };
    const now = new Date();
    let endDate: Date | undefined;

    if (filter === "today") { endDate = new Date(now); endDate.setHours(23, 59, 59); }
    else if (filter === "week") { endDate = new Date(now); endDate.setDate(now.getDate() + 7); }
    else if (filter === "month") { endDate = new Date(now); endDate.setMonth(now.getMonth() + 1); }

    const dateFilter = endDate ? { gte: now, lte: endDate } : undefined;

    const [tasks, events] = await Promise.all([
        prisma.task.findMany({
            where: {
                creatorId: userId,
                status: { not: "COMPLETED" },
                ...(dateFilter && { endDate: dateFilter }),
            },
            include: { project: { select: { id: true, name: true } } },
            orderBy: { endDate: "asc" },
        }),
        prisma.event.findMany({
            where: {
                participants: { some: { userId, status: { not: "DECLINED" } } },
                startDate: dateFilter ?? { gte: now },
                status: { not: "CANCELLED" },
            },
            include: { project: { select: { id: true, name: true } } },
            orderBy: { startDate: "asc" },
        }),
    ]);

    res.json({ success: true, data: { tasks, events } });
});
