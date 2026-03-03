import { Router, Response } from "express";
import { prisma } from "../utils/prisma";
import { protectRoute, requireRole, AuthRequest } from "../middlewares/auth.middleware";

export const usersRouter = Router();
usersRouter.use(protectRoute);

// ── GET /api/users ── list all users (SM only for full list)
usersRouter.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
    const { role } = req.user!;

    // SM sees all users; PM/Employee only see users in their own projects
    const users = role === "SENIOR_MANAGEMENT"
        ? await prisma.user.findMany({
            select: { id: true, name: true, email: true, role: true, designation: true },
            orderBy: { name: "asc" },
        })
        : await prisma.user.findMany({
            where: {
                OR: [
                    { managedProjects: { some: { employees: { some: { userId: req.user!.userId } } } } },
                    { id: req.user!.userId },
                ],
            },
            select: { id: true, name: true, email: true, role: true, designation: true },
            orderBy: { name: "asc" },
        });

    res.json({ success: true, data: users });
});

// ── GET /api/users/me ── current user profile
usersRouter.get("/me", async (req: AuthRequest, res: Response): Promise<void> => {
    const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { id: true, name: true, email: true, role: true, designation: true, avatar: true },
    });
    if (!user) { res.status(404).json({ success: false, message: "User not found" }); return; }
    res.json({ success: true, data: user });
});
