import mongoose from "mongoose";
import httpStatus from "http-status-codes";
import Course from "../models/course.js";
import User from "../models/user.js";

/**
 * Decide if the request prefers JSON.
 */
const wantsJson = (req) =>
  String(req.query.format || "").toLowerCase() === "json" ||
  req.accepts(["html", "json"]) === "json";

/**
 * Quick ZA postal validator (4 digits).
 * Note: your routes also use express-validator isPostalCode("ZA").
 */
const isValidZaPostal = (v) => /^\d{4}$/.test(String(v || "").trim());

/**
 * Guard for Mongo ObjectId params.
 * Returns false if invalid and sends response.
 */
const guardId = (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    if (wantsJson(req)) {
      res.status(404).json({ error: "Not Found" });
    } else {
      res.status(404).render("404", { title: "Not Found — My Recipe Web" });
    }
    return false;
  }
  return true;
};

/**
 * Parse "items" input into an array of strings.
 * Supports:
 *  - JSON array e.g. '["a","b"]'
 *  - Comma or newline separated values
 */
const parseItems = (input) => {
  if (!input) return [];
  const raw = String(input).trim();

  // Try JSON first
  if (
    (raw.startsWith("[") && raw.endsWith("]")) ||
    (raw.startsWith('"') && raw.endsWith('"'))
  ) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const arr = parsed
          .map((s) => String(s).trim())
          .filter(Boolean);
        return [...new Set(arr)].slice(0, 100);
      }
    } catch {
      // fall through to split mode
    }
  }

  // Fallback: split by comma / newline
  const split = raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return [...new Set(split)].slice(0, 100);
};

/* -------------------------------------------------------------------------- */
/* LIST (GET /courses) – HTML + legacy JSON (/courses?format=json)           */
/* -------------------------------------------------------------------------- */
export const showCourses = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "25", 10), 1),
      100
    );
    const skip = (page - 1) * limit;

    const query = q
      ? {
          $or: [
            { title: { $regex: q, $options: "i" } },
            { description: { $regex: q, $options: "i" } },
          ],
        }
      : {};

    const [courses, total] = await Promise.all([
      Course.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Course.countDocuments(query),
    ]);

    const payload = {
      courses,
      search: q,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    };

    if (wantsJson(req)) {
      return res.json(payload);
    }

    return res.render("courses", {
      title: "Courses — My Recipe Web",
      ...payload,
    });
  } catch (error) {
    console.error("Error retrieving courses:", error);
    if (wantsJson(req)) {
      return res.status(500).json({ error: "Failed to load courses." });
    }
    return res.status(500).render("500", {
      title: "Server Error — My Recipe Web",
      message: "Failed to load courses.",
    });
  }
};

/* -------------------------------------------------------------------------- */
/* API: LIST (GET /api/courses) – used by modal + join feature               */
/* -------------------------------------------------------------------------- */
export const apiIndex = async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "25", 10), 1),
      100
    );
    const skip = (page - 1) * limit;

    const query = q
      ? {
          $or: [
            { title: { $regex: q, $options: "i" } },
            { description: { $regex: q, $options: "i" } },
          ],
        }
      : {};

    const [courses, total] = await Promise.all([
      Course.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Course.countDocuments(query),
    ]);

    res.locals.courses = courses;
    res.locals.search = q;
    res.locals.pagination = {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    };

    return next();
  } catch (error) {
    console.error("Error retrieving courses (API):", error);
    return next(error);
  }
};

/* -------------------------------------------------------------------------- */
/* NEW (GET /courses/new)                                                     */
/* -------------------------------------------------------------------------- */
export const showCreateCourseForm = (req, res) => {
  if (wantsJson(req)) {
    return res.status(406).json({ error: "HTML form only" });
  }
  return res.render("course_new", {
    title: "New Course — My Recipe Web",
    errors: {},
    values: { title: "", description: "", zipCode: "", items: "" },
  });
};

