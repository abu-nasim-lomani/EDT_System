import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../utils/jwt";

// Extend Express Request to carry user info
export interface AuthRequest extends Request {
    user?: JwtPayload;
}

// ── protectRoute ───────────────────────────────────────────────
// Validates the Bearer JWT from Authorization header.
export const protectRoute = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        res.status(401).json({ success: false, message: "Unauthorized – no token" });
        return;
    }
    try {
        const token = header.slice(7);
        req.user = verifyToken(token);
        next();
    } catch {
        res.status(401).json({ success: false, message: "Unauthorized – invalid token" });
    }
};

// ── requireRole ────────────────────────────────────────────────
// Usage: router.use(requireRole("SENIOR_MANAGEMENT"))
export const requireRole = (...roles: string[]) =>
    (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403).json({ success: false, message: "Forbidden – insufficient role" });
            return;
        }
        next();
    };
