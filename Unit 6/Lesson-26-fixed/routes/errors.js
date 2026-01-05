/**
 * /routes/errors.js
 * Preview and simulate error pages (404, 500, boom)
 */

import express from "express";

const router = express.Router();

// Disable caching for error previews
const noCache = (_req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
};

// Check if API request to send JSON instead of HTML
const isApiRequest = (req) => req.xhr || req.headers.accept?.includes("application/json");

// 404 Preview
router.get("/404", noCache, (req, res) => {
  if (isApiRequest(req)) return res.status(404).json({ error: "Not Found" });
  res.status(404).render("404", { title: "Not Found" });
});

// 500 Preview
router.get("/500", noCache, (req, res) => {
  if (isApiRequest(req)) return res.status(500).json({ error: "Server Error" });
  res.status(500).render("500", { title: "Server Error" });
});

// Boom route (intentional test error)
router.get("/boom", noCache, (_req, _res, next) => {
  const error = new Error("💥 Boom! Test error triggered intentionally.");
  error.status = 500;
  next(error);
});

export default router;
