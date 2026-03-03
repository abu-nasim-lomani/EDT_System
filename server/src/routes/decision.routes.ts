import { Router, Response } from "express";
import { prisma } from "../utils/prisma";
import { protectRoute, AuthRequest } from "../middlewares/auth.middleware";

const router = Router();

// Get unlinked decisions
router.get("/unlinked", protectRoute, async (req: AuthRequest, res: Response) => {
    try {
        const decisions = await prisma.decision.findMany({
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
    } catch (error: any) {
        console.error("Fetch Unlinked Decisions Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
