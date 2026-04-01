import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { initDatabase } from "./db/init.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "../data/geo.db");
const db = initDatabase(DB_PATH);

const app = express();
const PORT = process.env.PORT || 3001;

app.locals.db = db;

app.use(cors());
app.use(express.json());

// Serve static frontend in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/dist")));
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`GEO Dashboard server running on port ${PORT}`);
});

export default app;