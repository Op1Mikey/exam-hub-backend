import { Router } from "express";
import {
    requireAuth,
    requireRole,
} from "../middlewares/auth";
import { StudentController } from "../controllers/studentController";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/", StudentController.getAll);
router.post("/", StudentController.create);
router.put("/:id", StudentController.update);
router.delete("/:id", StudentController.deactivate);

export default router;