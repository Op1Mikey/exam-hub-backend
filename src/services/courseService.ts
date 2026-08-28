import { AppError } from "../middleware/errorHandler";
import { CourseRepository } from "../repositories/courseRepository";

export class CourseService {
    static async getAll() {
        return CourseRepository.findAll();
    }

    static async create(
        code: string,
        name: string,
        description: string | null
    ) {
        if (!code || !name) {
            throw new AppError(400, "Invalid request");
        }

        const existing =
            await CourseRepository.findByCode(code);

        if (existing) {
            throw new AppError(409, "Course code already in use");
        }

        return CourseRepository.create(
            code,
            name,
            description
        );
    }

    static async update(
        id: number,
        code: string,
        name: string,
        description: string | null
    ) {
        const course =
            await CourseRepository.findById(id);

        if (!course) {
            throw new AppError(404, "Course not found");
        }

        const existing =
            await CourseRepository.findByCode(code);

        if (existing && existing.id !== id) {
            throw new AppError(409, "Course code already in use");
        }

        return CourseRepository.update(
            id,
            code,
            name,
            description
        );
    }

    static async delete(id: number) {
        const course =
            await CourseRepository.findById(id);

        if (!course) {
            throw new AppError(404, "Course not found");
        }

        const examCount =
            await CourseRepository.countExams(id);

        if (examCount > 0) {
            throw new AppError(
                409,
                "Cannot delete a course that has exams"
            );
        }

        await CourseRepository.delete(id);
    }
}