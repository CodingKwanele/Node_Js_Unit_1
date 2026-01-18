/**
 * User controller (Passport registration + login)
 * - ZA postal code (4 digits)
 * - Safe trims / lowercases
 * - Flash + redirectView pattern
 * - API JWT auth for /api routes
 * Author: Kwanele Dladla
 */

import mongoose from "mongoose";
import passport from "passport";
import jwt from "jsonwebtoken";

import User from "../models/user.js";
import Subscriber from "../models/subscribers.js";
import Course from "../models/course.js";

/* --------------------------------- helpers -------------------------------- */

const isValidZaPostal = (val) => /^\d{4}$/.test(String(val || "").trim());

const asyncHandler =
  (fn) =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// Simple token guard (for query-string token usage)
const token = process.env.TOKEN || "recipeToiken";

// Bearer token helper: Authorization: Bearer <token>
const getBearerToken = (req) => {
  const auth = String(req.headers?.authorization || "").trim();
  const [type, rawToken] = auth.split(" ");
  if (type !== "Bearer" || !rawToken) return null;
  return rawToken.trim();
};

// Builds the payload for API user responses
const buildApiUser = (userDoc) => ({
  id: String(userDoc?._id),
  first: userDoc?.name?.first ?? "",
  last: userDoc?.name?.last ?? "",
  email: userDoc?.email ?? "",
});

/* --------------------------------- actions -------------------------------- */

/* -----------------------------
   USERS (HTML views)
------------------------------ */

// GET /users — list (consider admin-only)
const showUsers = asyncHandler(async (req, res) => {
  // Optional simple pagination
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "25", 10), 1), 100);
  const skip = (page - 1) * limit;

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

  return res.render("users", {
    users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});

// GET /users/new — form
const showCreateUserForm = (_req, res) => {
  return res.render("user_new", {
    errors: {},
    values: { first: "", last: "", email: "", zipCode: "", password: "" },
  });
};

// POST /users/create — register via Passport
const createUser = asyncHandler(async (req, res, next) => {
  const first = String(req.body.first || "").trim();
  const last = String(req.body.last || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const zipCodeStr = String(req.body.zipCode || "").trim();
  const password = String(req.body.password || "");

  const errors = {};

  if (!first) errors.first = "First name is required.";
  if (!last) errors.last = "Last name is required.";
  if (!email) errors.email = "Email is required.";
  if (!password || password.length < 6)
    errors.password = "Password must be at least 6 characters.";
  if (zipCodeStr && !isValidZaPostal(zipCodeStr))
    errors.zipCode = "Postal code must be 4 digits (ZA).";

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
    // passport-local-mongoose
    const user = await User.register(userDoc, password);

    // Auto-link subscriber if emails match
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
    if (e?.name === "UserExistsError" || e?.code === 11000) {
      req.flash("error", "A user with this email already exists.");
      res.locals.redirect = "/users/new";
      return next();
    }

    req.flash("error", `Failed to create user account: ${e?.message || e}`);
    res.locals.redirect = "/users/new";
    return next();
  }
});

// GET /users/login — form
const showLoginForm = (_req, res) => res.render("login");

// POST /users/login — Passport local with returnTo support
const authenticate = (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);

    if (!user) {
      req.flash("error", info?.message || "Invalid email or password.");
      return res.redirect("/users/login");
    }

    req.logIn(user, (loginErr) => {
      if (loginErr) return next(loginErr);

      req.flash("success", "Welcome back!");
      const redirectTo = req.session?.returnTo || "/dashboard";
      if (req.session) delete req.session.returnTo;

      return res.redirect(redirectTo);
    });
  })(req, res, next);
};

// GET /users/logout — clear session
const logout = (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);

    req.flash("success", "You have been logged out!");
    res.locals.redirect = "/";
    return next();
  });
};

// GET /users/:id/edit — form
const showEditUserForm = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).lean();
  if (!user) return res.status(404).render("error", { message: "User not found." });

  return res.render("user_edit", {
    errors: {},
    values: {
      first: user.name?.first ?? "",
      last: user.name?.last ?? "",
      email: user.email ?? "",
      zipCode: user.zipCode ?? "",
      password: "",
    },
    id: user._id,
  });
});

// PUT /users/:id/update — update (optional password change)
const updateUser = asyncHandler(async (req, res, next) => {
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

  // Validate postal (only if provided)
  if (zipCodeStr && !isValidZaPostal(zipCodeStr)) {
    return res.status(400).render("user_edit", {
      errors: { zipCode: "Postal code must be 4 digits (ZA)." },
      values: { ...req.body, password: "" },
      id: req.params.id,
    });
  }

  // Update fields
  if (!userDoc.name) userDoc.name = {};
  userDoc.name.first = first;
  userDoc.name.last = last;
  userDoc.email = email;
  userDoc.zipCode = zipCodeStr ? Number(zipCodeStr) : undefined;

  // Optional password change
  if (newPassword) {
    if (newPassword.length < 6) {
      return res.status(400).render("user_edit", {
        errors: { password: "Password must be at least 6 characters." },
        values: { ...req.body, password: "" },
        id: req.params.id,
      });
    }
    // passport-local-mongoose
    await userDoc.setPassword(newPassword);
  }

  try {
    await userDoc.save();
    req.flash("success", "User updated successfully.");
    res.locals.redirect = "/users";
    return next();
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).render("user_edit", {
        errors: { email: "A user with this email already exists." },
        values: { ...req.body, password: "" },
        id: req.params.id,
      });
    }

    req.flash("error", `Failed to update user: ${e?.message || e}`);
    res.locals.redirect = "/users";
    return next();
  }
});

