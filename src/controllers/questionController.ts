import { Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/auth";
import { QuestionService } from "../services/questionService";

export class QuestionController {
    static async getByExam(
        req: AuthRequest,
        res: Response,
        next: NextFunction
    ) {
        try {
            const examId = Number(req.params.id);

            if (!Number.isInteger(examId) || examId < 1) {
                return res
                    .status(400)
                    .json({ message: "Invalid id" });
            }

            res.json(
                await QuestionService.getByExam(examId)
            );
        } catch (error) {
            next(error);
        }
    }

    static async create(
        req: AuthRequest,
        res: Response,
        next: NextFunction
    ) {
        try {
            const examId = Number(req.params.id);

            if (!Number.isInteger(examId) || examId < 1) {
                return res
                    .status(400)
                    .json({ message: "Invalid id" });
            }

            const {
                statement,
                points = 1,
                choices,
            } = req.body;

            const question =
                await QuestionService.create(
                    examId,
                    statement,
                    Number(points),
                    choices
                );

            res.status(201).json(question);
        } catch (error) {
            next(error);
        }
    }

    static async update(
        req: AuthRequest,
        res: Response,
        next: NextFunction
    ) {
        try {
            const questionId = Number(req.params.id);

            if (
                !Number.isInteger(questionId) ||
                questionId < 1
            ) {
                return res
                    .status(400)
                    .json({ message: "Invalid id" });
            }

            const {
                statement,
                points = 1,
                choices,
            } = req.body;

            const question =
                await QuestionService.update(
                    questionId,
                    statement,
                    Number(points),
                    choices
                );

            res.json(question);
        } catch (error) {
            next(error);
        }
    }

    static async delete(
        req: AuthRequest,
        res: Response,
        next: NextFunction
    ) {
        try {
            const questionId = Number(req.params.id);

            if (
                !Number.isInteger(questionId) ||
                questionId < 1
            ) {
                return res
                    .status(400)
                    .json({ message: "Invalid id" });
            }

            await QuestionService.delete(questionId);

            res.json({
                message: "Question deleted",
            });
        } catch (error) {
            next(error);
        }
    }
}