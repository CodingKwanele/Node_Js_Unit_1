// controllers/courseController.js
import Course from "../models/course.js";

const showCourses = async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 }).lean();
    res.render("courses", { courses });
  } catch (e) {
    console.error(e);
    res.status(500).render("error", { message: "Failed to load courses." });
  }
};

const showCreateCourseForm = (req, res) => {
  res.render("course_new", { errors: {}, values: { title: "", description: "", zipCode: "", items: "" } });
};

const createCourse = async (req, res) => {
  try {
    let { title = "", description = "", zipCode = "", items = "" } = req.body;
    title = String(title).trim();
    description = String(description).trim();
    zipCode = String(zipCode).trim();
    const itemsArr = String(items)
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    const errors = {};
    if (!title) errors.title = "Title is required.";
    if (!description) errors.description = "Description is required.";
    if (zipCode && !/^\d{5}$/.test(zipCode)) errors.zipCode = "Zip code must be 5 digits.";

    if (Object.keys(errors).length) {
      return res.status(400).render("course_new", { errors, values: { title, description, zipCode, items } });
    }

    await Course.create({
      title,
      description,
      zipCode: zipCode ? Number(zipCode) : undefined,
      items: itemsArr
    });

    res.redirect("/courses");
  } catch (e) {
    console.error(e);
    if (e?.code === 11000) {
      return res.status(409).render("course_new", {
        errors: { title: "A course with this title already exists." },
        values: req.body
      });
    }
    res.status(500).render("course_new", {
      errors: { _general: "Unexpected error. Please try again." },
      values: req.body
    });
  }
};

const showEditCourseForm = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).lean();
    if (!course) return res.status(404).render("error", { message: "Course not found." });

    res.render("course_edit", {
      errors: {},
      values: {
        title: course.title,
        description: course.description,
        zipCode: course.zipCode ?? "",
        items: (course.items || []).join(", "),
      },
      id: course._id
    });
  } catch (e) {
    console.error(e);
    res.status(500).render("error", { message: "Failed to load course." });
  }
};

const updateCourse = async (req, res) => {
  try {
    let { title = "", description = "", zipCode = "", items = "" } = req.body;
    title = String(title).trim();
    description = String(description).trim();
    zipCode = String(zipCode).trim();
    const itemsArr = String(items).split(",").map(s => s.trim()).filter(Boolean);

    const errors = {};
    if (!title) errors.title = "Title is required.";
    if (!description) errors.description = "Description is required.";
    if (zipCode && !/^\d{5}$/.test(zipCode)) errors.zipCode = "Zip code must be 5 digits.";
    if (Object.keys(errors).length) {
      return res.status(400).render("course_edit", { errors, values: { title, description, zipCode, items }, id: req.params.id });
    }

    await Course.findByIdAndUpdate(req.params.id, {
      title, description, zipCode: zipCode ? Number(zipCode) : undefined, items: itemsArr
    });

    res.redirect("/courses");
  } catch (e) {
    console.error(e);
    if (e?.code === 11000) {
      return res.status(409).render("course_edit", {
        errors: { title: "A course with this title already exists." },
        values: req.body,
        id: req.params.id
      });
    }
    res.status(500).render("course_edit", {
      errors: { _general: "Unexpected error. Please try again." },
      values: req.body,
      id: req.params.id
    });
  }
};

const deleteCourse = async (req, res) => {
  try {
    await Course.findByIdAndDelete(req.params.id);
    res.redirect("/courses");
  } catch (e) {
    console.error(e);
    res.status(500).render("error", { message: "Failed to delete course." });
  }
};

export default {
  showCourses,
  showCreateCourseForm,
  createCourse,
  showEditCourseForm,
  updateCourse,
  deleteCourse,
};
