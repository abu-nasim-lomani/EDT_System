import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.routes";
import { projectRouter } from "./routes/project.routes";
import { taskRouter } from "./routes/task.routes";
import { eventRouter } from "./routes/event.routes";
import { dashboardRouter } from "./routes/dashboard.routes";
import { usersRouter } from "./routes/users.routes";
import { rescheduleRouter } from "./routes/reschedule.routes";
import { notificationRouter } from "./routes/notification.routes";
import { conversationRouter } from "./routes/conversation.routes";

export const createApp = () => {
    const app = express();

    app.use(cors({
        origin: process.env.CLIENT_URL ?? "http://localhost:3000",
        credentials: true,
    }));
    app.use(express.json());

    // Health check
    app.get("/health", (_req, res) => {
        res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    // API routes
    app.use("/api/auth", authRouter);
    app.use("/api/users", usersRouter);
    app.use("/api/projects", projectRouter);
    app.use("/api/tasks", taskRouter);
    app.use("/api/events", eventRouter);
    app.use("/api/events/:id/reschedule-requests", rescheduleRouter);
    app.use("/api/reschedule-requests", rescheduleRouter); // Global lookup support
    app.use("/api/notifications", notificationRouter);
    app.use("/api/dashboard", dashboardRouter);
    app.use("/api/conversations", conversationRouter);

    // Global error handler
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        console.error(err.stack);
        res.status(500).json({ success: false, message: err.message ?? "Internal Server Error" });
    });

    return app;
};