/* -----------------------------
   API TOKEN (query string) GUARD
------------------------------ */

// Middleware: verify token via query string (?apiToken=xxxx)
const verifyToken = asyncHandler(async (req, _res, next) => {
  const apiToken = String(req.query?.apiToken || "").trim();

  // 1) Must exist
  if (!apiToken) {
    return next(new Error("Missing apiToken query parameter."));
  }

  // 2) Find user by token
  const user = await User.findOne({ apiToken }).select("_id email").lean();

  // 3) If user exists, allow request
  if (user) {
    req.apiUser = user;
    return next();
  }

  // 4) If not found, raise error
  return next(new Error("Invalid API token."));
});

/* -----------------------------
   API JWT (Authorization Bearer) AUTH
------------------------------ */

/**
 * POST /api/authenticate
 * Body: { email, password }
 * Returns JSON: { success, token, user }
 *
 * Uses passport-local-mongoose: user.authenticate(password)
 */
const apiAuthenticate = asyncHandler(async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: "Email and password are required.",
    });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({
      success: false,
      error: "Invalid email or password.",
    });
  }

  // passport-local-mongoose gives user.authenticate(password)
  const authResult = user.authenticate(password);

  // authResult: { user, error }
  if (authResult?.error) {
    return res.status(401).json({
      success: false,
      error: "Invalid email or password.",
    });
  }

  const secret = process.env.JWT_SECRET || "dev_secret_change_me";
  const expiresIn = process.env.JWT_EXPIRES_IN || "1d";

  const jwtToken = jwt.sign(
    { sub: String(user._id), email: user.email },
    secret,
    { expiresIn }
  );

  return res.json({
    success: true,
    token: jwtToken,
    user: buildApiUser(user),
  });
});

/**
 * Middleware: verify JWT
 * Reads Authorization: Bearer <token>
 * Sets req.apiUser = { _id, email }
 */
const verifyJWT = (req, res, next) => {
  try {
    const jwtToken = getBearerToken(req);
    if (!jwtToken) {
      return res.status(401).json({
        success: false,
        error: "Missing Bearer token.",
      });
    }

    const secret = process.env.JWT_SECRET || "dev_secret_change_me";
    const payload = jwt.verify(jwtToken, secret);

    req.apiUser = {
      _id: payload?.sub,
      email: payload?.email,
    };

    return next();
  } catch (_err) {
    return res.status(401).json({
      success: false,
      error: "Invalid or expired token.",
    });
  }
};

/* -----------------------------
   USERS (CRUD actions)
------------------------------ */

// DELETE /users/:id/delete — delete
const deleteUser = asyncHandler(async (req, res, next) => {
  await User.findByIdAndDelete(req.params.id);

  req.flash("success", "User deleted.");
  res.locals.redirect = "/users";
  return next();
});

// POST /users/:id/link-course — add course
const linkCourse = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { courseId } = req.body;

  if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(courseId)) {
    req.flash("error", "Invalid id.");
    res.locals.redirect = "/users";
    return next();
  }

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

  await User.findByIdAndUpdate(
    id,
    { $addToSet: { courses: course._id } },
    { runValidators: true, context: "query" }
  );

  req.flash("success", "Course linked.");
  res.locals.redirect = "/users";
  return next();
});

// POST /users/:id/link-subscriber — link by email
const linkSubscriberByEmail = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const email = String(req.body?.email || "").trim().toLowerCase();

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

  await User.findByIdAndUpdate(
    id,
    { $set: { subscriberAccount: sub._id } },
    { runValidators: true, context: "query" }
  );

  req.flash("success", "Subscriber linked.");
  res.locals.redirect = "/users";
  return next();
});

// Redirect middleware (mount last in route chains)
const redirectView = (req, res, next) => {
  const redirectPath = res.locals.redirect;
  if (redirectPath) return res.redirect(redirectPath);
  return next();
};

export default {
  // HTML views
  showUsers,
  showCreateUserForm,
  createUser,
  showLoginForm,
  authenticate,
  logout,
  showEditUserForm,
  updateUser,

  // API guards + auth
  verifyToken,
  apiAuthenticate,
  verifyJWT,

  // CRUD + linking
  deleteUser,
  linkCourse,
  linkSubscriberByEmail,

  // redirect helper
  redirectView,
};
