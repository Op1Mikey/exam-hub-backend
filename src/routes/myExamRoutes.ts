import { Router } from "express";
import {
    requireAuth,
    requireRole,
} from "../middlewares/auth";
import { MyExamController } from "../controllers/myExamController";

const router = Router();

router.use(
    requireAuth,
    requireRole("student")
);

router.get(
    "/exams",
    MyExamController.getAvailable
);

router.get(
    "/exams/:id",
    MyExamController.getExam
);

router.post(
    "/exams/:id/submit",
    MyExamController.submit
);

router.get(
    "/results",
    MyExamController.getHistory
);

export default router;