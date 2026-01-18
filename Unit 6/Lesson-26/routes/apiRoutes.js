import express from "express";
import courseController from "../controllers/courseController.js";

const router = express.Router();

// GET /api/courses – list courses for modal (JSON)
router.get(
  "/courses",
  courseController.apiIndex,
  courseController.filterUserCourses,
  courseController.respondJSON
);

// GET /api/courses/:id/join – join course
router.get(
  "/courses/:id/join",
  courseController.join,
  courseController.respondJSON
);

// GET /api/health - health check
router.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

// API error handler
router.use(courseController.errorJSON);

export default router;