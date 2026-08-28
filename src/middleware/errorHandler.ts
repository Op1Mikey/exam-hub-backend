import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
    public readonly statusCode: number;

    constructor(statusCode: number, message: string) {
        super(message);
        this.name = "AppError";
        this.statusCode = statusCode;
    }
}

export function errorHandler(
    error: any,
    _req: Request,
    res: Response,
    _next: NextFunction
) {
    console.error(error);

    if (error instanceof AppError) {
        return res.status(error.statusCode).json({
            message: error.message,
        });
    }

    if (error?.code === "23505") {
        return res.status(409).json({
            message: "Conflict",
        });
    }

    // PostgreSQL : violation FK
    if (error?.code === "23503") {
        return res.status(409).json({
            message: "Resource cannot be deleted because it has dependencies",
        });
    }

    return res.status(500).json({
        message: "Internal server error",
    });
}