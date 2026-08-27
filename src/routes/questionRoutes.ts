import { Router } from "express";
import {
    requireAuth,
    requireRole,
} from "../middlewares/auth";
import { QuestionController } from "../controllers/questionController";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.put(
    "/questions/:id",
    QuestionController.update
);

router.delete(
    "/questions/:id",
    QuestionController.delete
);

export default router;