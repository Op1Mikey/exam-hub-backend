import { AppError } from "../middleware/errorHandler";
import { CourseRepository } from "../repositories/courseRepository";
import { ExamRepository } from "../repositories/examRepository";

export class ExamService {
    static async getAll() {
        return ExamRepository.findAll();
    }

    static async getById(id: number) {
        const exam =
            await ExamRepository.findById(id);

        if (!exam) {
            throw new AppError(404, "Exam not found");
        }

        return exam;
    }

    static async create(
        courseId: number,
        title: string,
        description: string | null,
        startsAt: string,
        endsAt: string
    ) {
        if (
            !courseId ||
            !title ||
            !startsAt ||
            !endsAt
        ) {
            throw new AppError(400, "Invalid request");
        }

        const course =
            await CourseRepository.findById(courseId);

        if (!course) {
            throw new AppError(400, "Course not found");
        }

        const start = new Date(startsAt);
        const end = new Date(endsAt);

        if (
            Number.isNaN(start.getTime()) ||
            Number.isNaN(end.getTime()) ||
            end <= start
        ) {
            throw new AppError(
                400,
                "End date must be after start date"
            );
        }

        return ExamRepository.create(
            courseId,
            title,
            description,
            startsAt,
            endsAt
        );
    }

    static async update(
        id: number,
        courseId: number,
        title: string,
        description: string | null,
        startsAt: string,
        endsAt: string
    ) {
        const exam =
            await ExamRepository.findRawById(id);

        if (!exam) {
            throw new AppError(404, "Exam not found");
        }

        const course =
            await CourseRepository.findById(courseId);

        if (!course) {
            throw new AppError(400, "Course not found");
        }

        const start = new Date(startsAt);
        const end = new Date(endsAt);

        if (
            Number.isNaN(start.getTime()) ||
            Number.isNaN(end.getTime()) ||
            end <= start
        ) {
            throw new AppError(
                400,
                "End date must be after start date"
            );
        }

        return ExamRepository.update(
            id,
            courseId,
            title,
            description,
            startsAt,
            endsAt
        );
    }

    static async delete(id: number) {
        const exam =
            await ExamRepository.findRawById(id);

        if (!exam) {
            throw new AppError(404, "Exam not found");
        }

        const attempts =
            await ExamRepository.countAttempts(id);

        if (attempts > 0) {
            throw new AppError(
                409,
                "Cannot delete an exam that has attempts"
            );
        }

        await ExamRepository.delete(id);
    }

    static async getResults(id: number) {
        const result =
            await ExamRepository.getResults(id);

        if (!result) {
            throw new AppError(404, "Exam not found");
        }

        return result;
    }
}