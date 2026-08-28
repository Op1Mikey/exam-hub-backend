import { pool } from '../config/db';

// ─── GET /my/exams ────────────────────────────────────────────────────────────
// Retourne les examens disponibles pour l'étudiant connecté :
//   - fenêtre ouverte (start_at <= NOW() <= ends_at)
//   - pas encore passé par cet étudiant
export async function findAvailableExams(studentId: number) {
  const result = await pool.query(
    `SELECT
       e.id,
       e.title,
       e.description,
       e.end_at,
       c.code  AS course_code,
       c.name  AS course_name,
       COUNT(DISTINCT q.id)::int          AS question_count,
       COALESCE(SUM(q.points), 0)::int    AS total_points
     FROM exams e
     JOIN courses c ON c.id = e.course_id
     LEFT JOIN questions q ON q.exam_id = e.id
     WHERE e.start_at <= NOW()
       AND e.end_at   >= NOW()
       AND NOT EXISTS (
             SELECT 1 FROM attempts a
             WHERE a.exam_id    = e.id
               AND a.student_id = $1
           )
     GROUP BY e.id, e.title, e.description, e.end_at, c.code, c.name
     ORDER BY e.end_at ASC`,
    [studentId]
  );
  return result.rows;
}

// ─── GET /my/exams/:id ────────────────────────────────────────────────────────
// Retourne l'examen avec ses questions et choix (SANS is_correct — RG-07)
export async function findExamById(examId: number) {
  const result = await pool.query(
    `SELECT
       e.id,
       e.title,
       e.description,
       e.start_at,
       e.end_at,
       c.code AS course_code,
       c.name AS course_name
     FROM exams e
     JOIN courses c ON c.id = e.course_id
     WHERE e.id = $1`,
    [examId]
  );
  return result.rows[0] ?? null;
}

export async function findQuestionsWithChoices(examId: number) {
  const result = await pool.query(
    `SELECT
       q.id,
       q.statement,
       q.points,

       ch.id   AS choice_id,
       ch.label AS choice_text
     FROM questions q
     JOIN choices ch ON ch.question_id = q.id
     WHERE q.exam_id = $1
     ORDER BY q.id ASC, ch.id ASC`,
    [examId]
  );
  return result.rows;
}

// ─── Vérifications métier ─────────────────────────────────────────────────────
export async function findAttempt(studentId: number, examId: number) {
  const result = await pool.query(
    `SELECT id FROM attempts
     WHERE student_id = $1 AND exam_id = $2`,
    [studentId, examId]
  );
  return result.rows[0] ?? null;
}

export async function isExamAvailable(examId: number): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM exams
     WHERE id = $1
       AND start_at <= NOW()
       AND end_at   >= NOW()`,
    [examId]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

// ─── POST /my/exams/:id/submit ────────────────────────────────────────────────
// Retourne toutes les questions + leur choix correct pour le calcul serveur
export async function findQuestionsWithCorrectChoices(examId: number) {
  const result = await pool.query(
    `SELECT
       q.id        AS question_id,
       q.statement,
       q.points,

       ch.id       AS choice_id,
       ch.label     AS choice_text,
       ch.is_correct
     FROM questions q
     JOIN choices ch ON ch.question_id = q.id
     WHERE q.exam_id = $1
     ORDER BY q.id ASC, ch.id ASC`,
    [examId]
  );
  return result.rows;
}

// Vérifie qu'un choice_id appartient bien à une question donnée
export async function validateChoiceBelongsToQuestion(
  choiceId: number,
  questionId: number
): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM choices
     WHERE id = $1 AND question_id = $2`,
    [choiceId, questionId]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

// Enregistre tentative + réponses + score dans une transaction
export async function createAttemptWithAnswers(
  studentId: number,
  examId: number,
  score: number,
  answers: Array<{ question_id: number; choice_id: number | null }>
): Promise<{ id: number; submitted_at: Date }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Créer la tentative
    const attemptResult = await client.query(
      `INSERT INTO attempts (student_id, exam_id, score)
       VALUES ($1, $2, $3)
       RETURNING id, submitted_at`,
      [studentId, examId, score]
    );
    const attempt = attemptResult.rows[0];

    // 2. Enregistrer les réponses (uniquement celles fournies)
    for (const ans of answers) {
      if (ans.choice_id !== null) {
        await client.query(
          `INSERT INTO answers (attempt_id, question_id, choice_id)
           VALUES ($1, $2, $3)`,
          [attempt.id, ans.question_id, ans.choice_id]
        );
      }
    }

    await client.query('COMMIT');
    return attempt;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── GET /my/results ──────────────────────────────────────────────────────────
export async function findResultsByStudent(studentId: number) {
  const result = await pool.query(
    `SELECT
       a.exam_id,
       e.title,
       c.code              AS course_code,
       a.score,
       COALESCE(SUM(q.points), 0)::int AS total_points,
       a.submitted_at
     FROM attempts a
     JOIN exams   e ON e.id = a.exam_id
     JOIN courses c ON c.id = e.course_id
     LEFT JOIN questions q ON q.exam_id = e.id
     WHERE a.student_id = $1
     GROUP BY a.exam_id, e.title, c.code, a.score, a.submitted_at
     ORDER BY a.submitted_at DESC`,
    [studentId]
  );
  return result.rows;
}