import {
    Response,
    NextFunction,
} from "express";
import { AuthRequest } from "../middlewares/auth";
import { MyExamService } from "../services/myExamService";

export class MyExamController {
    static async getAvailable(
        req: AuthRequest,
        res: Response,
        next: NextFunction
    ) {
        try {
            res.json(
                await MyExamService.getAvailableExams(
                    req.user!.userId
                )
            );
        } catch (error) {
            next(error);
        }
    }

    static async getExam(
        req: AuthRequest,
        res: Response,
        next: NextFunction
    ) {
        try {
            const id = Number(req.params.id);

            if (!Number.isInteger(id) || id < 1) {
                return res
                    .status(400)
                    .json({ message: "Invalid id" });
            }

            res.json(
                await MyExamService.getExam(
                    id,
                    req.user!.userId
                )
            );
        } catch (error) {
            next(error);
        }
    }

    static async submit(
        req: AuthRequest,
        res: Response,
        next: NextFunction
    ) {
        try {
            const id = Number(req.params.id);

            if (!Number.isInteger(id) || id < 1) {
                return res
                    .status(400)
                    .json({ message: "Invalid id" });
            }

            const { answers } = req.body;

            const result =
                await MyExamService.submit(
                    id,
                    req.user!.userId,
                    answers
                );

            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }

    static async getHistory(
        req: AuthRequest,
        res: Response,
        next: NextFunction
    ) {
        try {
            res.json(
                await MyExamService.getHistory(
                    req.user!.userId
                )
            );
        } catch (error) {
            next(error);
        }
    }
}