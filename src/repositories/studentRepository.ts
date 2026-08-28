// @ts-ignore
import { pool } from "../config/db";

export interface Student {
    id: number;
    name: string;
    email: string;
    is_active: boolean;
    created_at: Date;
}

export class StudentRepository {
    // @ts-ignore
    static async findAll(): Promise<Student[]> {
        const result = await pool.query(`
      SELECT id, name, email, is_active, created_at
      FROM users
      WHERE role = 'student'
      ORDER BY id ASC
    `);

        return result.rows;
    }

    static async findById(id: number): Promise<Student | null> {
        const result = await pool.query(
            `
      SELECT id, name, email, is_active, created_at
      FROM users
      WHERE id = $1
        AND role = 'student'
      `,
            [id]
        );

        return result.rows[0] ?? null;
    }

    static async findUserByEmail(email: string) {
        const result = await pool.query(
            `
      SELECT *
      FROM users
      WHERE email = $1
      `,
            [email]
        );

        return result.rows[0] ?? null;
    }

    static async create(
        name: string,
        email: string,
        passwordHash: string
    ): Promise<Student> {
        const result = await pool.query(
            `
      INSERT INTO users (
        name,
        email,
        password_hash,
        role,
        is_active
      )
      VALUES ($1, $2, $3, 'student', TRUE)
      RETURNING id, name, email, is_active, created_at
      `,
            [name, email, passwordHash]
        );

        return result.rows[0];
    }

    static async update(
        id: number,
        name: string,
        email: string,
        isActive: boolean,
        passwordHash?: string
    ): Promise<Student | null> {
        if (passwordHash !== undefined) {
            const result = await pool.query(
                `
        UPDATE users
        SET
          name = $1,
          email = $2,
          is_active = $3,
          password_hash = $4
        WHERE id = $5
          AND role = 'student'
        RETURNING id, name, email, is_active, created_at
        `,
                [name, email, isActive, passwordHash, id]
            );

            return result.rows[0] ?? null;
        }

        const result = await pool.query(
            `
      UPDATE users
      SET
        name = $1,
        email = $2,
        is_active = $3
      WHERE id = $4
        AND role = 'student'
      RETURNING id, name, email, is_active, created_at
      `,
            [name, email, isActive, id]
        );

        return result.rows[0] ?? null;
    }

    static async deactivate(id: number): Promise<Student | null> {
        const result = await pool.query(
            `
      UPDATE users
      SET is_active = FALSE
      WHERE id = $1
        AND role = 'student'
      RETURNING id, name, email, is_active, created_at
      `,
            [id]
        );

        return result.rows[0] ?? null;
    }
}