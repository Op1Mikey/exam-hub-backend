import "dotenv/config";
import express from "express";
import pool from "./config/db";

const app = express();
app.use(express.json());

// Test connexion DB au démarrage
pool.query("SELECT NOW()").then(() => {
  console.log("✅ Base de données accessible");
}).catch((err: Error) => {
  console.error("❌ Impossible de contacter la DB :", err.message);
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Exam Hub API démarrée sur le port ${PORT}`);
});