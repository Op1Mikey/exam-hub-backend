import "dotenv/config";
import express from "express";
import pool from "./config/db";
import authRoutes from "./routes/authRoutes";
import { errorHandler } from "./middlewares/errorHandler";

const app = express();
app.use(express.json());

// Test connexion DB au démarrage
pool.query("SELECT NOW()").then(() => {
  console.log("✅ Base de données accessible");
}).catch((err: Error) => {
  console.error("Impossible de contacter la DB :", err.message);
});

// Routes
app.use("/api/auth", authRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Middleware d'erreurs (toujours en dernier)
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Exam Hub API démarrée sur le port ${PORT}`);
});