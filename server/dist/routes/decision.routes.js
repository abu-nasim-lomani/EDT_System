"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../utils/prisma");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Get unlinked decisions
router.get("/unlinked", auth_middleware_1.protectRoute, async (req, res) => {
    try {
        const decisions = await prisma_1.prisma.decision.findMany({
            where: {
                taskId: null
            },
            include: {
                event: {
                    select: {
                        title: true,
                        id: true
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        });
        res.json({ success: true, data: decisions });
    }
    catch (error) {
        console.error("Fetch Unlinked Decisions Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=decision.routes.js.map