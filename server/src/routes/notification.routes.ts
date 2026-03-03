import { Router, Response } from "express";
import { prisma } from "../utils/prisma";
import { protectRoute, AuthRequest } from "../middlewares/auth.middleware";

export const notificationRouter = Router();
notificationRouter.use(protectRoute);

// ── GET /api/notifications ────────────────────────────────────────────────────
notificationRouter.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 30,
    });
    const unreadCount = await prisma.notification.count({ where: { userId, isRead: false } });
    res.json({ success: true, data: notifications, unreadCount });
});

// ── PATCH /api/notifications/:id/read ────────────────────────────────────────
notificationRouter.patch("/:id/read", async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.user!.userId;
    await prisma.notification.updateMany({
        where: { id, userId },
        data: { isRead: true },
    });
    res.json({ success: true });
});

// ── PATCH /api/notifications/read-all ────────────────────────────────────────
notificationRouter.patch("/read-all", async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
    });
    res.json({ success: true });
});
