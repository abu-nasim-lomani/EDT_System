import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { protectRoute, requireRole, AuthRequest } from "../middlewares/auth.middleware";

export const projectRouter = Router();
projectRouter.use(protectRoute);

const ProjectSchema = z.object({
    name: z.string().min(2),
    description: z.string().optional(),
    managerId: z.string().uuid(),
    arrId: z.string().uuid().optional(),
    startDate: z.string().datetime({ offset: true }).optional(),
    endDate: z.string().datetime({ offset: true }).optional(),
});

// ── GET /api/projects ──
// SM: all projects  |  PM/Employee: only their own
projectRouter.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
    const { role, userId } = req.user!;

    const where = role === "SENIOR_MANAGEMENT"
        ? {}
        : { OR: [{ managerId: userId }, { employees: { some: { userId } } }] };

    const projects = await prisma.project.findMany({
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
projectRouter.post("/", requireRole("SENIOR_MANAGEMENT", "PROJECT_MANAGER"), async (req: AuthRequest, res: Response): Promise<void> => {
    const parsed = ProjectSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ success: false, errors: parsed.error.flatten() }); return; }

    const project = await prisma.project.create({
        data: parsed.data,
        include: { manager: { select: { id: true, name: true } } },
    });
    res.status(201).json({ success: true, data: project });
});

// ── GET /api/projects/:id ──
projectRouter.get("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const project = await prisma.project.findUnique({
        where: { id },
        include: {
            manager: { select: { id: true, name: true, avatar: true } },
            arr: { select: { id: true, name: true, designation: true } },
            employees: { include: { user: { select: { id: true, name: true, avatar: true, role: true } } } },
            tasks: { include: { subTasks: true } },
            events: { orderBy: { startDate: "asc" } },
        },
    });
    if (!project) { res.status(404).json({ success: false, message: "Project not found" }); return; }
    res.json({ success: true, data: project });
});

// ── PATCH /api/projects/:id ──
projectRouter.patch("/:id", requireRole("SENIOR_MANAGEMENT", "PROJECT_MANAGER"), async (req: AuthRequest, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const body = req.body as {
        name?: string;
        description?: string;
        status?: "PENDING" | "IN_PROGRESS" | "STUCK" | "COMPLETED";
        arrId?: string;
    };
    const project = await prisma.project.update({
        where: { id },
        data: body,
    });
    res.json({ success: true, data: project });
});

// ── DELETE /api/projects/:id ──  (SM only)
projectRouter.delete("/:id", requireRole("SENIOR_MANAGEMENT"), async (req: AuthRequest, res: Response): Promise<void> => {
    const id = req.params.id as string;
    await prisma.project.delete({ where: { id } });
    res.json({ success: true, message: "Project deleted" });
});
