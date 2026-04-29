/**
 * Upload API Route
 * POST /api/upload - accepts xlsx file and persists to database
 */
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { parseUploadedXlsx } from "../services/xlsxParser.js";
import { calcRelevance, relevanceToTier } from "../services/settlementCalc.js";
import { requireAdmin } from "../middleware/auth.js";

// Configure multer for file uploads — use /tmp for temp files (works on all platforms incl. Fly.io)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "/tmp/geo-uploads";
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".xlsx" || ext === ".xls") {
      cb(null, true);
    } else {
      cb(new Error("Only xlsx files are allowed"), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export default function createUploadRouter(db) {
  const router = express.Router();

  /**
   * POST /api/upload
   * Upload xlsx file and persist data to database
   */
  router.post("/", requireAdmin, upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      // Parse the uploaded xlsx file
      const parsedData = parseUploadedXlsx(req.file.path);

      // Extract month from check_date (first record)
      let month = null;
      if (parsedData.recommend.records.length > 0) {
        month = parsedData.recommend.records[0].check_date.substring(0, 7);
      } else if (parsedData.compare.records.length > 0) {
        month = parsedData.compare.records[0].check_date.substring(0, 7);
      } else if (parsedData.sentiment.records.length > 0) {
        month = parsedData.sentiment.records[0].check_date.substring(0, 7);
      }

      if (!month) {
        // Cleanup uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Could not determine month from data" });
      }

      // Use transaction for data persistence
      const insertKeyword = db.prepare(`
        INSERT INTO keywords (word_type, word_root, word, platform, tier, month)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const insertRecord = db.prepare(`
        INSERT INTO monitoring_records (keyword_id, check_date, is_exposed, favor_zhiji, sentiment, screenshot_code, remark)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const insertRelevance = db.prepare(`
        INSERT INTO relevance_scores (keyword_id, month, product_fit, natural_rate, relevance)
        VALUES (?, ?, ?, ?, ?)
      `);

      const deleteKeywords = db.prepare(`DELETE FROM keywords WHERE month = ?`);

      // Run everything in a transaction
      const persistData = db.transaction(() => {
        // Clear existing data for this month
        deleteKeywords.run(month);

        // Insert recommend keywords and records
        for (const rec of parsedData.recommend.records) {
          const keywordId = insertKeyword.run(
            "推荐词",
            rec.word_root,
            rec.word,
            rec.platform,
            null, // tier is calculated from relevance
            month
          ).lastInsertRowid;

          insertRecord.run(
            keywordId,
            rec.check_date,
            rec.is_exposed ? 1 : 0,
            null, // favor_zhiji not applicable for recommend
            null, // sentiment not applicable for recommend
            rec.screenshot_code || null,
            rec.remark || null
          );
        }

        // Insert compare keywords and records
        for (const rec of parsedData.compare.records) {
          const keywordId = insertKeyword.run(
            "对比词",
            rec.word_root,
            rec.word,
            rec.platform,
            rec.tier || null,
            month
          ).lastInsertRowid;

          insertRecord.run(
            keywordId,
            rec.check_date,
            null, // is_exposed not applicable for compare
            rec.favor_zhiji ? 1 : 0,
            null, // sentiment not applicable for compare
            rec.screenshot_code || null,
            rec.remark || null
          );
        }

        // Insert sentiment keywords and records
        for (const rec of parsedData.sentiment.records) {
          const keywordId = insertKeyword.run(
            "舆情词",
            rec.word_root,
            rec.word,
            rec.platform,
            rec.tier_type || null,
            month
          ).lastInsertRowid;

          insertRecord.run(
            keywordId,
            rec.check_date,
            null, // is_exposed not applicable for sentiment
            null, // favor_zhiji not applicable for sentiment
            rec.sentiment || null,
            rec.screenshot_code || null,
            rec.remark || null
          );
        }

        // Insert relevance scores for recommend keywords
        // Group by word_root + platform and find matching keyword
        for (const rel of parsedData.recommend.relevance) {
          // Find keyword matching this word_root + platform
          const keyword = db
            .prepare(
              `SELECT id FROM keywords
               WHERE word_root = ? AND platform = ? AND word_type = '推荐词' AND month = ?`
            )
            .get(rel.word_root, rel.platform, month);

          if (keyword) {
            // Calculate relevance using the formula
            const relevance = calcRelevance(rel.product_fit, rel.natural_rate);
            const tier = relevanceToTier(relevance);

            insertRelevance.run(keyword.id, month, rel.product_fit, rel.natural_rate, relevance);

            // Update keyword tier based on relevance
            db.prepare(`UPDATE keywords SET tier = ? WHERE id = ?`).run(tier, keyword.id);
          }
        }
      });

      persistData();

      // Cleanup uploaded file
      fs.unlinkSync(req.file.path);

      // Return success response
      res.json({
        success: true,
        month,
        counts: {
          recommend: parsedData.recommend.records.length,
          compare: parsedData.compare.records.length,
          sentiment: parsedData.sentiment.records.length,
          relevance: parsedData.recommend.relevance.length,
        },
      });
    } catch (error) {
      // Cleanup uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      console.error("Upload error:", error);

      res.status(500).json({ error: "Failed to process upload" });
    }
  });

  // Error handling middleware for multer errors
  router.use((err, req, res, next) => {
    if (err.message === "Only xlsx files are allowed") {
      return res.status(400).json({ error: "Invalid file type. Only xlsx files are allowed" });
    }

    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File too large. Maximum size is 10MB" });
    }

    console.error("Upload middleware error:", err);
    res.status(500).json({ error: "Upload failed" });
  });

  return router;
}