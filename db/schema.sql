-- ============================================================
-- Exam Hub - Schéma de base de données
-- Convention : timestamps en UTC (timestamptz)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- pour gen_random_uuid() si besoin plus tard

-- ------------------------------------------------------------
-- Utilisateurs (un seul rôle par utilisateur : colonne unique)
-- ------------------------------------------------------------
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(150) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          VARCHAR(10) NOT NULL CHECK (role IN ('admin', 'student')),
    is_active     BOOLEAN NOT NULL DEFAULT TRUE, -- RG-10 : jamais de suppression physique
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- Cours
-- ------------------------------------------------------------
CREATE TABLE courses (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(30) NOT NULL UNIQUE,
    name        VARCHAR(150) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- Examens
-- RG-09 : un cours avec des examens ne peut pas être supprimé
--         -> ON DELETE RESTRICT sur course_id
-- ------------------------------------------------------------
CREATE TABLE exams (
    id          SERIAL PRIMARY KEY,
    course_id   INTEGER NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    title       VARCHAR(150) NOT NULL,
    description TEXT,
    start_at    TIMESTAMPTZ NOT NULL,
    end_at      TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT exam_window_valid CHECK (end_at > start_at)
);

-- ------------------------------------------------------------
-- Questions
-- Rattachées à un examen ; si l'examen est supprimé (ce qui n'est
-- possible que sans tentative, cf RG-09), ses questions le sont aussi.
-- ------------------------------------------------------------
CREATE TABLE questions (
    id         SERIAL PRIMARY KEY,
    exam_id    INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    statement  TEXT NOT NULL,
    points     NUMERIC(5,2) NOT NULL CHECK (points > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- Choix de réponse
-- RG-04 (2 à 6 choix, exactement un correct) est vérifié par
-- la couche service à l'écriture ; voir triggers plus bas pour
-- une double sécurité sur "exactement un correct".
-- ------------------------------------------------------------
CREATE TABLE choices (
    id          SERIAL PRIMARY KEY,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    label       VARCHAR(500) NOT NULL,
    is_correct  BOOLEAN NOT NULL DEFAULT FALSE
);

-- ------------------------------------------------------------
-- Tentatives
-- RG-02 : un étudiant ne passe un examen qu'une seule fois
--         -> UNIQUE(exam_id, student_id), garanti en base
-- RG-09 : un examen avec tentatives n'est pas supprimable
--         -> ON DELETE RESTRICT sur exam_id
-- ------------------------------------------------------------
CREATE TABLE attempts (
    id           SERIAL PRIMARY KEY,
    exam_id      INTEGER NOT NULL REFERENCES exams(id) ON DELETE RESTRICT,
    student_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    score        NUMERIC(6,2) NOT NULL DEFAULT 0,
    CONSTRAINT unique_attempt_per_student_exam UNIQUE (exam_id, student_id)
);

-- ------------------------------------------------------------
-- Réponses données par l'étudiant lors d'une tentative
-- RG-05 : question sans réponse autorisée -> choice_id nullable
-- ------------------------------------------------------------
CREATE TABLE answers (
    id          SERIAL PRIMARY KEY,
    attempt_id  INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
    choice_id   INTEGER REFERENCES choices(id) ON DELETE RESTRICT,
    CONSTRAINT unique_answer_per_question_per_attempt UNIQUE (attempt_id, question_id)
);

-- ------------------------------------------------------------
-- Index utiles
-- ------------------------------------------------------------
CREATE INDEX idx_exams_course_id ON exams(course_id);
CREATE INDEX idx_questions_exam_id ON questions(exam_id);
CREATE INDEX idx_choices_question_id ON choices(question_id);
CREATE INDEX idx_attempts_exam_id ON attempts(exam_id);
CREATE INDEX idx_attempts_student_id ON attempts(student_id);
CREATE INDEX idx_answers_attempt_id ON answers(attempt_id);

-- ------------------------------------------------------------
-- Trigger de sécurité : empêche plus d'un choix correct par
-- question au niveau base (double vérification de RG-04, en
-- plus de la validation applicative dans services/).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_single_correct_choice()
RETURNS TRIGGER AS $$
DECLARE
    correct_count INTEGER;
BEGIN
    IF NEW.is_correct THEN
        SELECT COUNT(*) INTO correct_count
        FROM choices
        WHERE question_id = NEW.question_id
          AND is_correct = TRUE
          AND id <> COALESCE(NEW.id, -1);

        IF correct_count >= 1 THEN
            RAISE EXCEPTION 'Une question ne peut avoir qu''un seul choix correct (question_id=%)', NEW.question_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_single_correct_choice
BEFORE INSERT OR UPDATE ON choices
FOR EACH ROW
EXECUTE FUNCTION check_single_correct_choice();
