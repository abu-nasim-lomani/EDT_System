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

// ── GET /api/dashboard/reports ──
// SM-level full analytics report
dashboardRouter.get("/reports", requireRole("SENIOR_MANAGEMENT"), async (req: AuthRequest, res: Response): Promise<void> => {
    const { period } = req.query as { period?: "7d" | "30d" | "90d" | "all" };
    const now = new Date();
    let startDate: Date | undefined;

    if (period && period !== "all") {
        startDate = new Date(now);
        if (period === "7d") startDate.setDate(now.getDate() - 7);
        else if (period === "30d") startDate.setDate(now.getDate() - 30);
        else if (period === "90d") startDate.setDate(now.getDate() - 90);
    }

    const dateFilter = startDate ? { gte: startDate } : undefined;

    // 1. PROJECT STATUS (Donut Chart)
    const projectGroupBy = await prisma.project.groupBy({
        by: ["status"],
        _count: { id: true }
    });

    const PROJECT_STATUS = [
        { label: "In Progress", status: "IN_PROGRESS", color: "#6366f1", value: 0 },
        { label: "Completed", status: "COMPLETED", color: "#22c55e", value: 0 },
        { label: "Pending", status: "PENDING", color: "#64748b", value: 0 },
        { label: "Stuck", status: "STUCK", color: "#ef4444", value: 0 },
    ];
    let totalProjects = 0;
    projectGroupBy.forEach(g => {
        totalProjects += g._count.id;
        const s = PROJECT_STATUS.find(ps => ps.status === g.status);
        if (s) s.value = g._count.id;
    });
    const projectStatusData = PROJECT_STATUS.map(s => ({
        ...s,
        pct: totalProjects > 0 ? Math.round((s.value / totalProjects) * 100) : 0
    }));

    // 2. TASK TREND (Bar Chart) - Last 7 days regardless of period filter for the chart specifically, 
    // or we can bucket based on period. Let's do daily buckets for the selected period up to 30 days.
    // For simplicity, we'll pull all tasks in the date range and bucket them in JS.
    const tasks = await prisma.task.findMany({
        where: dateFilter ? { createdAt: dateFilter } : undefined,
        select: { createdAt: true, status: true, endDate: true }
    });

    const days = period === "7d" ? 7 : (period === "30d" ? 30 : 7); // Default to 7 bars if all/90d to avoid crowding
    const TASK_TREND = Array.from({ length: days }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        d.setHours(0, 0, 0, 0);
        return {
            date: d,
            label: d.toLocaleDateString('en-US', { weekday: 'short' }),
            total: 0,
            done: 0
        };
    });

    tasks.forEach(t => {
        const tDate = new Date(t.createdAt);
        tDate.setHours(0, 0, 0, 0);
        const bucket = TASK_TREND.find(b => b.date.getTime() === tDate.getTime());
        if (bucket) {
            bucket.total++;
            if (t.status === "COMPLETED") bucket.done++;
        }
    });

    // 3. EVENT TYPES Breakdown
    const eventsByType = await prisma.event.findMany({
        where: dateFilter ? { startDate: dateFilter } : undefined,
        select: { id: true, type: true }
    });

    const typeCounts: Record<string, number> = {};
    eventsByType.forEach(e => {
        typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
    });

    const EventTypeMap: Record<string, { label: string, color: string }> = {
        "MEETING": { label: "Meetings", color: "#3b82f6" },
        "WORKSHOP": { label: "Workshops", color: "#8b5cf6" },
        "SEMINAR": { label: "Seminars", color: "#f59e0b" },
        "TRAINING": { label: "Trainings", color: "#22c55e" },
    };

    const EVENT_TYPES = Object.keys(typeCounts).map(type => ({
        label: EventTypeMap[type]?.label || type,
        color: EventTypeMap[type]?.color || "#94a3b8",
        count: typeCounts[type]
    })).sort((a, b) => b.count - a.count);

    // 4. TEAM PERFORMANCE
    // Get all users and their tasks
    const usersWithTasks = await prisma.user.findMany({
        where: { role: { in: ["PROJECT_MANAGER", "EMPLOYEE"] } },
        select: {
            id: true, name: true,
            assignedTasks: {
                where: dateFilter ? { createdAt: dateFilter } : undefined,
                select: { id: true, status: true }
            }
        }
    });

    const TEAM_PERF = usersWithTasks.map(u => {
        const total = u.assignedTasks.length;
        const done = u.assignedTasks.filter(t => t.status === "COMPLETED").length;
        const completion = total > 0 ? Math.round((done / total) * 100) : 0;

        // Generate a random-ish color based on ID length or just cycle
        const colors = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
        const color = colors[u.name.length % colors.length];

        return {
            name: u.name,
            initials: u.name.substring(0, 2).toUpperCase(),
            tasks: total,
            completion,
            color
        };
    }).filter(t => t.tasks > 0).sort((a, b) => b.completion - a.completion).slice(0, 5); // top 5

    // 5. KPIs
    const totalEvents = EVENT_TYPES.reduce((s, e) => s + e.count, 0);
    const totalTasksInRange = tasks.length;
    const completedTasksInRange = tasks.filter(t => t.status === "COMPLETED").length;
    const completionRate = totalTasksInRange > 0 ? Math.round((completedTasksInRange / totalTasksInRange) * 100) : 0;
    const activeProjects = PROJECT_STATUS.find(p => p.status === "IN_PROGRESS")?.value || 0;

    const conflictCount = await prisma.event.count({
        where: {
            startDate: dateFilter,
            status: "SCHEDULED",
            participants: { some: { status: "PENDING" } } // naive conflict logic for now
        }
    });

    const conflictRate = totalEvents > 0 ? Math.round((conflictCount / totalEvents) * 100) : 0;

    res.json({
        success: true,
        data: {
            kpis: {
                completionRate,
                completedTasks: completedTasksInRange,
                totalTasks: totalTasksInRange,
                activeProjects,
                totalEvents,
                conflictRate,
                conflictCount
            },
            projectStatus: projectStatusData,
            taskTrend: TASK_TREND,
            eventTypes: EVENT_TYPES,
            teamPerformance: TEAM_PERF
        }
    });
});

