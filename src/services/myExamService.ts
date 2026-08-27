import { AppError } from "../middlewares/errorHandler";
import { ExamRepository } from "../repositories/examRepository";
import { MyExamRepository } from "../repositories/myExamRepository";

export class MyExamService {
    static async getAvailableExams(
        studentId: number
    ) {
        return MyExamRepository.getAvailableExams(
            studentId
        );
    }

    static async getExam(
        examId: number,
        studentId: number
    ) {
        const exam =
            await ExamRepository.findRawById(examId);

        if (!exam) {
            throw new AppError(
                404,
                "Exam not found"
            );
        }

        /*
         * RG-03
         */
        const now = new Date();

        if (
            now < new Date(exam.start_at) ||
            now > new Date(exam.end_at)
        ) {
            throw new AppError(
                403,
                "Exam is not available"
            );
        }

        /*
         * RG-02
         */
        const alreadyTaken =
            await MyExamRepository.hasAttempted(
                examId,
                studentId
            );

        if (alreadyTaken) {
            throw new AppError(
                409,
                "Exam already taken"
            );
        }

        return MyExamRepository.getExam(
            examId
        );
    }

    static async submit(
        examId: number,
        studentId: number,
        answers: {
            question_id: number;
            choice_id: number;
        }[]
    ) {
        const exam =
            await ExamRepository.findRawById(examId);

        if (!exam) {
            throw new AppError(
                404,
                "Exam not found"
            );
        }

        /*
         * RG-03 :
         * Vérification au moment de la soumission.
         */
        const now = new Date();

        if (
            now < new Date(exam.start_at) ||
            now > new Date(exam.end_at)
        ) {
            throw new AppError(
                403,
                "Exam is not available"
            );
        }

        if (!Array.isArray(answers)) {
            throw new AppError(
                400,
                "Invalid answers"
            );
        }

        try {
            const attemptId =
                await MyExamRepository.processSubmission(
                    examId,
                    studentId,
                    answers
                );

            const correction =
                await MyExamRepository.getCorrection(
                    attemptId
                );

            const score = correction.reduce(
                (total, line) =>
                    total +
                    (line.is_correct
                        ? Number(line.points)
                        : 0),
                0
            );

            const totalPoints =
                correction.reduce(
                    (total, line) =>
                        total + Number(line.points),
                    0
                );

            return {
                score,
                total_points: totalPoints,
                correction,
            };
        } catch (error: any) {
            if (
                error instanceof Error &&
                error.message ===
                "Exam already taken"
            ) {
                throw new AppError(
                    409,
                    "Exam already taken"
                );
            }

            if (
                error instanceof Error &&
                error.message ===
                "Invalid answers"
            ) {
                throw new AppError(
                    400,
                    "Invalid answers"
                );
            }

            throw error;
        }
    }

    static async getHistory(
        studentId: number
    ) {
        return MyExamRepository.getHistory(
            studentId
        );
    }
}