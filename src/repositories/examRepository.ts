import { pool } from "../config/db";

export class ExamRepository {
    static async findAll() {
        const result = await pool.query(`
      SELECT
        e.id,
        e.title,
        e.description,
        e.start_at AS starts_at,
        e.end_at AS ends_at,

        json_build_object(
          'id', c.id,
          'code', c.code,
          'name', c.name
        ) AS course,

        (
          SELECT COUNT(*)::integer
          FROM questions q
          WHERE q.exam_id = e.id
        ) AS question_count,

        (
          SELECT COUNT(*)::integer
          FROM attempts a
          WHERE a.exam_id = e.id
        ) AS attempt_count

      FROM exams e
      JOIN courses c ON c.id = e.course_id
      ORDER BY e.start_at ASC
    `);

        return result.rows;
    }

    static async findById(id: number) {
        const result = await pool.query(
            `
      SELECT
        e.id,
        e.title,
        e.description,
        e.start_at AS starts_at,
        e.end_at AS ends_at,

        json_build_object(
          'id', c.id,
          'code', c.code,
          'name', c.name
        ) AS course,

        (
          SELECT COUNT(*)::integer
          FROM questions q
          WHERE q.exam_id = e.id
        ) AS question_count,

        (
          SELECT COUNT(*)::integer
          FROM attempts a
          WHERE a.exam_id = e.id
        ) AS attempt_count

      FROM exams e
      JOIN courses c ON c.id = e.course_id
      WHERE e.id = $1
      `,
            [id]
        );

        return result.rows[0] ?? null;
    }

    static async findRawById(id: number) {
        const result = await pool.query(
            `SELECT * FROM exams WHERE id = $1`,
            [id]
        );

        return result.rows[0] ?? null;
    }

    static async create(
        courseId: number,
        title: string,
        description: string | null,
        startAt: string,
        endAt: string
    ) {
        const result = await pool.query(
            `
      INSERT INTO exams (
        course_id,
        title,
        description,
        start_at,
        end_at
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        title,
        description,
        start_at AS starts_at,
        end_at AS ends_at
      `,
            [
                courseId,
                title,
                description,
                startAt,
                endAt,
            ]
        );

        return result.rows[0];
    }

    static async update(
        id: number,
        courseId: number,
        title: string,
        description: string | null,
        startAt: string,
        endAt: string
    ) {
        const result = await pool.query(
            `
      UPDATE exams
      SET
        course_id = $1,
        title = $2,
        description = $3,
        start_at = $4,
        end_at = $5
      WHERE id = $6
      RETURNING
        id,
        title,
        description,
        start_at AS starts_at,
        end_at AS ends_at
      `,
            [
                courseId,
                title,
                description,
                startAt,
                endAt,
                id,
            ]
        );

        return result.rows[0] ?? null;
    }

    static async countAttempts(id: number) {
        const result = await pool.query(
            `
      SELECT COUNT(*)::integer AS count
      FROM attempts
      WHERE exam_id = $1
      `,
            [id]
        );

        return result.rows[0].count;
    }

    static async delete(id: number) {
        await pool.query(
            `DELETE FROM exams WHERE id = $1`,
            [id]
        );
    }

    static async getResults(id: number) {
        const exam = await this.findRawById(id);

        if (!exam) {
            return null;
        }

        const questionsResult = await pool.query(
            `
      SELECT COALESCE(SUM(points), 0)::integer AS total_points
      FROM questions
      WHERE exam_id = $1
      `,
            [id]
        );

        const attemptsResult = await pool.query(
            `
      SELECT
        u.id AS student_id,
        u.name,
        a.score::integer AS score,
        a.submitted_at
      FROM attempts a
      JOIN users u ON u.id = a.student_id
      WHERE a.exam_id = $1
      ORDER BY a.score DESC, u.name ASC
      `,
            [id]
        );

        const statsResult = await pool.query(
            `
      SELECT
        COUNT(*)::integer AS attempt_count,
        ROUND(AVG(score), 2)::float AS average
      FROM attempts
      WHERE exam_id = $1
      `,
            [id]
        );

        return {
            exam: {
                id: exam.id,
                title: exam.title,
                total_points:
                questionsResult.rows[0].total_points,
                average:
                    statsResult.rows[0].attempt_count === 0
                        ? null
                        : statsResult.rows[0].average,
                attempt_count:
                statsResult.rows[0].attempt_count,
            },
            results: attemptsResult.rows,
        };
    }
}