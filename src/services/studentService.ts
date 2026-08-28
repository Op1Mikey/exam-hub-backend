import bcrypt from "bcrypt";
import { AppError } from "../middleware/errorHandler";
import { StudentRepository } from "../repositories/studentRepository";

export class StudentService {
    static async getAll() {
        return StudentRepository.findAll();
    }

    static async create(
        name: string,
        email: string,
        password: string
    ) {
        if (!name || !email || !password) {
            throw new AppError(400, "Invalid request");
        }

        const existing = await StudentRepository.findUserByEmail(email);

        if (existing) {
            throw new AppError(409, "Email already in use");
        }

        const passwordHash = await bcrypt.hash(password, 10);

        return StudentRepository.create(
            name,
            email,
            passwordHash
        );
    }

    static async update(
        id: number,
        name: string,
        email: string,
        isActive: boolean,
        password?: string
    ) {
        if (!name || !email) {
            throw new AppError(400, "Invalid request");
        }

        const student = await StudentRepository.findById(id);

        if (!student) {
            throw new AppError(404, "Student not found");
        }

        const existing = await StudentRepository.findUserByEmail(email);

        if (existing && existing.id !== id) {
            throw new AppError(409, "Email already in use");
        }

        let passwordHash: string | undefined;

        if (password !== undefined) {
            passwordHash = await bcrypt.hash(password, 10);
        }

        const updated = await StudentRepository.update(
            id,
            name,
            email,
            isActive,
            passwordHash
        );

        return updated;
    }

    static async deactivate(id: number) {
        const student = await StudentRepository.deactivate(id);

        if (!student) {
            throw new AppError(404, "Student not found");
        }

        return student;
    }
}