"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.protectRoute = void 0;
const jwt_1 = require("../utils/jwt");
// ── protectRoute ───────────────────────────────────────────────
// Validates the Bearer JWT from Authorization header.
const protectRoute = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        res.status(401).json({ success: false, message: "Unauthorized – no token" });
        return;
    }
    try {
        const token = header.slice(7);
        req.user = (0, jwt_1.verifyToken)(token);
        next();
    }
    catch {
        res.status(401).json({ success: false, message: "Unauthorized – invalid token" });
    }
};
exports.protectRoute = protectRoute;
// ── requireRole ────────────────────────────────────────────────
// Usage: router.use(requireRole("SENIOR_MANAGEMENT"))
const requireRole = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        res.status(403).json({ success: false, message: "Forbidden – insufficient role" });
        return;
    }
    next();
};
exports.requireRole = requireRole;
//# sourceMappingURL=auth.middleware.js.map