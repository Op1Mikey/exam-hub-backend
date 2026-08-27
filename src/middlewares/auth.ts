import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "./errorHandler";

// Étend le type Request pour y ajouter l'utilisateur décodé
export interface AuthRequest extends Request {
  user?: { userId: number; role: "admin" | "student" };
}

// Vérifie que le JWT est présent et valide
export function requireAuth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(401, "No token provided");
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET manquant");

    const decoded = jwt.verify(token, secret) as {
      userId: number;
      role: "admin" | "student";
    };

    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof AppError) return next(err);
    next(new AppError(401, "Invalid or expired token"));
  }
}

// Vérifie le rôle après requireAuth
export function requireRole(role: "admin" | "student") {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== role) {
      const message =
        role === "admin" ? "Admin access required" : "Student access required";
      return next(new AppError(403, message));
    }
    next();
  };
}
