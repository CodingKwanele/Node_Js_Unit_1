/**
 * User controller (Passport registration + login)
 * - SA postal code (4 digits)
 * - Safe trims/lowercases
 * - Flash + redirectView pattern
 * Author: Kwanele Dladla
 */

import mongoose from "mongoose";
import passport from "passport";
import User from "../models/user.js";
import Subscriber from "../models/subscribers.js";
import Course from "../models/course.js";

/* --------------------------------- helpers -------------------------------- */

// Validates South African 4-digit postal codes
const isValidZaPostal = (val) => /^\d{4}$/.test(String(val || "").trim());

// Wraps async route handlers to catch Promise rejections and pass to error middleware
const asyncHandler =
  (fn) =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

/* --------------------------------- actions -------------------------------- */

// GET /users — List all users with pagination and related data
const showUsers = asyncHandler(async (req, res) => {
  // Parse and validate pagination params (page & limit)
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "25", 10), 1), 100);
  const skip = (page - 1) * limit;

  // Fetch users and total count in parallel
  const [users, total] = await Promise.all([
    User.find({})
      .populate({ path: "subscriberAccount", select: "email" })
      .populate({ path: "courses", select: "title" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments({}),
  ]);

  res.render("users", {
    users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});

// GET /users/new — Display user registration form
const showCreateUserForm = (_req, res) => {
  res.render("user_new", {
    errors: {},
    values: { first: "", last: "", email: "", zipCode: "", password: "" },
  });
};

// POST /users/create — Register user via Passport + auto-link subscriber
const createUser = asyncHandler(async (req, res, next) => {
  // Sanitize inputs: trim whitespace and lowercase email
  const first = String(req.body.first || "").trim();
  const last = String(req.body.last || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const zipCodeStr = String(req.body.zipCode || "").trim();
  const password = String(req.body.password || "");

  // Validate required fields
  const errors = {};
  if (!first) errors.first = "First name is required.";
  if (!last) errors.last = "Last name is required.";
  if (!email) errors.email = "Email is required.";
  if (!password || password.length < 6) errors.password = "Password must be at least 6 characters.";
  if (zipCodeStr && !isValidZaPostal(zipCodeStr)) errors.zipCode = "Postal code must be 4 digits (ZA).";

  // Return form with errors if validation fails
  if (Object.keys(errors).length) {
    return res.status(400).render("user_new", {
      errors,
      values: { first, last, email, zipCode: zipCodeStr, password: "" },
    });
  }

  const userDoc = new User({
    name: { first, last },
    email,
    zipCode: zipCodeStr ? Number(zipCodeStr) : undefined,
  });

  try {
    // Register user with Passport (hashes password)
    const user = await User.register(userDoc, password);
    
    // Auto-link subscriber account if email matches
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
    // Handle duplicate email error
    if (e?.name === "UserExistsError" || e?.code === 11000) {
      req.flash("error", "A user with this email already exists.");
      res.locals.redirect = "/users/new";
      return next();
    }
    req.flash("error", `Failed to create user account: ${e.message}`);
    res.locals.redirect = "/users/new";
    return next();
  }
});

// GET /users/login — Display login form
const showLoginForm = (_req, res) => res.render("login");

// POST /users/login — Passport local authentication with returnTo redirect
const authenticate = (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    
    // Flash error if authentication failed
    if (!user) {
      req.flash("error", info?.message || "Invalid email or password.");
      return res.redirect("/users/login");
    }
    
    // Establish session for authenticated user
    req.logIn(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      req.flash("success", "Welcome back!");
      
      // Redirect to original page or dashboard
      const redirectTo = req.session?.returnTo || "/dashboard";
      if (req.session) delete req.session.returnTo;
      return res.redirect(redirectTo);
    });
  })(req, res, next);
};

// GET /users/logout — Clear session and redirect
const logout = (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.flash("success", "You have been logged out!");
    res.locals.redirect = "/";
    next();
  });
};

// GET /users/:id/edit — Display edit form prefilled with user data
const showEditUserForm = asyncHandler(async (req, res) => {
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
});

