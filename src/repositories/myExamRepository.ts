import { pool } from "../config/db";

export class MyExamRepository {
    static async getAvailableExams(
        studentId: number
    ) {
        const result = await pool.query(
            `
      SELECT
        e.id,
        e.title,

        json_build_object(
          'code', c.code,
          'name', c.name,
          'description', c.description
        ) AS course,

        e.end_at AS ends_at,

        (
          SELECT COUNT(*)::integer
          FROM questions q
          WHERE q.exam_id = e.id
        ) AS question_count,

        (
          SELECT COALESCE(SUM(q.points), 0)::integer
          FROM questions q
          WHERE q.exam_id = e.id
        ) AS total_points

      FROM exams e
      JOIN courses c
        ON c.id = e.course_id

      WHERE NOW()
        BETWEEN e.start_at
        AND e.end_at

        AND NOT EXISTS (
          SELECT 1
          FROM attempts a
          WHERE a.exam_id = e.id
            AND a.student_id = $1
        )

      ORDER BY e.end_at ASC
      `,
            [studentId]
        );

        return result.rows;
    }

    static async getExam(
        examId: number
    ) {
        const result = await pool.query(
            `
      SELECT
        e.id,
        e.title,

        json_build_object(
          'code', c.code,
          'name', c.name,
          'description', c.description
        ) AS course,

        e.start_at AS starts_at,
        e.end_at AS ends_at,

        (
          SELECT COUNT(*)::integer
          FROM questions q
          WHERE q.exam_id = e.id
        ) AS question_count,

        (
          SELECT COALESCE(SUM(q.points), 0)::integer
          FROM questions q
          WHERE q.exam_id = e.id
        ) AS total_points

      FROM exams e
      JOIN courses c
        ON c.id = e.course_id

      WHERE e.id = $1
      `,
            [examId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const exam = result.rows[0];

        const questionsResult =
            await pool.query(
                `
        SELECT
          q.id,
          q.statement,
          q.points,
          ROW_NUMBER() OVER (
            ORDER BY q.id
          )::integer AS position
        FROM questions q
        WHERE q.exam_id = $1
        ORDER BY q.id ASC
        `,
                [examId]
            );

        const questions = [];

        for (
            const question of questionsResult.rows
            ) {
            const choicesResult =
                await pool.query(
                    `
          SELECT
            id,
            label AS text
          FROM choices
          WHERE question_id = $1
          ORDER BY id ASC
          `,
                    [question.id]
                );

            questions.push({
                ...question,
                choices: choicesResult.rows,
            });
        }

        return {
            ...exam,
            questions,
        };
    }

    static async hasAttempted(
        examId: number,
        studentId: number
    ) {
        const result = await pool.query(
            `
      SELECT 1
      FROM attempts
      WHERE exam_id = $1
        AND student_id = $2
      LIMIT 1
      `,
            [examId, studentId]
        );

        return result.rows.length > 0;
    }

    static async processSubmission(
        examId: number,
        studentId: number,
        answers: {
            question_id: number;
            choice_id: number;
        }[]
    ) {
        const client = await pool.connect();

        try {
            await client.query("BEGIN");

            /*
             * RG-02 :
             * On vérifie dans la transaction.
             * La contrainte UNIQUE en DB constitue la seconde barrière.
             */
            const existingAttempt =
                await client.query(
                    `
          SELECT id
          FROM attempts
          WHERE exam_id = $1
            AND student_id = $2
          FOR UPDATE
          `,
                    [examId, studentId]
                );

            if (existingAttempt.rows.length > 0) {
                throw new Error(
                    "Exam already taken"
                );
            }

            const questionsResult =
                await client.query(
                    `
          SELECT
            id,
            points
          FROM questions
          WHERE exam_id = $1
          ORDER BY id ASC
          `,
                    [examId]
                );

            const questions =
                questionsResult.rows;

            const questionIds = new Set(
                questions.map(
                    (q) => Number(q.id)
                )
            );

            const seenQuestions =
                new Set<number>();

            /*
             * Validation complète des données reçues.
             */
            for (const answer of answers) {
                const questionId =
                    Number(answer.question_id);

                const choiceId =
                    Number(answer.choice_id);

                if (
                    !Number.isInteger(questionId) ||
                    !Number.isInteger(choiceId) ||
                    questionId < 1 ||
                    choiceId < 1
                ) {
                    throw new Error(
                        "Invalid answers"
                    );
                }

                if (
                    !questionIds.has(questionId)
                ) {
                    throw new Error(
                        "Invalid answers"
                    );
                }

                if (
                    seenQuestions.has(questionId)
                ) {
                    throw new Error(
                        "Invalid answers"
                    );
                }

                seenQuestions.add(questionId);

                const choiceResult =
                    await client.query(
                        `
            SELECT id
            FROM choices
            WHERE id = $1
              AND question_id = $2
            `,
                        [choiceId, questionId]
                    );

                if (
                    choiceResult.rows.length === 0
                ) {
                    throw new Error(
                        "Invalid answers"
                    );
                }
            }

            /*
             * RG-06 : calcul uniquement ici, côté serveur.
             */
            let score = 0;

            for (const answer of answers) {
                const result =
                    await client.query(
                        `
            SELECT
              q.points,
              c.is_correct
            FROM questions q
            JOIN choices c
              ON c.question_id = q.id
            WHERE q.id = $1
              AND c.id = $2
            `,
                        [
                            answer.question_id,
                            answer.choice_id,
                        ]
                    );

                if (result.rows.length === 0) {
                    throw new Error(
                        "Invalid answers"
                    );
                }

                if (
                    result.rows[0].is_correct
                ) {
                    score += Number(
                        result.rows[0].points
                    );
                }
            }

            const attemptResult =
                await client.query(
                    `
          INSERT INTO attempts (
            exam_id,
            student_id,
            submitted_at,
            score
          )
          VALUES (
            $1,
            $2,
            NOW(),
            $3
          )
          RETURNING id
          `,
                    [
                        examId,
                        studentId,
                        score,
                    ]
                );

            const attemptId =
                attemptResult.rows[0].id;

            /*
             * RG-05 :
             * On n'insère que les réponses présentes.
             * Les questions absentes restent donc à 0.
             */
            for (const answer of answers) {
                await client.query(
                    `
          INSERT INTO answers (
            attempt_id,
            question_id,
            choice_id
          )
          VALUES ($1, $2, $3)
          `,
                    [
                        attemptId,
                        answer.question_id,
                        answer.choice_id,
                    ]
                );
            }

            await client.query("COMMIT");

            return attemptId;
        } catch (error: any) {
            await client.query("ROLLBACK");

            if (
                error?.code === "23505"
            ) {
                throw new Error(
                    "Exam already taken"
                );
            }

            throw error;
        } finally {
            client.release();
        }
    }

    static async getCorrection(
        attemptId: number
    ) {
        const result = await pool.query(
            `
      SELECT
        q.id AS question_id,
        q.statement,
        q.points,

        a.choice_id AS student_choice_id,

        correct_choice.id
          AS correct_choice_id,

        CASE
          WHEN a.choice_id IS NOT NULL
          AND a.choice_id = correct_choice.id
          THEN TRUE
          ELSE FALSE
        END AS is_correct

      FROM attempts at
      JOIN questions q
        ON q.exam_id = at.exam_id

      JOIN choices correct_choice
        ON correct_choice.question_id = q.id
       AND correct_choice.is_correct = TRUE

      LEFT JOIN answers a
        ON a.attempt_id = at.id
       AND a.question_id = q.id

      WHERE at.id = $1

      ORDER BY q.id ASC
      `,
            [attemptId]
        );

        return result.rows;
    }

    static async getHistory(
        studentId: number
    ) {
        const result = await pool.query(
            `
      SELECT
        e.id AS exam_id,
        e.title,
        c.code AS course_code,
        a.score::integer AS score,

        (
          SELECT COALESCE(
            SUM(q.points),
            0
          )::integer
          FROM questions q
          WHERE q.exam_id = e.id
        ) AS total_points,

        a.submitted_at

      FROM attempts a
      JOIN exams e
        ON e.id = a.exam_id
      JOIN courses c
        ON c.id = e.course_id

      WHERE a.student_id = $1

      ORDER BY a.submitted_at DESC
      `,
            [studentId]
        );

        return result.rows;
    }
}