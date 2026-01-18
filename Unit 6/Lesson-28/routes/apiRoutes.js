// routes/apiRoutes.js
// All /api routes that return JSON

import express from "express";
import userController from "../controllers/userController.js";
import courseController from "../controllers/courseController.js";

const router = express.Router();

/* -----------------------------
   AUTH (JSON)
------------------------------ */

// POST /api/authenticate — returns JWT + user info (JSON)
router.post("/authenticate", userController.apiAuthenticate);

/* -----------------------------
   COURSES (JSON for modal + actions)
------------------------------ */

// GET /api/courses — list courses for modal (JSON)
// Protected by JWT (e.g., Authorization: Bearer <token>)
router.get(
  "/courses",
  userController.verifyJWT,
  courseController.apiIndex,
  courseController.filterUserCourses,
  courseController.respondJSON
);

// GET /api/courses/:id/join — join course (JSON)
router.get(
  "/courses/:id/join",
  userController.verifyJWT,
  courseController.join,
  courseController.respondJSON
);

/* -----------------------------
   HEALTH CHECK
------------------------------ */

// GET /api/health — quick API heartbeat (JSON)
router.get("/health", (_req, res) => {
  return res.json({
    success: true,
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

/* -----------------------------
   API ERROR HANDLER (must be last)
------------------------------ */

router.use(courseController.errorJSON);

export default router;
