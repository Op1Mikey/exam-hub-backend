import { pool } from "../config/db";

export class CourseRepository {
    static async findAll() {
        const result = await pool.query(`
      SELECT
        c.id,
        c.code,
        c.name,
        c.description,
        COUNT(e.id)::integer AS exam_count
      FROM courses c
      LEFT JOIN exams e
        ON e.course_id = c.id
      GROUP BY c.id
      ORDER BY c.code ASC
    `);

        return result.rows;
    }

    static async findById(id: number) {
        const result = await pool.query(
            `
      SELECT
        c.id,
        c.code,
        c.name,
        c.description,
        COUNT(e.id)::integer AS exam_count
      FROM courses c
      LEFT JOIN exams e
        ON e.course_id = c.id
      WHERE c.id = $1
      GROUP BY c.id
      `,
            [id]
        );

        return result.rows[0] ?? null;
    }

    static async findByCode(code: string) {
        const result = await pool.query(
            `SELECT * FROM courses WHERE code = $1`,
            [code]
        );

        return result.rows[0] ?? null;
    }

    static async create(
        code: string,
        name: string,
        description: string | null
    ) {
        const result = await pool.query(
            `
      INSERT INTO courses(code, name, description)
      VALUES ($1, $2, $3)
      RETURNING id, code, name, description
      `,
            [code, name, description]
        );

        return result.rows[0];
    }

    static async update(
        id: number,
        code: string,
        name: string,
        description: string | null
    ) {
        const result = await pool.query(
            `
      UPDATE courses
      SET
        code = $1,
        name = $2,
        description = $3
      WHERE id = $4
      RETURNING id, code, name, description
      `,
            [code, name, description, id]
        );

        return result.rows[0] ?? null;
    }

    static async countExams(id: number) {
        const result = await pool.query(
            `
      SELECT COUNT(*)::integer AS count
      FROM exams
      WHERE course_id = $1
      `,
            [id]
        );

        return result.rows[0].count;
    }

    static async delete(id: number) {
        await pool.query(
            `DELETE FROM courses WHERE id = $1`,
            [id]
        );
    }
}