"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../utils/prisma");
const auth_middleware_1 = require("../middlewares/auth.middleware");
exports.taskRouter = (0, express_1.Router)();
exports.taskRouter.use(auth_middleware_1.protectRoute);
const TaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(2),
    description: zod_1.z.string().optional(),
    priority: zod_1.z.enum(["CRITICAL", "HIGH", "MAJOR", "MINOR"]).default("MINOR"),
    status: zod_1.z.enum(["PENDING", "IN_PROGRESS", "STUCK", "COMPLETED"]).default("PENDING"),
    progress: zod_1.z.number().min(0).max(100).optional(),
    type: zod_1.z.string().optional(),
    startDate: zod_1.z.string().datetime({ offset: true }).optional().nullable(),
    endDate: zod_1.z.string().datetime({ offset: true }).optional().nullable(),
    projectId: zod_1.z.string().uuid(),
    parentTaskId: zod_1.z.string().uuid().optional().nullable(),
    assigneeId: zod_1.z.string().uuid().optional().nullable(),
    collaboratorIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    fileUrl: zod_1.z.string().optional(),
    fileName: zod_1.z.string().optional(),
    decisionId: zod_1.z.string().uuid().optional().nullable(), // Link task to a Decision
});
// Helper: recalculate parent task progress when a sub-task changes
async function recalcParentProgress(parentTaskId) {
    const subTasks = await prisma_1.prisma.task.findMany({ where: { parentTaskId } });
    if (subTasks.length === 0)
        return;
    const totalProgress = subTasks.reduce((sum, t) => sum + (t.progress || 0), 0);
    const progress = Math.round(totalProgress / subTasks.length);
    const status = progress === 100 ? "COMPLETED" : progress > 0 ? "IN_PROGRESS" : "PENDING";
    await prisma_1.prisma.task.update({ where: { id: parentTaskId }, data: { status, progress } });
}
// Helper: recalculate project overall progress
async function recalcProjectProgress(projectId) {
    const tasks = await prisma_1.prisma.task.findMany({ where: { projectId, parentTaskId: null } });
    if (tasks.length === 0)
        return;
    const totalProgress = tasks.reduce((sum, t) => sum + (t.progress || 0), 0);
    const progress = Math.round(totalProgress / tasks.length);
    const status = progress === 100 ? "COMPLETED" : progress > 0 ? "IN_PROGRESS" : "PENDING";
    await prisma_1.prisma.project.update({ where: { id: projectId }, data: { progress, status } });
}
// ── GET /api/tasks ──
exports.taskRouter.get("/", async (req, res) => {
    const projectId = req.query.projectId;
    const status = req.query.status;
    const tasks = await prisma_1.prisma.task.findMany({
        where: {
            ...(projectId && { projectId }),
            ...(status && { status: status }),
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
exports.taskRouter.get("/:id", async (req, res) => {
    const id = req.params.id;
    const task = await prisma_1.prisma.task.findUnique({
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
exports.taskRouter.post("/", async (req, res) => {
    const parsed = TaskSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ success: false, errors: parsed.error.flatten() });
        return;
    }
    const { collaboratorIds, decisionId, ...rest } = parsed.data;
    const task = await prisma_1.prisma.task.create({
        data: {
            ...rest,
            creatorId: req.user.userId,
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
        await prisma_1.prisma.decision.update({
            where: { id: decisionId },
            data: { taskId: task.id }
        });
    }
    res.status(201).json({ success: true, data: task });
});
exports.taskRouter.patch("/:id", async (req, res) => {
    const id = req.params.id;
    const UpdateTaskSchema = zod_1.z.object({
        title: zod_1.z.string().min(2).optional(),
        description: zod_1.z.string().optional(),
        priority: zod_1.z.enum(["CRITICAL", "HIGH", "MAJOR", "MINOR"]).optional(),
        status: zod_1.z.enum(["PENDING", "IN_PROGRESS", "STUCK", "COMPLETED"]).optional(),
        progress: zod_1.z.number().min(0).max(100).optional(),
        type: zod_1.z.string().optional(),
        startDate: zod_1.z.string().datetime({ offset: true }).optional().nullable(),
        endDate: zod_1.z.string().datetime({ offset: true }).optional().nullable(),
        projectId: zod_1.z.string().uuid().optional(),
        parentTaskId: zod_1.z.string().uuid().optional().nullable(),
        assigneeId: zod_1.z.string().uuid().optional().nullable(),
        collaboratorIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
        fileUrl: zod_1.z.string().optional(),
        fileName: zod_1.z.string().optional(),
    });
    const parsed = UpdateTaskSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ success: false, errors: parsed.error.flatten() });
        return;
    }
    let { collaboratorIds, ...rest } = parsed.data;
    // Auto-transition to IN_PROGRESS if progress > 0 for a pending task
    const currentTask = await prisma_1.prisma.task.findUnique({ where: { id } });
    if (currentTask && currentTask.status === "PENDING" && rest.progress && rest.progress > 0) {
        rest.status = "IN_PROGRESS";
    }
    const task = await prisma_1.prisma.task.update({
        where: { id },
        data: {
            ...rest,
            ...(collaboratorIds ? {
                collaborators: { set: collaboratorIds.map(id => ({ id })) }
            } : {})
        },
    });
    // Cascade progress upward
    if (task.parentTaskId)
        await recalcParentProgress(task.parentTaskId);
    await recalcProjectProgress(task.projectId);
    res.json({ success: true, data: task });
});
// ── DELETE /api/tasks/:id ──
exports.taskRouter.delete("/:id", async (req, res) => {
    const id = req.params.id;
    const task = await prisma_1.prisma.task.findUnique({ where: { id } });
    if (!task) {
        res.status(404).json({ success: false, message: "Task not found" });
        return;
    }
    await prisma_1.prisma.task.delete({ where: { id } });
    if (task.parentTaskId)
        await recalcParentProgress(task.parentTaskId);
    await recalcProjectProgress(task.projectId);
    res.json({ success: true, message: "Task deleted" });
});
// ── POST /api/tasks/:id/checklist ──
exports.taskRouter.post("/:id/checklist", async (req, res) => {
    const id = req.params.id;
    const { title } = req.body;
    if (!title) {
        res.status(400).json({ success: false, message: "Title required" });
        return;
    }
    const item = await prisma_1.prisma.checklistItem.create({
        data: { title, taskId: id }
    });
    res.json({ success: true, data: item });
});
// ── PATCH /api/tasks/checklist/:itemId ──
exports.taskRouter.patch("/checklist/:itemId", async (req, res) => {
    const itemId = req.params.itemId;
    const { isDone } = req.body;
    const item = await prisma_1.prisma.checklistItem.update({
        where: { id: itemId },
        data: { isDone }
    });
    res.json({ success: true, data: item });
});
// ── POST /api/tasks/:id/activities ──
exports.taskRouter.post("/:id/activities", async (req, res) => {
    const id = req.params.id;
    const { content, type } = req.body;
    if (!content) {
        res.status(400).json({ success: false, message: "Content is required" });
        return;
    }
    const activity = await prisma_1.prisma.taskActivity.create({
        data: {
            content,
            type: type || "COMMENT",
            taskId: id,
            creatorId: req.user.userId
        },
        include: {
            creator: { select: { id: true, name: true, avatar: true } }
        }
    });
    res.json({ success: true, data: activity });
});
//# sourceMappingURL=task.routes.js.map