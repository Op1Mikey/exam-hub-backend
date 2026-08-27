import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/authRoutes";
import studentRoutes from "./routes/studentRoutes";
import courseRoutes from "./routes/courseRoutes";
import examRoutes from "./routes/examRoutes";
import questionRoutes from "./routes/questionRoutes";
import myExamRoutes from "./routes/myExamRoutes";

import { errorHandler } from "./middlewares/errorHandler";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
    res.json({
        status: "ok",
    });
});

app.use(
    "/api/auth",
    authRoutes
);

app.use(
    "/api/students",
    studentRoutes
);

app.use(
    "/api/courses",
    courseRoutes
);

app.use(
    "/api/exams",
    examRoutes
);

app.use(
    "/api",
    questionRoutes
);

app.use(
    "/api/my",
    myExamRoutes
);

/*
 * 404 API
 */
app.use((_req, res) => {
    res.status(404).json({
        message: "Route not found",
    });
});

/*
 * Gestionnaire global
 * Toujours placé à la fin.
 */
app.use(errorHandler);

const PORT =
    Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
    console.log(
        `Exam Hub API démarrée sur http://localhost:${PORT}`
    );
});