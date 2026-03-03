"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.signToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const SECRET = process.env.JWT_SECRET ?? "edt-secret-change-in-production";
const EXPIRES_IN = "7d";
const signToken = (payload) => jsonwebtoken_1.default.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
exports.signToken = signToken;
const verifyToken = (token) => jsonwebtoken_1.default.verify(token, SECRET);
exports.verifyToken = verifyToken;
//# sourceMappingURL=jwt.js.map