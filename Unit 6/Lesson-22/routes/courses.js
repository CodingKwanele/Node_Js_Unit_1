// routes/courses.js
import express from "express";
import courseController from "../controllers/courseController.js";
const router = express.Router();

router.get("/courses", courseController.showCourses);
router.get("/courses/new", courseController.showCreateCourseForm);
router.post("/courses", courseController.createCourse);
router.get("/courses/:id/edit", courseController.showEditCourseForm);
router.post("/courses/:id", courseController.updateCourse);
router.post("/courses/:id/delete", courseController.deleteCourse);

export default router;
