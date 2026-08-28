import * as repo from '../repositories/myExamRepository';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Regroupe les lignes plates (question + choice) en objets imbriqués
function groupQuestionsWithChoices(
  rows: any[],
  includeIsCorrect: boolean
) {
  const map = new Map<number, any>();
  for (const row of rows) {
    if (!map.has(row.id)) {
      map.set(row.id, {
        id: row.id,
        statement: row.statement,
        points: row.points,

        choices: [],
      });
    }
    const choice: any = { id: row.choice_id, text: row.choice_text };
    if (includeIsCorrect) choice.is_correct = row.is_correct;
    map.get(row.id).choices.push(choice);
  }
  return Array.from(map.values());
}

// ─── GET /my/exams ────────────────────────────────────────────────────────────
export async function getAvailableExams(studentId: number) {
  const rows = await repo.findAvailableExams(studentId);
  return rows.map((r: any) => ({
    id: r.id,
    title: r.title,
    course: { code: r.course_code, name: r.course_name },
    description: r.description,
    ends_at: r.ends_at,
    question_count: r.question_count,
    total_points: r.total_points,
  }));
}

// ─── GET /my/exams/:id ────────────────────────────────────────────────────────
export async function getExamDetail(examId: number, studentId: number) {
  // 1. Examen existe ?
  const exam = await repo.findExamById(examId);
  if (!exam) {
    const err: any = new Error('Exam not found');
    err.status = 404;
    throw err;
  }

  // 2. Fenêtre ouverte ? (RG-03)
  const available = await repo.isExamAvailable(examId);
  if (!available) {
    const err: any = new Error('Exam is not available');
    err.status = 403;
    throw err;
  }

  // 3. Déjà passé ? (RG-02)
  const attempt = await repo.findAttempt(studentId, examId);
  if (attempt) {
    const err: any = new Error('Exam already taken');
    err.status = 409;
    throw err;
  }

  // 4. Questions sans is_correct (RG-07)
  const rows = await repo.findQuestionsWithChoices(examId);
  const questions = groupQuestionsWithChoices(rows, false);

  // total_points pour le résumé
  const total_points = questions.reduce((sum: number, q: any) => sum + q.points, 0);

  return {
    id: exam.id,
    title: exam.title,
    course: { code: exam.course_code, name: exam.course_name },
    description: exam.description,
    ends_at: exam.ends_at,
    question_count: questions.length,
    total_points,
    questions,
  };
}

// ─── POST /my/exams/:id/submit ────────────────────────────────────────────────
export async function submitExam(
  examId: number,
  studentId: number,
  rawAnswers: Array<{ question_id: number; choice_id: number }>
) {
  // 1. Examen existe ?
  const exam = await repo.findExamById(examId);
  if (!exam) {
    const err: any = new Error('Exam not found');
    err.status = 404;
    throw err;
  }

  // 2. Fenêtre ouverte ? (RG-03, revérifiée à la soumission)
  const available = await repo.isExamAvailable(examId);
  if (!available) {
    const err: any = new Error('Exam is not available');
    err.status = 403;
    throw err;
  }

  // 3. Déjà passé ? (RG-02)
  const existingAttempt = await repo.findAttempt(studentId, examId);
  if (existingAttempt) {
    const err: any = new Error('Exam already taken');
    err.status = 409;
    throw err;
  }

  // 4. Validation des réponses envoyées
  if (!Array.isArray(rawAnswers)) {
    const err: any = new Error('Invalid request data');
    err.status = 400;
    throw err;
  }

  // 4a. Doublons de question_id
  const questionIds = rawAnswers.map((a) => a.question_id);
  const uniqueIds = new Set(questionIds);
  if (uniqueIds.size !== questionIds.length) {
    const err: any = new Error('Duplicate question_id in answers');
    err.status = 400;
    throw err;
  }

  // 5. Charger toutes les questions+choix de l'examen (avec is_correct côté serveur)
  const allRows = await repo.findQuestionsWithCorrectChoices(examId);

  // Construire map : questionId -> { points, statement, position, choices: Map<choiceId, {text, is_correct}> }
  const questionsMap = new Map<number, any>();
  for (const row of allRows) {
    if (!questionsMap.has(row.question_id)) {
      questionsMap.set(row.question_id, {
        question_id: row.question_id,
        statement: row.statement,
        points: row.points,

        choices: new Map<number, { text: string; is_correct: boolean }>(),
        correctChoiceId: null as number | null,
      });
    }
    const q = questionsMap.get(row.question_id);
    q.choices.set(row.choice_id, { text: row.choice_text, is_correct: row.is_correct });
    if (row.is_correct) q.correctChoiceId = row.choice_id;
  }

  // 4b. Vérifier que chaque question_id appartient à l'examen
  //     et que chaque choice_id appartient à la question
  for (const ans of rawAnswers) {
    if (!questionsMap.has(ans.question_id)) {
      const err: any = new Error('Invalid request data');
      err.status = 400;
      throw err;
    }
    const q = questionsMap.get(ans.question_id);
    if (!q.choices.has(ans.choice_id)) {
      const err: any = new Error('Invalid request data');
      err.status = 400;
      throw err;
    }
  }

  // 6. Construire la map des réponses de l'étudiant : questionId -> choiceId
  const studentAnswerMap = new Map<number, number>();
  for (const ans of rawAnswers) {
    studentAnswerMap.set(ans.question_id, ans.choice_id);
  }

  // 7. Calcul du score côté serveur (RG-06) + correction (RG-12)
  let score = 0;
  const correction: Array<{
    question_id: number;
    statement: string;
    points: number;
    student_choice_id: number | null;
    correct_choice_id: number;
    is_correct: boolean;
  }> = [];

  const sortedQuestions = Array.from(questionsMap.values()).sort(
    (a, b) => a.question_id - b.question_id
  );

  for (const q of sortedQuestions) {
    const studentChoiceId = studentAnswerMap.get(q.question_id) ?? null;
    const isCorrect =
      studentChoiceId !== null && studentChoiceId === q.correctChoiceId;

    if (isCorrect) score += q.points;

    correction.push({
      question_id: q.question_id,
      statement: q.statement,
      points: q.points,
      student_choice_id: studentChoiceId,
      correct_choice_id: q.correctChoiceId,
      is_correct: isCorrect,
    });
  }

  // 8. Construire la liste des answers à insérer (RG-05 : partielles autorisées)
  const answersToInsert = sortedQuestions.map((q) => ({
    question_id: q.question_id,
    choice_id: studentAnswerMap.get(q.question_id) ?? null,
  }));

  // 9. Persister dans une transaction
  await repo.createAttemptWithAnswers(studentId, examId, score, answersToInsert);

  // 10. total_points
  const total_points = sortedQuestions.reduce(
    (sum: number, q: any) => sum + q.points,
    0
  );

  return { score, total_points, correction };
}

// ─── GET /my/results ──────────────────────────────────────────────────────────
export async function getMyResults(studentId: number) {
  const rows = await repo.findResultsByStudent(studentId);
  return rows.map((r: any) => ({
    exam_id: r.exam_id,
    title: r.title,
    course_code: r.course_code,
    score: r.score,
    total_points: r.total_points,
    submitted_at: r.submitted_at,
  }));
}