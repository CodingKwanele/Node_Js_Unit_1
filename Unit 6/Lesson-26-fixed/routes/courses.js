// routes/courses.js
// Course routes: list (public), create/update/delete (auth; optionally admin)

import express from "express";
import { body, param, query } from "express-validator";
import { ensureAuthenticated, ensureAdmin /* optional */ } from "../middlewares/auth.js";
import courseController from "../controllers/courseController.js";

const router = express.Router();

const validateId = [param("id").isMongoId().withMessage("Invalid course id")];
const validateIndexQuery = [
  query("q").optional().trim().isLength({ max: 100 }).withMessage("Query too long"),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
];

// LIST (PUBLIC)
router.get("/", validateIndexQuery, courseController.showCourses);

// CREATE (AUTH / or ensureAdmin if you need)
router.get("/new", ensureAuthenticated, courseController.showCreateCourseForm);
router.post(
  "/",
  ensureAuthenticated, // change to ensureAdmin if course creation is admin-only
  [
    body("title").trim().notEmpty().withMessage("Course title is required"),
    body("description").trim().notEmpty().withMessage("Course description is required"),
    body("zipCode").optional().isPostalCode("ZA").withMessage("Invalid postal code"),
  ],
  courseController.createCourse,
  courseController.redirectView
);

// EDIT / UPDATE / DELETE (AUTH / or ensureAdmin)
router.get("/:id/edit", ensureAuthenticated, validateId, courseController.showEditCourseForm);
router.put(
  "/:id",
  ensureAuthenticated,
  validateId,
  [
    body("title").optional().trim().notEmpty(),
    body("description").optional().trim().notEmpty(),
    body("zipCode").optional().isPostalCode("ZA").withMessage("Invalid postal code"),
  ],
  courseController.updateCourse,
  courseController.redirectView
);
router.delete("/:id", ensureAuthenticated, validateId, courseController.deleteCourse, courseController.redirectView);

export default router;