// ── GET /api/dashboard/executive ──
// SM-level detailed dashboard data
dashboardRouter.get("/executive", requireRole("SENIOR_MANAGEMENT"), async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(startOfToday);
        endOfToday.setDate(endOfToday.getDate() + 1);

        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 7);

        const [
            allProjects,
            allTasks,
            allEvents,
            recentDecisions
        ] = await Promise.all([
            prisma.project.findMany({
                include: {
                    manager: { select: { name: true } },
                    arr: { select: { name: true } },
                    tasks: {
                        select: {
                            id: true,
                            endDate: true,
                            status: true,
                        }
                    },
                    events: {
                        where: { startDate: { gte: now } },
                        select: { id: true }
                    }
                }
            }),
            prisma.task.findMany({
                include: { project: { select: { name: true } } }
            }),
            prisma.event.findMany({
                where: { status: "SCHEDULED" },
                include: { participants: true }
            }),
            prisma.decision.findMany({
                take: 8,
                orderBy: { createdAt: "desc" },
                include: {
                    event: { select: { id: true, title: true, project: { select: { id: true, name: true } } } },
                    task: {
                        select: {
                            id: true,
                            title: true,
                            status: true,
                            progress: true,
                            assignee: { select: { name: true, avatar: true } }
                        }
                    }
                }
            })
        ]);

        // A. Executive KPI Summary
        const kpis = {
            totalProjects: allProjects.length,
            runningProjects: allProjects.filter(p => p.status === "IN_PROGRESS").length,
            stuckProjects: allProjects.filter(p => p.status === "STUCK").length,
            pendingProjects: allProjects.filter(p => p.status === "PENDING").length,
            completedProjects: allProjects.filter(p => p.status === "COMPLETED").length,
            totalActiveTasks: allTasks.filter(t => t.status !== "COMPLETED").length,
            overdueTasks: allTasks.filter(t => t.endDate && t.endDate < now && t.status !== "COMPLETED").length,
            approvalPendingEvents: allEvents.filter(e => e.participants.some(p => p.status === "PENDING")).length,
            completedTasks: allTasks.filter(t => t.status === "COMPLETED").length,
            totalEvents: allEvents.length,
            upcomingEvents: allEvents.filter(e => e.startDate >= startOfToday).length
        };

        // B. Project Health Overview
        const projectHealth = allProjects.map(p => {
            const overdueTasksCount = p.tasks.filter(t => t.endDate && t.endDate < now && t.status !== "COMPLETED").length;
            const isDelayed = overdueTasksCount > 0 || p.status === "STUCK";
            return {
                id: p.id,
                name: p.name,
                arr: p.arr?.name || "Unassigned",
                pm: p.manager.name,
                progress: p.progress,
                status: p.status,
                overdueTasksCount,
                upcomingEventsCount: p.events.length,
                isDelayed
            };
        });

        // C. Stuck / Risk Alert Panel
        const limit3Days = new Date(now);
        limit3Days.setDate(limit3Days.getDate() - 3);
        const overdueTasksRisk = allTasks.filter(t => t.endDate && t.endDate < limit3Days && t.status !== "COMPLETED");

        const limit7Days = new Date(now);
        limit7Days.setDate(limit7Days.getDate() - 7);
        const idleProjectsRisk = allProjects.filter(p => p.updatedAt < limit7Days && p.status !== "COMPLETED");

        const conflicts = allEvents.filter(e => e.participants.some(p => p.status === "PENDING"));

        const risks = {
            overdueTasks: overdueTasksRisk.map(t => ({ id: t.id, title: t.title, project: t.project?.name })),
            idleProjects: idleProjectsRisk.map(p => ({ id: p.id, name: p.name, daysIdle: Math.floor((now.getTime() - p.updatedAt.getTime()) / (1000 * 3600 * 24)) })),
            conflictEvents: conflicts.map(e => ({ id: e.id, title: e.title }))
        };

        // D. Today / This Week Overview
        const schedule = {
            today: {
                tasks: allTasks.filter(t => t.endDate && t.endDate >= startOfToday && t.endDate < endOfToday),
                events: allEvents.filter(e => e.startDate >= startOfToday && e.startDate < endOfToday)
            },
            week: {
                tasks: allTasks.filter(t => t.endDate && t.endDate >= startOfToday && t.endDate < endOfWeek),
                events: allEvents.filter(e => e.startDate >= startOfToday && e.startDate < endOfWeek)
            }
        };

        // E. Conflict Calendar Widget
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const calendarEvents = allEvents.filter(e => e.startDate >= startOfMonth && e.startDate <= endOfMonth).map(e => ({
            id: e.id,
            title: e.title,
            startDate: e.startDate,
            endDate: e.endDate,
            hasConflict: e.participants.some(p => p.status === "PENDING")
        }));

        // F. Decision Traceability
        const decisions = recentDecisions.map(d => ({
            id: d.id,
            summary: d.summary,
            eventId: d.event?.id || null,
            eventName: d.event?.title || "Unknown Event",
            projectId: d.event?.project?.id || null,
            projectName: d.event?.project?.name || null,
            convertedToTask: !!d.taskId,
            taskId: d.task?.id || null,
            taskTitle: d.task?.title || null,
            taskStatus: d.task?.status || null,
            taskProgress: d.task?.progress ?? null,
            assigneeName: d.task?.assignee?.name || null,
            assigneeAvatar: d.task?.assignee?.avatar || null,
            createdAt: d.createdAt,
        }));

        // G. Project Completion Trend
        const trend = Array.from({ length: 6 }).map((_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
            return {
                month: d.toLocaleString('default', { month: 'short' }),
                completed: allProjects.filter(p => p.status === "COMPLETED" && (p.endDate ? p.endDate.getMonth() === d.getMonth() : false)).length
            };
        });

        res.json({
            success: true,
            data: { kpis, projectHealth, risks, schedule, calendarEvents, decisions, trend }
        });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message || "Failed to fetch executive dashboard", stack: error.stack });
    }
});