// PUT /users/:id/update — Update user data + optional password change
const updateUser = asyncHandler(async (req, res, next) => {
  // Sanitize inputs
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

  // Update user fields
  if (!userDoc.name) userDoc.name = {};
  userDoc.name.first = first;
  userDoc.name.last = last;
  userDoc.email = email;
  userDoc.zipCode = zipCodeStr ? Number(zipCodeStr) : undefined;

  // Validate postal code
  if (zipCodeStr && !isValidZaPostal(zipCodeStr)) {
    return res.status(400).render("user_edit", {
      errors: { zipCode: "Postal code must be 4 digits (ZA)." },
      values: { ...req.body, password: "" },
      id: req.params.id,
    });
  }

  // Update password if provided
  if (newPassword) {
    if (newPassword.length < 6) {
      return res.status(400).render("user_edit", {
        errors: { password: "Password must be at least 6 characters." },
        values: { ...req.body, password: "" },
        id: req.params.id,
      });
    }
    await userDoc.setPassword(newPassword); // Passport method (hashes password)
  }

  try {
    await userDoc.save();
    req.flash("success", "User updated successfully.");
    res.locals.redirect = "/users";
    return next();
  } catch (e) {
    // Handle duplicate email error
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
});

// DELETE /users/:id/delete — Delete user from database
const deleteUser = asyncHandler(async (req, res, next) => {
  await User.findByIdAndDelete(req.params.id);
  req.flash("success", "User deleted.");
  res.locals.redirect = "/users";
  return next();
});

// POST /users/:id/link-course — Add course to user's courses array
const linkCourse = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { courseId } = req.body;

  // Validate MongoDB IDs
  if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(courseId)) {
    req.flash("error", "Invalid id.");
    res.locals.redirect = "/users";
    return next();
  }

  // Fetch user and course in parallel
  const [user, course] = await Promise.all([
    User.findById(id).select("_id").lean(),
    Course.findById(courseId).select("_id").lean(),
  ]);

  if (!user) {
    req.flash("error", "User not found.");
    res.locals.redirect = "/users";
    return next();
  }
  if (!course) {
    req.flash("error", "Course not found.");
    res.locals.redirect = "/users";
    return next();
  }

  // Add course (avoids duplicates with $addToSet)
  await User.findByIdAndUpdate(
    id,
    { $addToSet: { courses: course._id } },
    { runValidators: true, context: "query" }
  );

  req.flash("success", "Course linked.");
  res.locals.redirect = "/users";
  return next();
});

// POST /users/:id/link-subscriber — Link subscriber by email
const linkSubscriberByEmail = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const email = String(req.body?.email || "").trim().toLowerCase();

  // Validate user ID and email input
  if (!mongoose.isValidObjectId(id)) {
    req.flash("error", "Invalid user id.");
    res.locals.redirect = "/users";
    return next();
  }
  if (!email) {
    req.flash("error", "Subscriber email is required.");
    res.locals.redirect = "/users";
    return next();
  }

  // Fetch user and subscriber in parallel
  const [user, sub] = await Promise.all([
    User.findById(id).select("_id").lean(),
    Subscriber.findOne({ email }).select("_id").lean(),
  ]);

  if (!user) {
    req.flash("error", "User not found.");
    res.locals.redirect = "/users";
    return next();
  }
  if (!sub) {
    req.flash("error", "Subscriber not found.");
    res.locals.redirect = "/users";
    return next();
  }

  // Link subscriber account to user
  await User.findByIdAndUpdate(
    id,
    { $set: { subscriberAccount: sub._id } },
    { runValidators: true, context: "query" }
  );

  req.flash("success", "Subscriber linked.");
  res.locals.redirect = "/users";
  return next();
});

// Redirect middleware — executes res.redirect() if path is set in res.locals
const redirectView = (_req, res, next) => {
  const redirectPath = res.locals.redirect;
  if (redirectPath) return res.redirect(redirectPath);
  return next();
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
};
