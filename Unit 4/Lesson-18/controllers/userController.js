// controllers/userController.js
import mongoose from "mongoose";
import User from "../models/user.js";
import Subscriber from "../models/subscribers.js";
import Course from "../models/course.js";

// GET /users — list with subscriber & course counts
const showUsers = async (req, res) => {
  try {
    const users = await User.find()
      .populate({ path: "subscriberAccount", select: "email" })
      .populate({ path: "courses", select: "title" })
      .sort({ createdAt: -1 })
      .lean();

    res.render("users", { users });
  } catch (e) {
    console.error(e);
    res.status(500).render("error", { message: "Failed to load users." });
  }
};

// GET /users/new — create form
const showCreateUserForm = (req, res) => {
  res.render("user_new", {
    errors: {},
    values: { first: "", last: "", email: "", zipCode: "", password: "" }
  });
};

// POST /users — create
const createUser = async (req, res) => {
  try {
    let { first = "", last = "", email = "", zipCode = "", password = "" } = req.body;
    first = String(first).trim();
    last = String(last).trim();
    email = String(email).trim().toLowerCase();
    zipCode = String(zipCode).trim();
    password = String(password);

    const errors = {};
    if (!first) errors.first = "First name is required.";
    if (!last) errors.last = "Last name is required.";
    if (!email) errors.email = "Email is required.";
    if (!password || password.length < 6) errors.password = "Password must be at least 6 characters.";
    if (zipCode && !/^\d{5}$/.test(zipCode)) errors.zipCode = "Zip code must be 5 digits.";
    if (Object.keys(errors).length) {
      return res.status(400).render("user_new", {
        errors,
        values: { first, last, email, zipCode, password: "" }
      });
    }

    // create user
    const user = await User.create({
      name: { first, last },
      email,
      zipCode: zipCode ? Number(zipCode) : undefined,
      password
    });

    // optional: auto-link subscriber if email matches
    const sub = await Subscriber.findOne({ email });
    if (sub) {
      user.subscriberAccount = sub._id;
      await user.save();
    }

    return res.redirect("/users");
  } catch (e) {
    console.error(e);
    if (e?.code === 11000) {
      return res.status(409).render("user_new", {
        errors: { email: "A user with this email already exists." },
        values: { ...req.body, password: "" }
      });
    }
    return res.status(500).render("user_new", {
      errors: { _general: "Unexpected error. Please try again." },
      values: { ...req.body, password: "" }
    });
  }
};

// GET /users/:id/edit — edit form
const showEditUserForm = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) return res.status(404).render("error", { message: "User not found." });

    return res.render("user_edit", {
      errors: {},
      values: {
        first: user.name?.first ?? "",
        last: user.name?.last ?? "",
        email: user.email,
        zipCode: user.zipCode ?? "",
        password: "" // never preload
      },
      id: user._id
    });
  } catch (e) {
    console.error(e);
    return res.status(500).render("error", { message: "Failed to load user." });
  }
};

// POST /users/:id — update
const updateUser = async (req, res) => {
  try {
    let { first = "", last = "", email = "", zipCode = "", password = "" } = req.body;
    first = String(first).trim();
    last = String(last).trim();
    email = String(email).trim().toLowerCase();
    zipCode = String(zipCode).trim();

    const updates = {
      name: { first, last },
      email,
      zipCode: zipCode ? Number(zipCode) : undefined
    };

    if (password) {
      if (password.length < 6) {
        return res.status(400).render("user_edit", {
          errors: { password: "Password must be at least 6 characters." },
          values: { ...req.body, password: "" },
          id: req.params.id
        });
      }
      updates.password = password;
    }

    await User.findByIdAndUpdate(req.params.id, updates, {
      runValidators: true,
      context: "query"
    });

    return res.redirect("/users");
  } catch (e) {
    console.error(e);
    if (e?.code === 11000) {
      return res.status(409).render("user_edit", {
        errors: { email: "A user with this email already exists." },
        values: { ...req.body, password: "" },
        id: req.params.id
      });
    }
    return res.status(500).render("user_edit", {
      errors: { _general: "Unexpected error. Please try again." },
      values: { ...req.body, password: "" },
      id: req.params.id
    });
  }
};

// POST /users/:id/delete — delete
const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    return res.redirect("/users");
  } catch (e) {
    console.error(e);
    return res.status(500).render("error", { message: "Failed to delete user." });
  }
};

// POST /users/:id/link-course — add a course to a user (atomic)
const linkCourse = async (req, res) => {
  try {
    const { courseId } = req.body;

    // Quick ID validation prevents CastError
    if (!mongoose.isValidObjectId(courseId)) {
      return res.status(400).render("error", { message: "Invalid course id." });
    }

    const course = await Course.findById(courseId).lean();
    if (!course) return res.status(404).render("error", { message: "Course not found." });

    await User.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { courses: course._id } }, // atomic, avoids duplicates
      { runValidators: true, context: "query" }
    );

    return res.redirect("/users");
  } catch (e) {
    console.error(e);
    return res.status(500).render("error", { message: "Failed to link course." });
  }
};

// POST /users/:id/link-subscriber — link subscriber by email (atomic)
const linkSubscriberByEmail = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).render("error", { message: "Subscriber email is required." });
    }

    const sub = await Subscriber.findOne({ email }).lean();
    if (!sub) return res.status(404).render("error", { message: "Subscriber not found." });

    await User.findByIdAndUpdate(
      req.params.id,
      { $set: { subscriberAccount: sub._id } },
      { runValidators: true, context: "query" }
    );

    return res.redirect("/users");
  } catch (e) {
    console.error(e);
    return res.status(500).render("error", { message: "Failed to link subscriber." });
  }
};

export default {
  showUsers,
  showCreateUserForm,
  createUser,
  showEditUserForm,
  updateUser,
  deleteUser,
  linkCourse,
  linkSubscriberByEmail,
};
