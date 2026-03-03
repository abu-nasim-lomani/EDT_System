"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../utils/prisma");
const auth_middleware_1 = require("../middlewares/auth.middleware");
exports.usersRouter = (0, express_1.Router)();
exports.usersRouter.use(auth_middleware_1.protectRoute);
// ── GET /api/users ── list all users (SM only for full list)
exports.usersRouter.get("/", async (req, res) => {
    const { role } = req.user;
    // SM sees all users; PM/Employee only see users in their own projects
    const users = role === "SENIOR_MANAGEMENT"
        ? await prisma_1.prisma.user.findMany({
            select: { id: true, name: true, email: true, role: true, designation: true },
            orderBy: { name: "asc" },
        })
        : await prisma_1.prisma.user.findMany({
            where: {
                OR: [
                    { managedProjects: { some: { employees: { some: { userId: req.user.userId } } } } },
                    { id: req.user.userId },
                ],
            },
            select: { id: true, name: true, email: true, role: true, designation: true },
            orderBy: { name: "asc" },
        });
    res.json({ success: true, data: users });
});
// ── GET /api/users/me ── current user profile
exports.usersRouter.get("/me", async (req, res) => {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { id: true, name: true, email: true, role: true, designation: true, avatar: true },
    });
    if (!user) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
    }
    res.json({ success: true, data: user });
});
//# sourceMappingURL=users.routes.js.map