/* -------------------------------------------------------------------------- */
/* CREATE (POST /courses)                                                     */
/* -------------------------------------------------------------------------- */
export const createCourse = async (req, res, next) => {
  try {
    let { title = "", description = "", zipCode = "", items = "" } = req.body;
    title = String(title).trim();
    description = String(description).trim();
    zipCode = String(zipCode).trim();
    const itemsArr = parseItems(items);

    const errors = {};
    if (!title) errors.title = "Title is required.";
    if (!description) errors.description = "Description is required.";
    if (zipCode && !isValidZaPostal(zipCode)) {
      errors.zipCode = "Postal code must be 4 digits (ZA).";
    }

    if (Object.keys(errors).length) {
      if (wantsJson(req)) {
        return res
          .status(400)
          .json({ error: "Validation failed", details: errors });
      }
      return res.status(400).render("course_new", {
        title: "New Course — My Recipe Web",
        errors,
        values: { title, description, zipCode, items },
      });
    }

    // Check for duplicate title
    const dup = await Course.exists({ title });
    if (dup) {
      if (wantsJson(req)) {
        return res.status(409).json({ error: "Duplicate title" });
      }
      req.flash("error", "A course with this title already exists.");
      res.locals.redirect = "/courses/new";
      return next();
    }

    const doc = await Course.create({
      title,
      description,
      zipCode: zipCode ? Number(zipCode) : undefined,
      items: itemsArr,
    });

    if (wantsJson(req)) {
      return res.status(201).json({ course: doc });
    }

    req.flash("success", `Course "${title}" created successfully!`);
    res.locals.redirect = "/courses";
    return next();
  } catch (error) {
    console.error("Error creating course:", error);

    if (error?.code === 11000) {
      // duplicate key
      if (wantsJson(req)) {
        return res.status(409).json({ error: "Duplicate title" });
      }
      req.flash("error", "A course with this title already exists.");
      res.locals.redirect = "/courses/new";
      return next();
    }

    if (wantsJson(req)) {
      return res.status(500).json({ error: "Failed to create course." });
    }

    req.flash("error", "Failed to create course. Please try again.");
    res.locals.redirect = "/courses/new";
    return next();
  }
};

