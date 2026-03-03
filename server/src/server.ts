import { createApp } from "./app";
import decisionRoutes from "./routes/decision.routes";

const PORT = process.env.PORT ?? 5000;

const app = createApp();

app.use("/api/decisions", decisionRoutes);

app.listen(PORT, () => {
    console.log(`🚀 EDT Server running on http://localhost:${PORT}`);
});
