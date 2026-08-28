import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { CourseService } from "../services/courseService";

export class CourseController {
    static async getAll(
        _req: AuthRequest,
        res: Response,
        next: NextFunction
    ) {
        try {
            res.json(await CourseService.getAll());
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
            const { code, name, description = null } =
                req.body;

            res.status(201).json(
                await CourseService.create(
                    code,
                    name,
                    description
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

            const { code, name, description = null } =
                req.body;

            res.json(
                await CourseService.update(
                    id,
                    code,
                    name,
                    description
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

            await CourseService.delete(id);

            res.json({
                message: "Course deleted",
            });
        } catch (error) {
            next(error);
        }
    }
}