// ── GET /api/dashboard/pm ──
// PM-level operational dashboard
dashboardRouter.get("/pm", async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { filter = "week" } = req.query as { filter?: "today" | "week" | "overdue" | "critical" };
    const now = new Date();

    try {
        // ── 1. My Projects (where I'm the manager) ──
        const myProjects = await prisma.project.findMany({
            where: { managerId: userId },
            include: {
                tasks: {
                    select: { id: true, status: true, endDate: true, progress: true, parentTaskId: true },
                },
            },
            orderBy: { updatedAt: "desc" },
        });

        const myProjectsData = myProjects.map(p => {
            const rootTasks = p.tasks.filter(t => !t.parentTaskId);
            const overdueTasks = rootTasks.filter(t => t.endDate && t.endDate < now && t.status !== "COMPLETED").length;
            return {
                id: p.id,
                name: p.name,
                status: p.status,
                progress: p.progress ?? 0,
                endDate: p.endDate,
                overdueTasks,
                totalTasks: rootTasks.length,
            };
        });

        // ── 2. My Tasks (assigned to me or created by me) ──
        let taskWhere: Record<string, unknown> = {
            OR: [{ assigneeId: userId }, { creatorId: userId }],
            status: { not: "COMPLETED" },
        };

        if (filter === "today") {
            const end = new Date(now); end.setHours(23, 59, 59, 999);
            taskWhere = { ...taskWhere, endDate: { gte: now, lte: end } };
        } else if (filter === "week") {
            const end = new Date(now); end.setDate(now.getDate() + 7);
            taskWhere = { ...taskWhere, endDate: { gte: now, lte: end } };
        } else if (filter === "overdue") {
            taskWhere = {
                OR: [{ assigneeId: userId }, { creatorId: userId }],
                status: { not: "COMPLETED" },
                endDate: { lt: now },
            };
        } else if (filter === "critical") {
            taskWhere = { ...taskWhere, priority: "CRITICAL" };
        }

        const myTasks = await prisma.task.findMany({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            where: taskWhere as any,
            include: {
                project: { select: { id: true, name: true } },
                subTasks: { select: { id: true, status: true, progress: true } },
                assignee: { select: { id: true, name: true, avatar: true } },
            },
            orderBy: [{ priority: "asc" }, { endDate: "asc" }],
            take: 30,
        });

        const myTasksData = myTasks.map(t => {
            const subTotal = t.subTasks.length;
            const subDone = t.subTasks.filter(s => s.status === "COMPLETED").length;
            const subtaskPct = subTotal > 0 ? Math.round((subDone / subTotal) * 100) : null;
            return {
                id: t.id,
                title: t.title,
                priority: t.priority,
                status: t.status,
                progress: t.progress ?? 0,
                endDate: t.endDate,
                project: t.project,
                assignee: t.assignee,
                subtaskCount: subTotal,
                subtaskDone: subDone,
                subtaskPct,
                isOverdue: !!(t.endDate && t.endDate < now),
            };
        });

        // ── 3. My Events ──
        const myEvents = await prisma.event.findMany({
            where: {
                OR: [
                    { creatorId: userId },
                    { participants: { some: { userId } } },
                ],
                status: { not: "CANCELLED" },
            },
            include: {
                participants: { where: { userId }, select: { status: true, declineReason: true } },
                project: { select: { id: true, name: true } },
            },
            orderBy: { startDate: "asc" },
        });

        const upcoming = myEvents.filter(e => e.startDate >= now && e.participants[0]?.status !== "DECLINED");
        const pendingApproval = myEvents.filter(e => e.participants[0]?.status === "PENDING");
        const declined = myEvents.filter(e => e.participants[0]?.status === "DECLINED");

        const mapEvent = (e: typeof myEvents[0]) => ({
            id: e.id,
            title: e.title,
            type: e.type,
            startDate: e.startDate,
            endDate: e.endDate,
            project: e.project,
            myStatus: e.participants[0]?.status ?? "ACCEPTED",
            declineReason: e.participants[0]?.declineReason ?? null,
        });

        // ── 4. KPIs ──
        const allMyTasks = await prisma.task.findMany({
            where: { OR: [{ assigneeId: userId }, { creatorId: userId }] },
            select: { id: true, status: true, endDate: true },
        });
        const pendingCount = allMyTasks.filter(t => t.status !== "COMPLETED").length;
        const overdueCount = allMyTasks.filter(t => t.endDate && t.endDate < now && t.status !== "COMPLETED").length;
        const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
        const todayEvents = myEvents.filter(e => e.startDate >= now && e.startDate <= todayEnd).length;

        res.json({
            success: true,
            data: {
                kpis: {
                    myProjects: myProjects.length,
                    pendingTasks: pendingCount,
                    overdueTasks: overdueCount,
                    todayEvents,
                },
                myProjects: myProjectsData,
                myTasks: myTasksData,
                myEvents: {
                    upcoming: upcoming.map(mapEvent),
                    pendingApproval: pendingApproval.map(mapEvent),
                    declined: declined.map(mapEvent),
                },
            },
        });
    } catch (err: any) {
        console.error("[PM DASH]", err);
        res.status(500).json({ success: false, message: err.message });
    }
});
