import { Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/auth";
import { ExamService } from "../services/examService";

export class ExamController {
    static async getAll(
        _req: AuthRequest,
        res: Response,
        next: NextFunction
    ) {
        try {
            res.json(await ExamService.getAll());
        } catch (error) {
            next(error);
        }
    }

    static async getById(
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

            res.json(await ExamService.getById(id));
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
            const {
                course_id,
                title,
                description = null,
                starts_at,
                ends_at,
            } = req.body;

            res.status(201).json(
                await ExamService.create(
                    course_id,
                    title,
                    description,
                    starts_at,
                    ends_at
                )
            );
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
            const id = Number(req.params.id);

            if (!Number.isInteger(id) || id < 1) {
                return res
                    .status(400)
                    .json({ message: "Invalid id" });
            }

            const {
                course_id,
                title,
                description = null,
                starts_at,
                ends_at,
            } = req.body;

            res.json(
                await ExamService.update(
                    id,
                    course_id,
                    title,
                    description,
                    starts_at,
                    ends_at
                )
            );
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
            const id = Number(req.params.id);

            if (!Number.isInteger(id) || id < 1) {
                return res
                    .status(400)
                    .json({ message: "Invalid id" });
            }

            await ExamService.delete(id);

            res.json({
                message: "Exam deleted",
            });
        } catch (error) {
            next(error);
        }
    }

    static async getResults(
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
                await ExamService.getResults(id)
            );
        } catch (error) {
            next(error);
        }
    }
}