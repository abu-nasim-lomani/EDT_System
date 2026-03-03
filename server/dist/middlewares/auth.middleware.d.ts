import { Request, Response, NextFunction } from "express";
import { JwtPayload } from "../utils/jwt";
export interface AuthRequest extends Request {
    user?: JwtPayload;
}
export declare const protectRoute: (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const requireRole: (...roles: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.middleware.d.ts.map