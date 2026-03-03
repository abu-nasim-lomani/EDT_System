"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../utils/prisma");
const auth_middleware_1 = require("../middlewares/auth.middleware");
exports.projectRouter = (0, express_1.Router)();
exports.projectRouter.use(auth_middleware_1.protectRoute);
const ProjectSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    description: zod_1.z.string().optional(),
    managerId: zod_1.z.string().uuid(),
    arrId: zod_1.z.string().uuid().optional(),
    startDate: zod_1.z.string().datetime({ offset: true }).optional(),
    endDate: zod_1.z.string().datetime({ offset: true }).optional(),
});
// ── GET /api/projects ──
// SM: all projects  |  PM/Employee: only their own
exports.projectRouter.get("/", async (req, res) => {
    const { role, userId } = req.user;
    const where = role === "SENIOR_MANAGEMENT"
        ? {}
        : { OR: [{ managerId: userId }, { employees: { some: { userId } } }] };
    const projects = await prisma_1.prisma.project.findMany({
        where,
        include: {
            manager: { select: { id: true, name: true, avatar: true } },
            arr: { select: { id: true, name: true, designation: true } },
            _count: { select: { tasks: true, events: true, employees: true } },
        },
        orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: projects });
});
// ── POST /api/projects ──  (SM only)
exports.projectRouter.post("/", (0, auth_middleware_1.requireRole)("SENIOR_MANAGEMENT", "PROJECT_MANAGER"), async (req, res) => {
    const parsed = ProjectSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ success: false, errors: parsed.error.flatten() });
        return;
    }
    const project = await prisma_1.prisma.project.create({
        data: parsed.data,
        include: { manager: { select: { id: true, name: true } } },
    });
    res.status(201).json({ success: true, data: project });
});
// ── GET /api/projects/:id ──
exports.projectRouter.get("/:id", async (req, res) => {
    const id = req.params.id;
    const project = await prisma_1.prisma.project.findUnique({
        where: { id },
        include: {
            manager: { select: { id: true, name: true, avatar: true } },
            arr: { select: { id: true, name: true, designation: true } },
            employees: { include: { user: { select: { id: true, name: true, avatar: true, role: true } } } },
            tasks: { include: { subTasks: true } },
            events: { orderBy: { startDate: "asc" } },
        },
    });
    if (!project) {
        res.status(404).json({ success: false, message: "Project not found" });
        return;
    }
    res.json({ success: true, data: project });
});
// ── PATCH /api/projects/:id ──
exports.projectRouter.patch("/:id", (0, auth_middleware_1.requireRole)("SENIOR_MANAGEMENT", "PROJECT_MANAGER"), async (req, res) => {
    const id = req.params.id;
    const body = req.body;
    const project = await prisma_1.prisma.project.update({
        where: { id },
        data: body,
    });
    res.json({ success: true, data: project });
});
// ── DELETE /api/projects/:id ──  (SM only)
exports.projectRouter.delete("/:id", (0, auth_middleware_1.requireRole)("SENIOR_MANAGEMENT"), async (req, res) => {
    const id = req.params.id;
    await prisma_1.prisma.project.delete({ where: { id } });
    res.json({ success: true, message: "Project deleted" });
});
//# sourceMappingURL=project.routes.js.map