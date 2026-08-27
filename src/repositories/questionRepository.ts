import { pool } from "../config/db";

export interface ChoiceInput {
    text: string;
    is_correct: boolean;
}

export class QuestionRepository {
    static async findByExamId(examId: number) {
        const result = await pool.query(
            `
      SELECT
        q.id,
        q.exam_id,
        q.statement,
        q.points,
        ROW_NUMBER() OVER (
          ORDER BY q.id
        )::integer AS position,

        COALESCE(
          json_agg(
            json_build_object(
              'id', c.id,
              'text', c.label,
              'is_correct', c.is_correct
            )
            ORDER BY c.id
          ) FILTER (WHERE c.id IS NOT NULL),
          '[]'::json
        ) AS choices

      FROM questions q
      LEFT JOIN choices c
        ON c.question_id = q.id
      WHERE q.exam_id = $1
      GROUP BY q.id
      ORDER BY q.id ASC
      `,
            [examId]
        );

        return result.rows;
    }

    static async findById(id: number) {
        const result = await pool.query(
            `
      SELECT *
      FROM questions
      WHERE id = $1
      `,
            [id]
        );

        return result.rows[0] ?? null;
    }

    static async getExamIdByQuestionId(
        questionId: number
    ) {
        const result = await pool.query(
            `
      SELECT exam_id
      FROM questions
      WHERE id = $1
      `,
            [questionId]
        );

        return result.rows[0]?.exam_id ?? null;
    }

    static async countAttemptsForExam(
        examId: number
    ) {
        const result = await pool.query(
            `
      SELECT COUNT(*)::integer AS count
      FROM attempts
      WHERE exam_id = $1
      `,
            [examId]
        );

        return result.rows[0].count;
    }

    static async create(
        examId: number,
        statement: string,
        points: number,
        choices: ChoiceInput[]
    ) {
        const client = await pool.connect();

        try {
            await client.query("BEGIN");

            const questionResult = await client.query(
                `
        INSERT INTO questions (
          exam_id,
          statement,
          points
        )
        VALUES ($1, $2, $3)
        RETURNING *
        `,
                [examId, statement, points]
            );

            const question =
                questionResult.rows[0];

            for (const choice of choices) {
                await client.query(
                    `
          INSERT INTO choices (
            question_id,
            label,
            is_correct
          )
          VALUES ($1, $2, $3)
          `,
                    [
                        question.id,
                        choice.text,
                        choice.is_correct,
                    ]
                );
            }

            await client.query("COMMIT");

            return this.findById(question.id);
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }

    static async update(
        questionId: number,
        statement: string,
        points: number,
        choices: ChoiceInput[]
    ) {
        const client = await pool.connect();

        try {
            await client.query("BEGIN");

            const questionResult =
                await client.query(
                    `
          UPDATE questions
          SET
            statement = $1,
            points = $2
          WHERE id = $3
          RETURNING *
          `,
                    [statement, points, questionId]
                );

            if (questionResult.rows.length === 0) {
                throw new Error("Question not found");
            }

            await client.query(
                `
        DELETE FROM choices
        WHERE question_id = $1
        `,
                [questionId]
            );

            for (const choice of choices) {
                await client.query(
                    `
          INSERT INTO choices (
            question_id,
            label,
            is_correct
          )
          VALUES ($1, $2, $3)
          `,
                    [
                        questionId,
                        choice.text,
                        choice.is_correct,
                    ]
                );
            }

            await client.query("COMMIT");

            return this.findById(questionId);
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }

    static async delete(questionId: number) {
        await pool.query(
            `DELETE FROM questions WHERE id = $1`,
            [questionId]
        );
    }
}