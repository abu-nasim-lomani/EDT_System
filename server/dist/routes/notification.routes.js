"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../utils/prisma");
const auth_middleware_1 = require("../middlewares/auth.middleware");
exports.notificationRouter = (0, express_1.Router)();
exports.notificationRouter.use(auth_middleware_1.protectRoute);
// ── GET /api/notifications ────────────────────────────────────────────────────
exports.notificationRouter.get("/", async (req, res) => {
    const userId = req.user.userId;
    const notifications = await prisma_1.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 30,
    });
    const unreadCount = await prisma_1.prisma.notification.count({ where: { userId, isRead: false } });
    res.json({ success: true, data: notifications, unreadCount });
});
// ── GET /api/notifications/messages ─── Message-only notifications ────────────
exports.notificationRouter.get("/messages", async (req, res) => {
    const userId = req.user.userId;
    const notifications = await prisma_1.prisma.notification.findMany({
        where: { userId, type: "NEW_MESSAGE" },
        orderBy: { createdAt: "desc" },
        take: 20,
    });
    const unreadCount = await prisma_1.prisma.notification.count({
        where: { userId, type: "NEW_MESSAGE", isRead: false },
    });
    res.json({ success: true, data: notifications, unreadCount });
});
// ── PATCH /api/notifications/:id/read ────────────────────────────────────────// Mark single as read
exports.notificationRouter.patch("/:id/read", async (req, res) => {
    const id = req.params.id;
    const userId = req.user.userId;
    await prisma_1.prisma.notification.updateMany({
        where: { id, userId },
        data: { isRead: true },
    });
    res.json({ success: true });
});
// ── PATCH /api/notifications/read-all ────────────────────────────────────────
exports.notificationRouter.patch("/read-all", async (req, res) => {
    const userId = req.user.userId;
    await prisma_1.prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
    });
    res.json({ success: true });
});
//# sourceMappingURL=notification.routes.js.map