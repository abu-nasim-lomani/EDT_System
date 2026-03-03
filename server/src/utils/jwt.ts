import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET ?? "edt-secret-change-in-production";
const EXPIRES_IN = "7d";

export interface JwtPayload {
    userId: string;
    role: string;
}

export const signToken = (payload: JwtPayload): string =>
    jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });

export const verifyToken = (token: string): JwtPayload =>
    jwt.verify(token, SECRET) as JwtPayload;
