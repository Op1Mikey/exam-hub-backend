import { Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/auth";
import { StudentService } from "../services/studentService";

export class StudentController {
    static async getAll(
        _req: AuthRequest,
        res: Response,
        next: NextFunction
    ) {
        try {
            res.json(await StudentService.getAll());
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
            const { name, email, password } = req.body;

            const student = await StudentService.create(
                name,
                email,
                password
            );

            res.status(201).json(student);
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
                return res.status(400).json({
                    message: "Invalid id",
                });
            }

            const {
                name,
                email,
                is_active = true,
                password,
            } = req.body;

            const student = await StudentService.update(
                id,
                name,
                email,
                is_active,
                password
            );

            res.json(student);
        } catch (error) {
            next(error);
        }
    }

    static async deactivate(
        req: AuthRequest,
        res: Response,
        next: NextFunction
    ) {
        try {
            const id = Number(req.params.id);

            if (!Number.isInteger(id) || id < 1) {
                return res.status(400).json({
                    message: "Invalid id",
                });
            }

            const student =
                await StudentService.deactivate(id);

            res.json(student);
        } catch (error) {
            next(error);
        }
    }
}