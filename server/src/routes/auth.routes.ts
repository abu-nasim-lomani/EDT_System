import { Router, Response } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { signToken } from "../utils/jwt";
import { protectRoute, AuthRequest } from "../middlewares/auth.middleware";

export const authRouter = Router();

// ── Validation schemas ──
const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

const RegisterSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(["SENIOR_MANAGEMENT", "PROJECT_MANAGER", "EMPLOYEE"]),
    designation: z.string().optional(),
});

// ── POST /api/auth/register ──
authRouter.post("/register", async (req, res): Promise<void> => {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ success: false, errors: parsed.error.flatten() });
        return;
    }

    const { name, email, password, role, designation } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        res.status(409).json({ success: false, message: "Email already registered" });
        return;
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
        data: { name, email, password: hashed, role, designation },
        select: { id: true, name: true, email: true, role: true, designation: true },
    });

    const token = signToken({ userId: user.id, role: user.role });
    res.status(201).json({ success: true, data: { user, token } });
});

// ── POST /api/auth/login ──
authRouter.post("/login", async (req, res): Promise<void> => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ success: false, errors: parsed.error.flatten() });
        return;
    }

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        res.status(401).json({ success: false, message: "Invalid credentials" });
        return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
        res.status(401).json({ success: false, message: "Invalid credentials" });
        return;
    }

    const token = signToken({ userId: user.id, role: user.role });
    res.json({
        success: true,
        data: {
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role, designation: user.designation, avatar: user.avatar },
        },
    });
});

// ── GET /api/auth/me ──
authRouter.get("/me", protectRoute, async (req: AuthRequest, res: Response): Promise<void> => {
    const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { id: true, name: true, email: true, role: true, designation: true, avatar: true },
    });
    if (!user) { res.status(404).json({ success: false, message: "User not found" }); return; }
    res.json({ success: true, data: user });
});
