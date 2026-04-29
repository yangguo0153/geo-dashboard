import dotenv from "dotenv";
dotenv.config(); // no-op if .env missing in production
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { initDatabase } from "./db/init.js";
import { requireAuth } from "./middleware/auth.js";
import createOverviewRouter from "./routes/overview.js";
import createKeywordsRouter from "./routes/keywords.js";
import createSettlementRouter from "./routes/settlement.js";
import uploadRouter from "./routes/upload.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "../data/geo.db");
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

// Health check (no auth required)
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// API routes with auth
const apiRouter = express.Router();
apiRouter.use(requireAuth);

// Auth role check (returns current user's role)
apiRouter.get("/auth/role", (req, res) => {
  res.json({ role: req.authRole });
});

// Overview routes
const overviewRouter = createOverviewRouter(db);
apiRouter.get("/overview", (req, res) => {
  const handler = overviewRouter.get("GET /");
  return handler(req, res);
});

// Keywords routes
const keywordsRouter = createKeywordsRouter(db);
apiRouter.get("/keywords/recommend", (req, res) => {
  const handler = keywordsRouter.get("GET /recommend");
  return handler(req, res);
});
apiRouter.get("/keywords/compare", (req, res) => {
  const handler = keywordsRouter.get("GET /compare");
  return handler(req, res);
});
apiRouter.get("/keywords/sentiment", (req, res) => {
  const handler = keywordsRouter.get("GET /sentiment");
  return handler(req, res);
});

// Settlement route
const settlementRouter = createSettlementRouter(db);
apiRouter.get("/settlement", (req, res) => {
  const handler = settlementRouter.get("GET /");
  return handler(req, res);
});

// Upload route (uses its own auth + multer)
app.use("/api/upload", uploadRouter(db));

app.use("/api", apiRouter);

// Global error handler — catch anything that slips through
app.use((err, req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

// SPA catch-all - serve index.html for client-side routing in production
if (process.env.NODE_ENV === "production") {
  app.get("*", (_req, res) => {
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`GEO Dashboard server running on 0.0.0.0:${PORT}`);
  console.log(`DB_PATH: ${DB_PATH}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
});

export default app;