// routes/users.js
// User registration, authentication, profile management

import express from "express";
import { body, param } from "express-validator";
import userController from "../controllers/userController.js";

const router = express.Router();

/* -----------------------------------------
   SIMPLE MIDDLEWARE GUARDS
----------------------------------------- */
const ensureAuth = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  req.flash?.("error", "Please log in first.");
  return res.redirect("/users/login");
};

const ensureGuest = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    req.flash?.("info", "You are already logged in.");
    return res.redirect("/"); // change to /dashboard if you have one
  }
  return next();
};

const validateUserId = [
  param("id").trim().isMongoId().withMessage("Invalid user id."),
];

/* -----------------------------------------
   PUBLIC (NO LOGIN REQUIRED)
   Mounted at /users in main.js: app.use("/users", usersRouter)
----------------------------------------- */

// GET /users/login – show login page
router.get("/login", ensureGuest, userController.showLoginForm);

// POST /users/login – process login
router.post(
  "/login",
  ensureGuest,
  [
    body("email").trim().isEmail().withMessage("Valid email required."),
    body("password").isLength({ min: 6 }).withMessage("Password too short."),
  ],
  userController.authenticate
);

// GET /users/new – show signup page
router.get("/new", ensureGuest, userController.showCreateUserForm);

// POST /users – create account (matches your form action)
router.post(
  "/",
  ensureGuest,
  [
    body("first").trim().notEmpty().withMessage("First name required."),
    body("last").trim().notEmpty().withMessage("Last name required."),
    body("email").trim().isEmail().withMessage("Valid email required."),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters."),
  ],
  userController.createUser,
  userController.redirectView
);

// GET /users/logout – log out
router.get("/logout", ensureAuth, userController.logout, userController.redirectView);

/* -----------------------------------------
   PROTECTED (LOGIN REQUIRED)
----------------------------------------- */

// GET /users – list all users
router.get("/", ensureAuth, userController.showUsers);

// GET /users/:id/edit – show edit form
router.get("/:id/edit", ensureAuth, validateUserId, userController.showEditUserForm);

// PUT /users/:id – update user (your edit form posts to /users/:id with ?_method=PUT)
router.put(
  "/:id",
  ensureAuth,
  validateUserId,
  [
    body("first").optional().trim().notEmpty(),
    body("last").optional().trim().notEmpty(),
    body("email").optional().trim().isEmail().withMessage("Valid email required."),
    body("zipCode").optional().trim(),
    body("password").optional().isLength({ min: 6 }).withMessage("Password too short."),
  ],
  userController.updateUser,
  userController.redirectView
);

// POST /users/:id/delete – delete user (matches your users.ejs form)
router.post(
  "/:id/delete",
  ensureAuth,
  validateUserId,
  userController.deleteUser,
  userController.redirectView
);

// (Optional) RESTful DELETE /users/:id (if you later switch your form to ?_method=DELETE)
router.delete(
  "/:id",
  ensureAuth,
  validateUserId,
  userController.deleteUser,
  userController.redirectView
);

/* -----------------------------------------
   USER RELATIONSHIPS (PROTECTED)
----------------------------------------- */

// POST /users/:id/link-course – link user to course (matches users.ejs)
router.post(
  "/:id/link-course",
  ensureAuth,
  validateUserId,
  [body("courseId").trim().notEmpty().withMessage("courseId is required.")],
  userController.linkCourse,
  userController.redirectView
);

// POST /users/:id/link-subscriber – link user to subscriber by email (matches users.ejs)
router.post(
  "/:id/link-subscriber",
  ensureAuth,
  validateUserId,
  [body("email").trim().isEmail().withMessage("Valid email required.")],
  userController.linkSubscriberByEmail,
  userController.redirectView
);

export default router;
