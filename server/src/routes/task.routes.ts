import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { protectRoute, AuthRequest } from "../middlewares/auth.middleware";

export const taskRouter = Router();
taskRouter.use(protectRoute);

const TaskSchema = z.object({
    title: z.string().min(2),
    description: z.string().optional(),
    priority: z.enum(["CRITICAL", "HIGH", "MAJOR", "MINOR"]).default("MINOR"),
    status: z.enum(["PENDING", "IN_PROGRESS", "STUCK", "COMPLETED"]).default("PENDING"),
    progress: z.number().min(0).max(100).optional(),
    type: z.string().optional(),
    startDate: z.string().datetime({ offset: true }).optional().nullable(),
    endDate: z.string().datetime({ offset: true }).optional().nullable(),
    projectId: z.string().uuid(),
    parentTaskId: z.string().uuid().optional().nullable(),
    assigneeId: z.string().uuid().optional().nullable(),
    collaboratorIds: z.array(z.string().uuid()).optional(),
    fileUrl: z.string().optional(),
    fileName: z.string().optional(),
    decisionId: z.string().uuid().optional().nullable(), // Link task to a Decision
});

// Helper: recalculate parent task progress when a sub-task changes
async function recalcParentProgress(parentTaskId: string) {
    const subTasks = await prisma.task.findMany({ where: { parentTaskId } });
    if (subTasks.length === 0) return;
    const totalProgress = subTasks.reduce((sum, t) => sum + (t.progress || 0), 0);
    const progress = Math.round(totalProgress / subTasks.length);
    const status = progress === 100 ? "COMPLETED" : progress > 0 ? "IN_PROGRESS" : "PENDING";
    await prisma.task.update({ where: { id: parentTaskId }, data: { status, progress } });
}

// Helper: recalculate project overall progress
async function recalcProjectProgress(projectId: string) {
    const tasks = await prisma.task.findMany({ where: { projectId, parentTaskId: null } });
    if (tasks.length === 0) return;
    const totalProgress = tasks.reduce((sum, t) => sum + (t.progress || 0), 0);
    const progress = Math.round(totalProgress / tasks.length);
    const status = progress === 100 ? "COMPLETED" : progress > 0 ? "IN_PROGRESS" : "PENDING";
    await prisma.project.update({ where: { id: projectId }, data: { progress, status } });
}

// ── GET /api/tasks ──
taskRouter.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
    const projectId = req.query.projectId as string | undefined;
    const status = req.query.status as string | undefined;
    const tasks = await prisma.task.findMany({
        where: {
            ...(projectId && { projectId }),
            ...(status && { status: status as "PENDING" | "IN_PROGRESS" | "STUCK" | "COMPLETED" }),
        },
        include: {
            subTasks: true,
            creator: { select: { id: true, name: true, avatar: true } },
            assignee: { select: { id: true, name: true, avatar: true } },
            collaborators: { select: { id: true, name: true, avatar: true } },
            project: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: tasks });
});

taskRouter.get("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const task = await prisma.task.findUnique({
        where: { id },
        include: {
            subTasks: {
                orderBy: { createdAt: 'asc' },
                include: { assignee: { select: { id: true, name: true, avatar: true } } }
            },
            creator: { select: { id: true, name: true, avatar: true } },
            assignee: { select: { id: true, name: true, avatar: true } },
            collaborators: { select: { id: true, name: true, avatar: true } },
            project: { select: { id: true, name: true } },
            checklist: { orderBy: { createdAt: 'asc' } },
            activities: {
                include: { creator: { select: { id: true, name: true, avatar: true } } },
                orderBy: { createdAt: 'desc' }
            }
        },
    });

    if (!task) {
        res.status(404).json({ success: false, message: "Task not found" });
        return;
    }
    res.json({ success: true, data: task });
});

