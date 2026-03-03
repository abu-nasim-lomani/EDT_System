"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const decision_routes_1 = __importDefault(require("./routes/decision.routes"));
const PORT = process.env.PORT ?? 5000;
const app = (0, app_1.createApp)();
app.use("/api/decisions", decision_routes_1.default);
app.listen(PORT, () => {
    console.log(`🚀 EDT Server running on http://localhost:${PORT}`);
});
//# sourceMappingURL=server.js.map