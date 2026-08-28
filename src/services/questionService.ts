import { AppError } from "../middleware/errorHandler";
import {
    ChoiceInput,
    QuestionRepository,
} from "../repositories/questionRepository";

export class QuestionService {
    private static validateChoices(
        choices: ChoiceInput[]
    ) {
        if (
            !Array.isArray(choices) ||
            choices.length < 2 ||
            choices.length > 6
        ) {
            throw new AppError(
                400,
                "A question must have between 2 and 6 choices"
            );
        }

        const correctCount =
            choices.filter(
                (choice) => choice.is_correct === true
            ).length;

        if (correctCount !== 1) {
            throw new AppError(
                400,
                "A question must have exactly one correct choice"
            );
        }

        for (const choice of choices) {
            if (
                typeof choice.text !== "string" ||
                typeof choice.is_correct !== "boolean"
            ) {
                throw new AppError(
                    400,
                    "Invalid request"
                );
            }
        }
    }

    static async getByExam(examId: number) {
        return QuestionRepository.findByExamId(examId);
    }

    static async create(
        examId: number,
        statement: string,
        points: number,
        choices: ChoiceInput[]
    ) {
        if (
            !statement ||
            !Number.isFinite(points) ||
            points <= 0
        ) {
            throw new AppError(400, "Invalid request");
        }

        const attempts =
            await QuestionRepository.countAttemptsForExam(
                examId
            );

        if (attempts > 0) {
            throw new AppError(
                409,
                "Cannot modify questions of an exam that has attempts"
            );
        }

        this.validateChoices(choices);

        return QuestionRepository.create(
            examId,
            statement,
            points,
            choices
        );
    }

    static async update(
        questionId: number,
        statement: string,
        points: number,
        choices: ChoiceInput[]
    ) {
        const examId =
            await QuestionRepository.getExamIdByQuestionId(
                questionId
            );

        if (!examId) {
            throw new AppError(
                404,
                "Question not found"
            );
        }

        const attempts =
            await QuestionRepository.countAttemptsForExam(
                examId
            );

        if (attempts > 0) {
            throw new AppError(
                409,
                "Cannot modify questions of an exam that has attempts"
            );
        }

        if (
            !statement ||
            !Number.isFinite(points) ||
            points <= 0
        ) {
            throw new AppError(400, "Invalid request");
        }

        this.validateChoices(choices);

        return QuestionRepository.update(
            questionId,
            statement,
            points,
            choices
        );
    }

    static async delete(questionId: number) {
        const examId =
            await QuestionRepository.getExamIdByQuestionId(
                questionId
            );

        if (!examId) {
            throw new AppError(
                404,
                "Question not found"
            );
        }

        const attempts =
            await QuestionRepository.countAttemptsForExam(
                examId
            );

        if (attempts > 0) {
            throw new AppError(
                409,
                "Cannot modify questions of an exam that has attempts"
            );
        }

        await QuestionRepository.delete(questionId);
    }
}