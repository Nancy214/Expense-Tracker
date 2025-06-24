import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { TokenPayload, AuthRequest } from "../types/auth";

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: any
) => {
  const authHeader: string | undefined = req.headers.authorization;
  const token: string | undefined = authHeader?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  jwt.verify(
    token,
    process.env.JWT_SECRET || "your-secret-key",
    (err: jwt.VerifyErrors | null, decoded: any) => {
      if (err) {
        return res.status(403).json({ message: "Invalid or expired token" });
      }
      req.user = decoded as TokenPayload;
      next();
    }
  );
};
