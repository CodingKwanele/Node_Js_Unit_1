/**
 * User Controller
 * Handles user CRUD, authentication, and linking to courses/subscribers.
 * Author: Kwanele Dladla
 */

import mongoose from "mongoose";
import passport from "passport";
import User from "../models/user.js";
import Subscriber from "../models/subscribers.js";
import Course from "../models/course.js";

const isValidZaPostal = (v) => /^\d{4}$/.test(String(v || "").trim());
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* ------------------------------- Actions ---------------------------------- */

// GET /users
const showUsers = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "25", 10), 1), 100);
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find({})
      .populate("subscriberAccount", "email")
      .populate("courses", "title")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments({}),
  ]);

  res.render("users", { users, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } });
});

// GET /users/new
const showCreateUserForm = (_req, res) =>
  res.render("user_new", { errors: {}, values: { first: "", last: "", email: "", zipCode: "", password: "" } });

// POST /users
const createUser = asyncHandler(async (req, res, next) => {
  const { first, last, email, password, zipCode } = req.body;
  const errors = {};
  if (!first?.trim()) errors.first = "First name required.";
  if (!last?.trim()) errors.last = "Last name required.";
  if (!email?.trim()) errors.email = "Email required.";
  if (!password || password.length < 6) errors.password = "Password must be ≥ 6 chars.";
  if (zipCode && !isValidZaPostal(zipCode)) errors.zipCode = "Postal must be 4 digits.";

  if (Object.keys(errors).length)
    return res.status(400).render("user_new", { errors, values: req.body });

  const userDoc = new User({
    name: { first, last },
    email: email.trim().toLowerCase(),
    zipCode: zipCode ? Number(zipCode) : undefined,
  });

  try {
    const user = await User.register(userDoc, password);
    const sub = await Subscriber.findOne({ email: user.email }).lean();
    if (sub) await User.findByIdAndUpdate(user._id, { $set: { subscriberAccount: sub._id } });
    req.flash("success", `${first} ${last} created successfully.`);
    res.locals.redirect = "/users";
    next();
  } catch (e) {
    req.flash("error", e.name === "UserExistsError" ? "User already exists." : `Error: ${e.message}`);
    res.locals.redirect = "/users/new";
    next();
  }
});

// GET /users/login
const showLoginForm = (_req, res) => res.render("login");

// POST /users/login
const authenticate = (req, res, next) =>
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      req.flash("error", info?.message || "Invalid credentials.");
      return res.redirect("/users/login");
    }
    req.logIn(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      req.flash("success", "Welcome back!");
      res.redirect("/dashboard");
    });
  })(req, res, next);

// GET /users/logout
const logout = (req, res, next) =>
  req.logout((err) => {
    if (err) return next(err);
    req.flash("success", "Logged out.");
    res.locals.redirect = "/";
    next();
  });

// GET /users/:id/edit
const showEditUserForm = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).lean();
  if (!user) return res.status(404).render("error", { message: "User not found." });
  res.render("user_edit", { errors: {}, values: user, id: user._id });
});

// PUT /users/:id/update
const updateUser = asyncHandler(async (req, res, next) => {
  const { first, last, email, password, zipCode } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) {
    req.flash("error", "User not found.");
    res.locals.redirect = "/users";
    return next();
  }

  const errors = {};
  if (!first?.trim()) errors.first = "First name required.";
  if (!last?.trim()) errors.last = "Last name required.";
  if (!email?.trim()) errors.email = "Email required.";
  if (password && password.length < 6) errors.password = "Password must be ≥ 6 chars.";
  if (zipCode && !isValidZaPostal(zipCode)) errors.zipCode = "Postal must be 4 digits.";

  if (Object.keys(errors).length) {
    return res.status(400).render("user_edit", { errors, values: { ...req.body, _id: user._id }, id: user._id });
  }

  // update fields
  user.name.first = first.trim();
  user.name.last = last.trim();
  user.email = email.trim().toLowerCase();
  user.zipCode = zipCode ? Number(zipCode) : undefined;

  // update password if provided (passport-local-mongoose)
  if (password) {
    await new Promise((resolve, reject) =>
      user.setPassword(password, (err) => (err ? reject(err) : resolve()))
    );
  }

  await user.save();

  // link subscriber if one exists for this email
  const sub = await Subscriber.findOne({ email: user.email }).lean();
  if (sub) {
    user.subscriberAccount = sub._id;
    await user.save();
  }

  req.flash("success", `${user.name.first} ${user.name.last} updated.`);
  res.locals.redirect = "/users";
  next();
});