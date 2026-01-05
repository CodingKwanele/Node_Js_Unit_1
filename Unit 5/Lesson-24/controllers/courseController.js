/**
 * @author: Kwanele Dladla
 * @description: Controller functions for managing courses with full CRUD operations.
 * Flash + redirect middleware, ZA postal validation, id guards, robust items parsing.
 */

import mongoose from "mongoose";
import Course from "../models/course.js";

/* ------------------------------- helpers ---------------------------------- */

const isValidZaPostal = (v) => /^\d{4}$/.test(String(v || "").trim());

const guardId = (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    res.status(404).render("error", { message: "Not found." });
    return false;
  }
  return true;
};

const parseItems = (input) => {
  if (!input) return [];
  const raw = String(input).trim();

  // Accept JSON array if provided
  if ((raw.startsWith("[") && raw.endsWith("]")) || (raw.startsWith('"') && raw.endsWith('"'))) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return [...new Set(parsed.map((s) => String(s).trim()).filter(Boolean))];
      }
    } catch (_) {
      /* fall through to text parsing */
    }
  }

  // Fallback: split by comma or newline
  return [
    ...new Set(
      raw
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  ];
};

/* --------------------------------- actions -------------------------------- */

// GET /courses — list all courses
const showCourses = async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 }).lean();
    // If your EJS expects offeredCourses, use: res.render("courses", { offeredCourses: courses });
    res.render("courses", { courses });
  } catch (error) {
    console.error("Error retrieving courses:", error);
    res.status(500).render("error", { message: "Failed to load courses." });
  }
};

// GET /courses/new — show create form
const showCreateCourseForm = (req, res) => {
  res.render("course_new", {
    errors: {},
    values: { title: "", description: "", zipCode: "", items: "" },
  });
};

// POST /courses — create new course
const createCourse = async (req, res, next) => {
  try {
    let { title = "", description = "", zipCode = "", items = "" } = req.body;
    title = String(title).trim();
    description = String(description).trim();
    zipCode = String(zipCode).trim();
    const itemsArr = parseItems(items);

    const errors = {};
    if (!title) errors.title = "Title is required.";
    if (!description) errors.description = "Description is required.";
    if (zipCode && !isValidZaPostal(zipCode)) errors.zipCode = "Postal code must be 4 digits (ZA).";

    if (Object.keys(errors).length) {
      return res.status(400).render("course_new", {
        errors,
        values: { title, description, zipCode, items },
      });
    }

    await Course.create({
      title,
      description,
      zipCode: zipCode ? Number(zipCode) : undefined,
      items: itemsArr,
    });

    req.flash("success", `Course "${title}" created successfully!`);
    res.locals.redirect = "/courses";
    return next();
  } catch (error) {
    console.error("Error creating course:", error);
    if (error?.code === 11000) {
      req.flash("error", "A course with this title already exists.");
      res.locals.redirect = "/courses/new";
      return next();
    }
    req.flash("error", "Failed to create course. Please try again.");
    res.locals.redirect = "/courses/new";
    return next();
  }
};

// GET /courses/:id/edit — show edit form
const showEditCourseForm = async (req, res) => {
  if (!guardId(req, res)) return;
  try {
    const course = await Course.findById(req.params.id).lean();
    if (!course) {
      return res.status(404).render("error", { message: "Course not found." });
    }

    return res.render("course_edit", {
      errors: {},
      values: {
        title: course.title,
        description: course.description,
        zipCode: course.zipCode ?? "",
        items: (course.items || []).join(", "),
      },
      id: course._id,
    });
  } catch (error) {
    console.error("Error loading course:", error);
    return res.status(500).render("error", { message: "Failed to load course." });
  }
};

// POST /courses/:id — update course
const updateCourse = async (req, res, next) => {
  if (!guardId(req, res)) return;
  try {
    let { title = "", description = "", zipCode = "", items = "" } = req.body;
    title = String(title).trim();
    description = String(description).trim();
    zipCode = String(zipCode).trim();
    const itemsArr = parseItems(items);

    const errors = {};
    if (!title) errors.title = "Title is required.";
    if (!description) errors.description = "Description is required.";
    if (zipCode && !isValidZaPostal(zipCode)) errors.zipCode = "Postal code must be 4 digits (ZA).";

    if (Object.keys(errors).length) {
      return res.status(400).render("course_edit", {
        errors,
        values: { title, description, zipCode, items },
        id: req.params.id,
      });
    }

    const course = await Course.findById(req.params.id);
    if (!course) {
      req.flash("error", "Course not found.");
      res.locals.redirect = "/courses";
      return next();
    }

    course.title = title;
    course.description = description;
    course.zipCode = zipCode ? Number(zipCode) : undefined;
    course.items = itemsArr;

    await course.save();

    req.flash("success", `Course "${title}" updated successfully.`);
    res.locals.redirect = "/courses";
    return next();
  } catch (error) {
    console.error("Error updating course:", error);
    if (error?.code === 11000) {
      return res.status(409).render("course_edit", {
        errors: { title: "A course with this title already exists." },
        values: { ...req.body },
        id: req.params.id,
      });
    }
    req.flash("error", `Failed to update course: ${error.message}`);
    res.locals.redirect = "/courses";
    return next();
  }
};

// POST /courses/:id/delete — delete course
const deleteCourse = async (req, res, next) => {
  if (!guardId(req, res)) return;
  try {
    const deleted = await Course.findByIdAndDelete(req.params.id);
    if (!deleted) {
      req.flash("error", "Course not found.");
    } else {
      req.flash("success", "Course deleted successfully.");
    }
    res.locals.redirect = "/courses";
    return next();
  } catch (error) {
    console.error("Error deleting course:", error);
    req.flash("error", "Failed to delete course.");
    res.locals.redirect = "/courses";
    return next();
  }
};

// Redirect middleware (same as user controller)
const redirectView = (req, res, next) => {
  const redirectPath = res.locals.redirect;
  if (redirectPath) res.redirect(redirectPath);
  else next();
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
