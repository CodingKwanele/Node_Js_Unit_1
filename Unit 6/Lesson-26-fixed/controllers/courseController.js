/**
 * Course Controller
 * Handles all CRUD operations for courses.
 * Author: Kwanele Dladla
 */

import mongoose from "mongoose";
import Course from "../models/course.js";

/* ------------------------------- Helpers ---------------------------------- */
const isValidZaPostal = (v) => /^\d{4}$/.test(String(v || "").trim());

const guardId = (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    res.status(404).render("error", { message: "Invalid course ID." });
    return false;
  }
  return true;
};

// Parse comma, newline, or JSON array input safely
const parseItems = (input) => {
  if (!input) return [];
  try {
    if (/^\[.*\]$/.test(input)) {
      const arr = JSON.parse(input);
      if (Array.isArray(arr)) return [...new Set(arr.map((i) => i.trim()))].slice(0, 100);
    }
  } catch {
    /* fallback */
  }
  return [...new Set(input.split(/[\n,]+/).map((i) => i.trim()).filter(Boolean))].slice(0, 100);
};

/* ------------------------------- Actions ---------------------------------- */

// GET /courses?q=&page=&limit=
const showCourses = async (req, res) => {
  try {
    const q = req.query.q?.trim() || "";
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "25", 10), 1), 100);
    const skip = (page - 1) * limit;

    const query = q ? {
      $or: [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ],
    } : {};

    const [courses, total] = await Promise.all([
      Course.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Course.countDocuments(query),
    ]);

    res.render("courses", {
      courses,
      search: q,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    });
  } catch (err) {
    console.error("Error loading courses:", err);
    res.status(500).render("error", { message: "Failed to load courses." });
  }
};

// GET /courses/new
const showCreateCourseForm = (req, res) =>
  res.render("course_new", { errors: {}, values: { title: "", description: "", zipCode: "", items: "" } });

// POST /courses
const createCourse = async (req, res, next) => {
  try {
    const { title = "", description = "", zipCode = "", items = "" } = req.body;
    const errors = {};
    if (!title.trim()) errors.title = "Title is required.";
    if (!description.trim()) errors.description = "Description is required.";
    if (zipCode && !isValidZaPostal(zipCode)) errors.zipCode = "Postal code must be 4 digits (ZA).";

    if (Object.keys(errors).length)
      return res.status(400).render("course_new", { errors, values: req.body });

    const dup = await Course.exists({ title });
    if (dup) {
      req.flash("error", "A course with this title already exists.");
      res.locals.redirect = "/courses/new";
      return next();
    }

    await Course.create({
      title: title.trim(),
      description: description.trim(),
      zipCode: zipCode ? Number(zipCode) : undefined,
      items: parseItems(items),
    });

    req.flash("success", `Course "${title}" created successfully.`);
    res.locals.redirect = "/courses";
    return next();
  } catch (error) {
    console.error("Create error:", error);
    req.flash("error", "Failed to create course.");
    res.locals.redirect = "/courses/new";
    return next();
  }
};

// GET /courses/:id/edit
const showEditCourseForm = async (req, res) => {
  if (!guardId(req, res)) return;
  try {
    const course = await Course.findById(req.params.id).lean();
    if (!course) return res.status(404).render("error", { message: "Course not found." });
    res.render("course_edit", {
      errors: {},
      values: { ...course, items: (course.items || []).join(", ") },
      id: course._id,
    });
  } catch (err) {
    console.error("Error loading course:", err);
    res.status(500).render("error", { message: "Failed to load course." });
  }
};

// PUT /courses/:id
const updateCourse = async (req, res, next) => {
  if (!guardId(req, res)) return;
  try {
    const { title, description, zipCode, items } = req.body;
    const course = await Course.findById(req.params.id);
    if (!course) {
      req.flash("error", "Course not found.");
      res.locals.redirect = "/courses";
      return next();
    }

    Object.assign(course, {
      title: title?.trim(),
      description: description?.trim(),
      zipCode: zipCode ? Number(zipCode) : undefined,
      items: parseItems(items),
    });

    await course.save();
    req.flash("success", `Course "${title}" updated successfully.`);
    res.locals.redirect = "/courses";
    return next();
  } catch (err) {
    console.error("Update error:", err);
    req.flash("error", "Failed to update course.");
    res.locals.redirect = "/courses";
    return next();
  }
};

// DELETE /courses/:id
const deleteCourse = async (req, res, next) => {
  if (!guardId(req, res)) return;
  try {
    const deleted = await Course.findByIdAndDelete(req.params.id);
    req.flash(deleted ? "success" : "error", deleted ? "Course deleted." : "Course not found.");
    res.locals.redirect = "/courses";
    next();
  } catch (err) {
    console.error("Delete error:", err);
    req.flash("error", "Failed to delete course.");
    res.locals.redirect = "/courses";
    next();
  }
};

// Shared redirect helper
const redirectView = (req, res, next) => {
  if (res.locals.redirect) return res.redirect(res.locals.redirect);
  next();
};

export default {
  showCourses,
  showCreateCourseForm,
  createCourse,
  showEditCourseForm,
  updateCourse,
  deleteCourse,
  redirectView,
};