/* -------------------------------------------------------------------------- */
/* EDIT (GET /courses/:id/edit)                                               */
/* -------------------------------------------------------------------------- */
export const showEditCourseForm = async (req, res) => {
  if (!guardId(req, res)) return;

  try {
    const course = await Course.findById(req.params.id).lean();
    if (!course) {
      if (wantsJson(req)) {
        return res.status(404).json({ error: "Course not found" });
      }
      return res
        .status(404)
        .render("404", { title: "Not Found — My Recipe Web" });
    }

    if (wantsJson(req)) {
      return res.json({ course });
    }

    return res.render("course_edit", {
      title: `Edit: ${course.title} — My Recipe Web`,
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
    if (wantsJson(req)) {
      return res.status(500).json({ error: "Failed to load course." });
    }
    return res.status(500).render("500", {
      title: "Server Error — My Recipe Web",
      message: "Failed to load course.",
    });
  }
};

/* -------------------------------------------------------------------------- */
/* UPDATE (PUT /courses/:id)                                                  */
/* -------------------------------------------------------------------------- */
export const updateCourse = async (req, res, next) => {
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
    if (zipCode && !isValidZaPostal(zipCode)) {
      errors.zipCode = "Postal code must be 4 digits (ZA).";
    }

    if (Object.keys(errors).length) {
      if (wantsJson(req)) {
        return res
          .status(400)
          .json({ error: "Validation failed", details: errors });
      }
      return res.status(400).render("course_edit", {
        title: `Edit: ${title || "Course"} — My Recipe Web`,
        errors,
        values: { title, description, zipCode, items },
        id: req.params.id,
      });
    }

    const course = await Course.findById(req.params.id);
    if (!course) {
      if (wantsJson(req)) {
        return res.status(404).json({ error: "Course not found" });
      }
      req.flash("error", "Course not found.");
      res.locals.redirect = "/courses";
      return next();
    }

    // Check duplicate title (excluding current doc)
    if (title) {
      const dup = await Course.exists({
        _id: { $ne: course._id },
        title,
      });
      if (dup) {
        if (wantsJson(req)) {
          return res.status(409).json({ error: "Duplicate title" });
        }
        return res.status(409).render("course_edit", {
          title: `Edit: ${title} — My Recipe Web`,
          errors: { title: "A course with this title already exists." },
          values: { title, description, zipCode, items },
          id: req.params.id,
        });
      }
    }

    course.title = title;
    course.description = description;
    course.zipCode = zipCode ? Number(zipCode) : undefined;
    course.items = itemsArr;

    const saved = await course.save();

    if (wantsJson(req)) {
      return res.json({ course: saved, message: "Updated" });
    }

    req.flash("success", `Course "${title}" updated successfully.`);
    res.locals.redirect = "/courses";
    return next();
  } catch (error) {
    console.error("Error updating course:", error);

    if (error?.code === 11000) {
      if (wantsJson(req)) {
        return res.status(409).json({ error: "Duplicate title" });
      }
      return res.status(409).render("course_edit", {
        title: "Edit Course — My Recipe Web",
        errors: { title: "A course with this title already exists." },
        values: { ...req.body },
        id: req.params.id,
      });
    }

    if (wantsJson(req)) {
      return res.status(500).json({ error: "Failed to update course" });
    }

    req.flash("error", `Failed to update course: ${error.message}`);
    res.locals.redirect = "/courses";
    return next();
  }
};

/* -------------------------------------------------------------------------- */
/* DELETE (DELETE /courses/:id)                                               */
/* -------------------------------------------------------------------------- */
export const deleteCourse = async (req, res, next) => {
  if (!guardId(req, res)) return;

  try {
    const deleted = await Course.findByIdAndDelete(req.params.id);

    if (wantsJson(req)) {
      return res.json({ deleted: Boolean(deleted) });
    }

    if (!deleted) {
      req.flash("error", "Course not found.");
    } else {
      req.flash("success", "Course deleted successfully.");
    }

    res.locals.redirect = "/courses";
    return next();
  } catch (error) {
    console.error("Error deleting course:", error);
    if (wantsJson(req)) {
      return res.status(500).json({ error: "Failed to delete course." });
    }
    req.flash("error", "Failed to delete course.");
    res.locals.redirect = "/courses";
    return next();
  }
};

/* -------------------------------------------------------------------------- */
/* JOIN COURSE (GET /api/courses/:id/join)                                    */
/* -------------------------------------------------------------------------- */
export const join = (req, res, next) => {
  const courseId = req.params.id;
  const currentUser = req.user;

  if (!currentUser) {
    return next(new Error("User must log in."));
  }

  if (!mongoose.isValidObjectId(courseId)) {
    return next(new Error("Invalid course id."));
  }

  User.findByIdAndUpdate(
    currentUser._id,
    { $addToSet: { courses: courseId } },
    { runValidators: true, context: "query" }
  )
    .then(() => {
      res.locals.success = true;
      return next();
    })
    .catch((error) => next(error));
};

/* -------------------------------------------------------------------------- */
/* FILTER COURSES FOR CURRENT USER (API)                                      */
/* -------------------------------------------------------------------------- */
export const filterUserCourses = (req, res, next) => {
  const currentUser = res.locals.currentUser;
  const courses = res.locals.courses || [];

  if (!currentUser || !Array.isArray(courses)) {
    return next();
  }

  const mappedCourses = courses.map((course) => {
    const joined = (currentUser.courses || []).some((userCourse) => {
      if (typeof userCourse?.equals === "function") {
        return userCourse.equals(course._id);
      }
      return String(userCourse) === String(course._id);
    });

    return { ...course, joined };
  });

  res.locals.courses = mappedCourses;
  return next();
};

/* -------------------------------------------------------------------------- */
/* JSON HELPERS FOR API                                                       */
/* -------------------------------------------------------------------------- */
export const respondJSON = (_req, res) => {
  res.json({
    status: httpStatus.OK,
    data: res.locals,
  });
};

export const errorJSON = (error, _req, res, _next) => {
  const errorObject = {
    status: httpStatus.INTERNAL_SERVER_ERROR,
    message: error?.message || "Unknown Error.",
  };

  res
    .status(httpStatus.INTERNAL_SERVER_ERROR)
    .json(errorObject);
};

/* -------------------------------------------------------------------------- */
/* redirectView: to be used at end of route chains                            */
/* -------------------------------------------------------------------------- */
export const redirectView = (req, res, next) => {
  const redirectPath = res.locals.redirect;
  if (redirectPath) {
    return res.redirect(redirectPath);
  }
  return next();
};

export default {
  showCourses,
  apiIndex,
  showCreateCourseForm,
  createCourse,
  showEditCourseForm,
  updateCourse,
  deleteCourse,
  join,
  filterUserCourses,
  respondJSON,
  errorJSON,
  redirectView,
};
