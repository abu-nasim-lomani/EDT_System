"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_routes_1 = require("./routes/auth.routes");
const project_routes_1 = require("./routes/project.routes");
const task_routes_1 = require("./routes/task.routes");
const event_routes_1 = require("./routes/event.routes");
const dashboard_routes_1 = require("./routes/dashboard.routes");
const users_routes_1 = require("./routes/users.routes");
const reschedule_routes_1 = require("./routes/reschedule.routes");
const notification_routes_1 = require("./routes/notification.routes");
const conversation_routes_1 = require("./routes/conversation.routes");
const ai_routes_1 = require("./routes/ai.routes");
const createApp = () => {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)({
        origin: process.env.CLIENT_URL ?? "http://localhost:3000",
        credentials: true,
    }));
    app.use(express_1.default.json());
    // Health check
    app.get("/health", (_req, res) => {
        res.json({ status: "ok", timestamp: new Date().toISOString() });
    });
    // API routes
    app.use("/api/auth", auth_routes_1.authRouter);
    app.use("/api/users", users_routes_1.usersRouter);
    app.use("/api/projects", project_routes_1.projectRouter);
    app.use("/api/tasks", task_routes_1.taskRouter);
    app.use("/api/events", event_routes_1.eventRouter);
    app.use("/api/events/:id/reschedule-requests", reschedule_routes_1.rescheduleRouter);
    app.use("/api/reschedule-requests", reschedule_routes_1.rescheduleRouter); // Global lookup support
    app.use("/api/notifications", notification_routes_1.notificationRouter);
    app.use("/api/dashboard", dashboard_routes_1.dashboardRouter);
    app.use("/api/conversations", conversation_routes_1.conversationRouter);
    app.use("/api/ai", ai_routes_1.aiRouter);
    // Global error handler
    app.use((err, _req, res, _next) => {
        console.error(err.stack);
        res.status(500).json({ success: false, message: err.message ?? "Internal Server Error" });
    });
    return app;
};
exports.createApp = createApp;
//# sourceMappingURL=app.js.map