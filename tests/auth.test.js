import { describe, test, expect, beforeAll, afterAll } from "@jest/globals";
import express from "express";
import request from "supertest";
import { requireAuth, requireAdmin } from "../server/middleware/auth.js";

function createApp() {
  const app = express();

  app.get("/public", requireAuth, (req, res) => {
    res.json({ role: req.authRole });
  });

  app.post("/admin-only", requireAdmin, (_req, res) => {
    res.json({ ok: true });
  });

  return app;
}

describe("Auth middleware", () => {
  const OLD_ENV = process.env;

  beforeAll(() => {
    process.env.ADMIN_TOKEN = "test-admin";
    process.env.VIEW_TOKEN = "test-view";
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test("rejects request without token", async () => {
    const app = createApp();
    const res = await request(app).get("/public");
    expect(res.status).toBe(401);
  });

  test("accepts admin token", async () => {
    const app = createApp();
    const res = await request(app).get("/public?token=test-admin");
    expect(res.status).toBe(200);
  });

  test("accepts view token for GET", async () => {
    const app = createApp();
    const res = await request(app).get("/public?token=test-view");
    expect(res.status).toBe(200);
  });

  test("rejects view token for admin-only route", async () => {
    const app = createApp();
    const res = await request(app).post("/admin-only?token=test-view");
    expect(res.status).toBe(403);
  });

  test("allows admin token for admin-only route", async () => {
    const app = createApp();
    const res = await request(app).post("/admin-only?token=test-admin");
    expect(res.status).toBe(200);
  });
});