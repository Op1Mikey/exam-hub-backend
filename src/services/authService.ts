import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { findUserByEmail } from "../repositories/authRepository";
import { AppError } from "../middlewares/errorHandler";

export async function login(email: string, password: string) {
  // 1. Vérifie que l'utilisateur existe
  const user = await findUserByEmail(email);
  if (!user) {
    throw new AppError(401, "Invalid email or password");
  }

  // 2. Vérifie le mot de passe
  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    throw new AppError(401, "Invalid email or password");
  }

  // 3. RG-11 : compte désactivé → message distinct
  if (!user.is_active) {
    throw new AppError(401, "Account disabled");
  }

  // 4. Génère le JWT
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET manquant dans .env");

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || "24h" } as jwt.SignOptions
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
    },
  };
}
