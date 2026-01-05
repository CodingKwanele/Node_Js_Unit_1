/**
 * User controller (Passport registration + login)
 * - SA postal code (4 digits)
 * - Safe trims/lowercases
 * - Flash + redirectView pattern
 */

import mongoose from "mongoose";
import passport from "passport";
import User from "../models/user.js";
import Subscriber from "../models/subscribers.js";
import Course from "../models/course.js";

/* --------------------------- helpers / middleware -------------------------- */

const isValidZaPostal = (val) => /^\d{4}$/.test(String(val || "").trim());

export const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated?.()) return next();
  req.flash("error", "Please log in to continue.");
  res.redirect("/users/login");
};

/* --------------------------------- actions -------------------------------- */

// GET /users — list
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

// GET /users/new — form
const showCreateUserForm = (req, res) => {
  res.render("user_new", {
    errors: {},
    values: { first: "", last: "", email: "", zipCode: "", password: "" },
  });
};

// POST /users — register via Passport
const createUser = async (req, res, next) => {
  try {
    const first = String(req.body.first || "").trim();
    const last = String(req.body.last || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const zipCodeStr = String(req.body.zipCode || "").trim();
    const password = String(req.body.password || "");

    const errors = {};
    if (!first) errors.first = "First name is required.";
    if (!last) errors.last = "Last name is required.";
    if (!email) errors.email = "Email is required.";
    if (!password || password.length < 6) errors.password = "Password must be at least 6 characters.";
    if (zipCodeStr && !isValidZaPostal(zipCodeStr)) errors.zipCode = "Postal code must be 4 digits (ZA).";

    if (Object.keys(errors).length) {
      return res.status(400).render("user_new", {
        errors,
        values: { first, last, email, zipCode: zipCodeStr, password: "" },
      });
    }

    // Build user doc — passport-local-mongoose will handle username+hash
    const userDoc = new User({
      name: { first, last },
      email,
      zipCode: zipCodeStr ? Number(zipCodeStr) : undefined,
    });

    // If your User schema sets usernameField: 'email', this treats email as the username
    const user = await User.register(userDoc, password);

    // Auto-link subscriber if emails match (case-insensitive query)
    const sub = await Subscriber.findOne({ email }).lean();
    if (sub) {
      await User.findByIdAndUpdate(
        user._id,
        { $set: { subscriberAccount: sub._id } },
        { runValidators: true, context: "query" }
      );
    }

    req.flash("success", `${first} ${last} created successfully!`);
    res.locals.redirect = "/users";
    return next();
  } catch (e) {
    console.error(e);
    // Duplicate email (unique index) or already registered
    if (e?.name === "UserExistsError" || e?.code === 11000) {
      req.flash("error", "A user with this email already exists.");
      res.locals.redirect = "/users/new";
      return next();
    }
    req.flash("error", `Failed to create user account: ${e.message}`);
    res.locals.redirect = "/users/new";
    return next();
  }
};

// GET /users/login — form
const showLoginForm = (req, res) => res.render("login");

// POST /users/login — Passport local
const authenticate = passport.authenticate("local", {
  failureRedirect: "/users/login",
  failureFlash: "Invalid email or password.",
  successRedirect: "/users",
  successFlash: "Welcome back!",
});

// GET /users/logout — clear session
const logout = (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.flash("success", "You have been logged out!");
    res.locals.redirect = "/";
    next();
  });
};

// GET /users/:id/edit — form
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
        password: "",
      },
      id: user._id,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).render("error", { message: "Failed to load user." });
  }
};

// POST /users/:id — update (optional password change)
const updateUser = async (req, res, next) => {
  try {
    const first = String(req.body.first || "").trim();
    const last = String(req.body.last || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const zipCodeStr = String(req.body.zipCode || "").trim();
    const newPassword = String(req.body.password || "");

    const userDoc = await User.findById(req.params.id);
    if (!userDoc) {
      req.flash("error", "User not found.");
      res.locals.redirect = "/users";
      return next();
    }

    // Ensure name object exists
    if (!userDoc.name) userDoc.name = {};
    userDoc.name.first = first;
    userDoc.name.last = last;
    userDoc.email = email;
    userDoc.zipCode = zipCodeStr ? Number(zipCodeStr) : undefined;

    if (zipCodeStr && !isValidZaPostal(zipCodeStr)) {
      return res.status(400).render("user_edit", {
        errors: { zipCode: "Postal code must be 4 digits (ZA)." },
        values: { ...req.body, password: "" },
        id: req.params.id,
      });
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).render("user_edit", {
          errors: { password: "Password must be at least 6 characters." },
          values: { ...req.body, password: "" },
          id: req.params.id,
        });
      }
      await userDoc.setPassword(newPassword); // provided by passport-local-mongoose
    }

    await userDoc.save();

    req.flash("success", "User updated successfully.");
    res.locals.redirect = "/users";
    return next();
  } catch (e) {
    console.error(e);
    if (e?.code === 11000) {
      return res.status(409).render("user_edit", {
        errors: { email: "A user with this email already exists." },
        values: { ...req.body, password: "" },
        id: req.params.id,
      });
    }
    req.flash("error", `Failed to update user: ${e.message}`);
    res.locals.redirect = "/users";
    return next();
  }
};

// POST /users/:id/delete — delete
const deleteUser = async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    req.flash("success", "User deleted.");
    res.locals.redirect = "/users";
    return next();
  } catch (e) {
    console.error(e);
    req.flash("error", "Failed to delete user.");
    res.locals.redirect = "/users";
    return next();
  }
};

// POST /users/:id/link-course — add course
const linkCourse = async (req, res, next) => {
  try {
    const { courseId } = req.body;
    if (!mongoose.isValidObjectId(courseId)) {
      req.flash("error", "Invalid course id.");
      res.locals.redirect = "/users"; return next();
    }
    const course = await Course.findById(courseId).lean();
    if (!course) {
      req.flash("error", "Course not found.");
      res.locals.redirect = "/users"; return next();
    }
    await User.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { courses: course._id } },
      { runValidators: true, context: "query" }
    );
    req.flash("success", "Course linked.");
    res.locals.redirect = "/users"; return next();
  } catch (e) {
    console.error(e);
    req.flash("error", "Failed to link course.");
    res.locals.redirect = "/users"; return next();
  }
};

// POST /users/:id/link-subscriber — link by email
const linkSubscriberByEmail = async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email) {
      req.flash("error", "Subscriber email is required.");
      res.locals.redirect = "/users"; return next();
    }
    const sub = await Subscriber.findOne({ email }).lean();
    if (!sub) {
      req.flash("error", "Subscriber not found.");
      res.locals.redirect = "/users"; return next();
    }
    await User.findByIdAndUpdate(
      req.params.id,
      { $set: { subscriberAccount: sub._id } },
      { runValidators: true, context: "query" }
    );
    req.flash("success", "Subscriber linked.");
    res.locals.redirect = "/users"; return next();
  } catch (e) {
    console.error(e);
    req.flash("error", "Failed to link subscriber.");
    res.locals.redirect = "/users"; return next();
  }
};

// Redirect middleware (mount this last in each route chain)
const redirectView = (req, res, next) => {
  const redirectPath = res.locals.redirect;
  if (redirectPath) res.redirect(redirectPath);
  else next();
};

export default {
  showUsers,
  showCreateUserForm,
  createUser,
  showLoginForm,
  authenticate,
  logout,
  showEditUserForm,
  updateUser,
  deleteUser,
  linkCourse,
  linkSubscriberByEmail,
  redirectView,
  ensureAuthenticated,
};
