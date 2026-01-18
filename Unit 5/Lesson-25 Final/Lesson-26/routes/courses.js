// routes/courses.js
import express from "express";
import { body, param, query, validationResult } from "express-validator";
import { ensureAuthenticated } from "../middlewares/auth.js";
import courseController from "../controllers/courseController.js";

const router = express.Router();

// helper to surface validation errors
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const wantsJson =
    String(req.query.format || "").toLowerCase() === "json" ||
    req.accepts(["html", "json"]) === "json";

  if (wantsJson) {
    return res.status(400).json({ errors: errors.array() });
  }

  req.flash("error", errors.array().map(e => e.msg).join(". "));
  res.locals.redirect = "back";
  return res.redirect("back");
};

/* ------------------ validators ------------------ */
const validateId = [
  param("id").isMongoId().withMessage("Invalid course id"),
];

const validateIndexQuery = [
  query("q").optional().trim().isLength({ max: 100 }).withMessage("Query too long"),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
];

/* ------------------ routes ------------------ */
// LIST (GET /courses)
router.get(
  "/",
  validateIndexQuery,
  handleValidation,
  courseController.showCourses
);

// CREATE FORM (GET /courses/new)
router.get(
  "/new",
  ensureAuthenticated,
  courseController.showCreateCourseForm
);

// CREATE (POST /courses)
router.post(
  "/",
  ensureAuthenticated,
  [
    body("title").trim().notEmpty().withMessage("Course title is required"),
    body("description").trim().notEmpty().withMessage("Course description is required"),
    body("zipCode").optional().isPostalCode("ZA").withMessage("Invalid postal code"),
  ],
  handleValidation,
  courseController.createCourse,
  courseController.redirectView
);

// EDIT FORM (GET /courses/:id/edit)
router.get(
  "/:id/edit",
  ensureAuthenticated,
  validateId,
  handleValidation,
  courseController.showEditCourseForm
);

// UPDATE (PUT /courses/:id)
router.put(
  "/:id",
  ensureAuthenticated,
  validateId,
  [
    body("title").optional().trim().notEmpty(),
    body("description").optional().trim().notEmpty(),
    body("zipCode").optional().isPostalCode("ZA").withMessage("Invalid postal code"),
  ],
  handleValidation,
  courseController.updateCourse,
  courseController.redirectView
);

// DELETE (DELETE /courses/:id)
router.delete(
  "/:id",
  ensureAuthenticated,
  validateId,
  handleValidation,
  courseController.deleteCourse,
  courseController.redirectView
);

export default router;
