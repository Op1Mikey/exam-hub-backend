import { Request, Response, NextFunction } from 'express';
import * as service from '../services/myExamService';

// GET /api/my/exams
export async function listAvailableExams(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const studentId = (req as any).user.userId;
    const exams = await service.getAvailableExams(studentId);
    res.json(exams);
  } catch (err) {
    next(err);
  }
}

// GET /api/my/exams/:id
export async function getExamDetail(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const examId = parseInt(req.params.id, 10);
    if (isNaN(examId)) {
      res.status(400).json({ message: 'Invalid request data' });
      return;
    }
    const studentId = (req as any).user.userId;
    const exam = await service.getExamDetail(examId, studentId);
    res.json(exam);
  } catch (err: any) {
    if (err.status) {
      res.status(err.status).json({ message: err.message });
      return;
    }
    next(err);
  }
}

// POST /api/my/exams/:id/submit
export async function submitExam(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const examId = parseInt(req.params.id, 10);
    if (isNaN(examId)) {
      res.status(400).json({ message: 'Invalid request data' });
      return;
    }
    const studentId = (req as any).user.userId;
    const { answers } = req.body;

    if (!Array.isArray(answers)) {
      res.status(400).json({ message: 'Invalid request data' });
      return;
    }

    const result = await service.submitExam(examId, studentId, answers);
    res.status(201).json(result);
  } catch (err: any) {
    if (err.status) {
      res.status(err.status).json({ message: err.message });
      return;
    }
    next(err);
  }
}

// GET /api/my/results
export async function getMyResults(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const studentId = (req as any).user.userId;
    const results = await service.getMyResults(studentId);
    res.json(results);
  } catch (err) {
    next(err);
  }
}