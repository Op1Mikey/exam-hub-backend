import { Router } from "express";
import {
    requireAuth,
    requireRole,
} from "../middleware/auth";
import { CourseController } from "../controllers/courseController";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/", CourseController.getAll);
router.post("/", CourseController.create);
router.put("/:id", CourseController.update);
router.delete("/:id", CourseController.delete);

export default router;