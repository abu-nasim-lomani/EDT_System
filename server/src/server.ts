import { createApp } from "./app";

const PORT = process.env.PORT ?? 5000;

const app = createApp();
app.listen(PORT, () => {
    console.log(`🚀 EDT Server running on http://localhost:${PORT}`);
});
