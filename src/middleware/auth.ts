import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "./errorHandler";

export interface AuthRequest extends Request {
    user?: {
        userId: number;
        role: "admin" | "student";
    };
}

interface JwtPayload {
    userId: number;
    role: "admin" | "student";
}

export function requireAuth(
    req: AuthRequest,
    _res: Response,
    next: NextFunction
) {
    const authorization = req.headers.authorization;

    if (!authorization) {
        return next(new AppError(401, "No token provided"));
    }

    const [type, token] = authorization.split(" ");

    if (type !== "Bearer" || !token) {
        return next(new AppError(401, "No token provided"));
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET as string
        ) as JwtPayload;

        req.user = {
            userId: decoded.userId,
            role: decoded.role,
        };

        next();
    } catch {
        next(new AppError(401, "Invalid or expired token"));
    }
}

export function requireRole(
    role: "admin" | "student"
) {
    return (
        req: AuthRequest,
        _res: Response,
        next: NextFunction
    ) => {
        if (!req.user || req.user.role !== role) {
            return next(
                new AppError(
                    403,
                    role === "admin"
                        ? "Admin access required"
                        : "Student access required"
                )
            );
        }

        next();
    };
}