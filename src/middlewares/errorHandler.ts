import { Request, Response, NextFunction } from "express";

// Classe d'erreur personnalisée avec code HTTP
export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "AppError";
  }
}

// Middleware central — doit être déclaré en dernier dans index.ts
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Erreur applicative connue (AppError)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  // Erreur PostgreSQL — violation de contrainte unique (ex: email déjà utilisé)
  if ((err as any).code === "23505") {
    return res.status(409).json({ message: "Ressource déjà existante" });
  }

  // Erreur inconnue — ne jamais exposer les détails en prod
  console.error("Erreur non gérée :", err);
  return res.status(500).json({ message: "Erreur interne du serveur" });
}
