import pool from "../config/db";

export interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: "admin" | "student";
  is_active: boolean;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const result = await pool.query<UserRow>(
    `SELECT id, name, email, password_hash, role, is_active
     FROM users
     WHERE email = $1`,
    [email]
  );
  return result.rows[0] ?? null;
}