taskRouter.post("/", async (req: AuthRequest, res: Response): Promise<void> => {
    const parsed = TaskSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ success: false, errors: parsed.error.flatten() }); return; }

    const { collaboratorIds, decisionId, ...rest } = parsed.data;

    const task = await prisma.task.create({
        data: {
            ...rest,
            creatorId: req.user!.userId,
            ...(collaboratorIds && collaboratorIds.length > 0 ? {
                collaborators: { connect: collaboratorIds.map(id => ({ id })) }
            } : {})
        },
        include: {
            subTasks: true,
            creator: { select: { id: true, name: true } },
            assignee: { select: { id: true, name: true } },
            collaborators: { select: { id: true, name: true } }
        },
    });

    // If a decisionId was provided, link this new task to that Decision
    if (decisionId) {
        await prisma.decision.update({
            where: { id: decisionId },
            data: { taskId: task.id }
        });
    }

    res.status(201).json({ success: true, data: task });
});

taskRouter.patch("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
    const id = req.params.id as string;

    const UpdateTaskSchema = z.object({
        title: z.string().min(2).optional(),
        description: z.string().optional(),
        priority: z.enum(["CRITICAL", "HIGH", "MAJOR", "MINOR"]).optional(),
        status: z.enum(["PENDING", "IN_PROGRESS", "STUCK", "COMPLETED"]).optional(),
        progress: z.number().min(0).max(100).optional(),
        type: z.string().optional(),
        startDate: z.string().datetime({ offset: true }).optional().nullable(),
        endDate: z.string().datetime({ offset: true }).optional().nullable(),
        projectId: z.string().uuid().optional(),
        parentTaskId: z.string().uuid().optional().nullable(),
        assigneeId: z.string().uuid().optional().nullable(),
        collaboratorIds: z.array(z.string().uuid()).optional(),
        fileUrl: z.string().optional(),
        fileName: z.string().optional(),
    });
    const parsed = UpdateTaskSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ success: false, errors: parsed.error.flatten() }); return; }

    let { collaboratorIds, ...rest } = parsed.data;

    // Auto-transition to IN_PROGRESS if progress > 0 for a pending task
    const currentTask = await prisma.task.findUnique({ where: { id } });
    if (currentTask && currentTask.status === "PENDING" && rest.progress && rest.progress > 0) {
        rest.status = "IN_PROGRESS";
    }

    const task = await prisma.task.update({
        where: { id },
        data: {
            ...rest,
            ...(collaboratorIds ? {
                collaborators: { set: collaboratorIds.map(id => ({ id })) }
            } : {})
        },
    });

    // Cascade progress upward
    if (task.parentTaskId) await recalcParentProgress(task.parentTaskId);
    await recalcProjectProgress(task.projectId);

    res.json({ success: true, data: task });
});

// ── DELETE /api/tasks/:id ──
taskRouter.delete("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) { res.status(404).json({ success: false, message: "Task not found" }); return; }

    await prisma.task.delete({ where: { id } });

    if (task.parentTaskId) await recalcParentProgress(task.parentTaskId);
    await recalcProjectProgress(task.projectId);

    res.json({ success: true, message: "Task deleted" });
});

// ── POST /api/tasks/:id/checklist ──
taskRouter.post("/:id/checklist", async (req: AuthRequest, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const { title } = req.body;
    if (!title) { res.status(400).json({ success: false, message: "Title required" }); return; }
    const item = await prisma.checklistItem.create({
        data: { title, taskId: id }
    });
    res.json({ success: true, data: item });
});

// ── PATCH /api/tasks/checklist/:itemId ──
taskRouter.patch("/checklist/:itemId", async (req: AuthRequest, res: Response): Promise<void> => {
    const itemId = req.params.itemId as string;
    const { isDone } = req.body;
    const item = await prisma.checklistItem.update({
        where: { id: itemId },
        data: { isDone }
    });
    res.json({ success: true, data: item });
});

// ── POST /api/tasks/:id/activities ──
taskRouter.post("/:id/activities", async (req: AuthRequest, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const { content, type } = req.body;

    if (!content) {
        res.status(400).json({ success: false, message: "Content is required" });
        return;
    }

    const activity = await prisma.taskActivity.create({
        data: {
            content,
            type: type || "COMMENT",
            taskId: id,
            creatorId: ((req.user as unknown) as { userId: string }).userId
        },
        include: {
            creator: { select: { id: true, name: true, avatar: true } }
        }
    });

    res.json({ success: true, data: activity });
});
