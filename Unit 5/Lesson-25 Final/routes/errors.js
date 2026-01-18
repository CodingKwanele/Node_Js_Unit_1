// routes/errors.js
// Error preview and testing routes (mainly for development)

import express from "express";

const router = express.Router();

// Middleware: no caching for error pages
const noStore = (_req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
};

// Utility: detect API calls for proper response type
const isApiRequest = (req) => req.xhr || req.headers.accept?.includes("application/json");

/* -----------------------------------------
   ERROR PAGE PREVIEWS
----------------------------------------- */

// GET /errors/404 – Preview 404 template
router.get("/404", noStore, (req, res) => {
  if (isApiRequest(req)) return res.status(404).json({ error: "Not Found" });
  res.status(404).render("404", { title: "Not Found" });
});

// GET /errors/500 – Preview 500 template
router.get("/500", noStore, (req, res) => {
  if (isApiRequest(req)) return res.status(500).json({ error: "Server Error" });
  res.status(500).render("500", { title: "Server Error" });
});

// GET /errors/boom – Trigger a test error
router.get("/boom", noStore, (_req, _res, next) => {
  const error = new Error("💥 Boom! Test error triggered intentionally.");
  error.status = 500;
  next(error);
});

export default router;
