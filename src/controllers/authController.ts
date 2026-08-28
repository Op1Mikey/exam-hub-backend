import { Request, Response, NextFunction } from "express";
import { login } from "../services/authService";
import { AppError } from "../middleware/errorHandler";

export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { email, password } = req.body;

    // Validation basique des champs
    if (!email || !password) {
      throw new AppError(400, "Email and password are required");
    }

    const result = await login(email, password);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
