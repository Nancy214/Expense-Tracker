import type { JwtPayload } from "@expense-tracker/shared-types";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
    user?: JwtPayload;
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader: string | undefined = req.headers.authorization;
    const token: string | undefined = authHeader?.split(" ")[1];

    if (!token) {
        res.status(401).json({ message: "Access token required" });
        return;
    }

    jwt.verify(
        token,
        process.env.JWT_SECRET ||
            (() => {
                throw new Error("JWT_SECRET environment variable is required");
            })(),
        (err: jwt.VerifyErrors | null, decoded: any): void => {
            if (err) {
                res.status(403).json({ message: "Invalid or expired token" });
                return;
            }
            (req as AuthRequest).user = decoded as JwtPayload;
            next();
        }
    );
};
