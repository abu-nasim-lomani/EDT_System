"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../utils/prisma");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const openai_1 = __importDefault(require("openai"));
exports.aiRouter = (0, express_1.Router)();
exports.aiRouter.use(auth_middleware_1.protectRoute);
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
const ChatSchema = zod_1.z.object({
    message: zod_1.z.string().min(1),
});
// ── POST /api/ai/chat ──
// Queries the database based on the user's role and sends it to OpenAI to answer the user's message.
exports.aiRouter.post("/chat", async (req, res) => {
    try {
        const parsed = ChatSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, errors: parsed.error.flatten() });
            return;
        }
        const { message } = parsed.data;
        const userId = req.user.userId;
        const userRole = req.user.role;
        if (userRole !== "SENIOR_MANAGEMENT" && userRole !== "PROJECT_MANAGER") {
            res.status(403).json({ success: false, message: "Unauthorized access to AI Chatbot." });
            return;
        }
        let contextData = {};
        if (userRole === "SENIOR_MANAGEMENT") {
            // Fetch system-wide summary for Senior Management
            const activeProjects = await prisma_1.prisma.project.findMany({
                where: { status: { not: "COMPLETED" } },
                select: { id: true, name: true, status: true, progress: true, endDate: true },
            });
            const upcomingEvents = await prisma_1.prisma.event.findMany({
                where: { startDate: { gte: new Date() } },
                take: 10,
                select: { id: true, title: true, startDate: true, type: true },
            });
            const pendingTasks = await prisma_1.prisma.task.count({ where: { status: { not: "COMPLETED" } } });
            contextData = {
                role: "Senior Management",
                activeProjectsCount: activeProjects.length,
                pendingTasksCount: pendingTasks,
                activeProjects,
                upcomingEvents,
            };
        }
        else if (userRole === "PROJECT_MANAGER") {
            // Fetch user-specific context for Project Manager
            const myProjects = await prisma_1.prisma.project.findMany({
                where: { managerId: userId },
                select: { id: true, name: true, status: true, progress: true, endDate: true },
            });
            const myAssignedTasks = await prisma_1.prisma.task.findMany({
                where: { assigneeId: userId, status: { not: "COMPLETED" } },
                select: { id: true, title: true, status: true, endDate: true, priority: true, project: { select: { name: true } } },
            });
            const myUpcomingEvents = await prisma_1.prisma.event.findMany({
                where: {
                    startDate: { gte: new Date() },
                    participants: { some: { userId: userId, status: "ACCEPTED" } },
                },
                take: 10,
                select: { id: true, title: true, startDate: true, type: true },
            });
            contextData = {
                role: "Project Manager",
                myProjects,
                myAssignedTasks,
                myUpcomingEvents,
            };
        }
        // Construct the prompt for OpenAI
        const systemPrompt = `You are a helpful AI assistant integrated into the EDT System (a project management portal).
The user interacting with you is logged in as a ${userRole}.
Here is the real-time context data fetched from the database relevant to them:
${JSON.stringify(contextData, null, 2)}

Answer the user's questions accurately based ONLY on the provided context data. If you don't know the answer or the context data doesn't contain it, politely say so. Do not invent tracking numbers, project names, or events that are not in the context. Keep your response concise, professional, and well-formatted in markdown. Try to be extremely helpful.`;
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Assuming we use gpt-4o-mini for cost efficiency, can be changed.
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message },
            ],
            temperature: 0.3,
            max_tokens: 500,
        });
        const aiResponse = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process your request at this time.";
        res.json({
            success: true,
            data: {
                role: "ai",
                content: aiResponse,
            },
        });
    }
    catch (error) {
        console.error("AI Chatbot Error:", error);
        res.status(500).json({ success: false, message: "Failed to generate AI response. Make sure the API key is valid." });
    }
});
//# sourceMappingURL=ai.routes.js.map