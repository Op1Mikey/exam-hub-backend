import { Router } from "express";
import {
    requireAuth,
    requireRole,
} from "../middlewares/auth";
import { ExamController } from "../controllers/examController";
import { QuestionController } from "../controllers/questionController";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/", ExamController.getAll);
router.post("/", ExamController.create);

router.get("/:id", ExamController.getById);
router.put("/:id", ExamController.update);
router.delete("/:id", ExamController.delete);

router.get(
    "/:id/questions",
    QuestionController.getByExam
);

router.post(
    "/:id/questions",
    QuestionController.create
);

router.get(
    "/:id/results",
    ExamController.getResults
);

export default router;