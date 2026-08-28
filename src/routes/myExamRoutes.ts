import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  listAvailableExams,
  getExamDetail,
  submitExam,
  getMyResults,
} from '../controllers/myExamController';

const router = Router();

router.use(requireAuth);
router.use(requireRole('student'));

router.get('/exams', listAvailableExams);
router.get('/exams/:id', getExamDetail);
router.post('/exams/:id/submit', submitExam);
router.get('/results', getMyResults);

export default router;