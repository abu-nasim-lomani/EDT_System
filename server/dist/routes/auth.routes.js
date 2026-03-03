"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const zod_1 = require("zod");
const prisma_1 = require("../utils/prisma");
const jwt_1 = require("../utils/jwt");
const auth_middleware_1 = require("../middlewares/auth.middleware");
exports.authRouter = (0, express_1.Router)();
// ── Validation schemas ──
const LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
const RegisterSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    role: zod_1.z.enum(["SENIOR_MANAGEMENT", "PROJECT_MANAGER", "EMPLOYEE"]),
    designation: zod_1.z.string().optional(),
});
// ── POST /api/auth/register ──
exports.authRouter.post("/register", async (req, res) => {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ success: false, errors: parsed.error.flatten() });
        return;
    }
    const { name, email, password, role, designation } = parsed.data;
    const existing = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (existing) {
        res.status(409).json({ success: false, message: "Email already registered" });
        return;
    }
    const hashed = await bcrypt_1.default.hash(password, 10);
    const user = await prisma_1.prisma.user.create({
        data: { name, email, password: hashed, role, designation },
        select: { id: true, name: true, email: true, role: true, designation: true },
    });
    const token = (0, jwt_1.signToken)({ userId: user.id, role: user.role });
    res.status(201).json({ success: true, data: { user, token } });
});
// ── POST /api/auth/login ──
exports.authRouter.post("/login", async (req, res) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ success: false, errors: parsed.error.flatten() });
        return;
    }
    const { email, password } = parsed.data;
    const user = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (!user) {
        res.status(401).json({ success: false, message: "Invalid credentials" });
        return;
    }
    const valid = await bcrypt_1.default.compare(password, user.password);
    if (!valid) {
        res.status(401).json({ success: false, message: "Invalid credentials" });
        return;
    }
    const token = (0, jwt_1.signToken)({ userId: user.id, role: user.role });
    res.json({
        success: true,
        data: {
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role, designation: user.designation, avatar: user.avatar },
        },
    });
});
// ── GET /api/auth/me ──
exports.authRouter.get("/me", auth_middleware_1.protectRoute, async (req, res) => {
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
//# sourceMappingURL=auth.routes.js.map