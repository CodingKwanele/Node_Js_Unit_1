// routes/users.js
// User registration, authentication, profile management (uses shared middlewares)

import express from "express";
import { body, param } from "express-validator";
import { ensureAuthenticated, ensureGuest /*, ensureAdmin*/ } from "../middlewares/auth.js";
import userController from "../controllers/userController.js";

const router = express.Router();

const validateUserId = [param("id").trim().isMongoId().withMessage("Invalid user id.")];

// PUBLIC (guest-only)
router.get("/login", ensureGuest, userController.showLoginForm);
router.post(
  "/login",
  ensureGuest,
  [
    body("email").trim().isEmail().withMessage("Valid email required."),
    body("password").isLength({ min: 6 }).withMessage("Password too short."),
  ],
  userController.authenticate
);
router.get("/new", ensureGuest, userController.showCreateUserForm);
router.post(
  "/",
  ensureGuest,
  [
    body("first").trim().notEmpty().withMessage("First name required."),
    body("last").trim().notEmpty().withMessage("Last name required."),
    body("email").trim().isEmail().withMessage("Valid email required."),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters."),
  ],
  userController.createUser,
  userController.redirectView
);

// AUTH
router.get("/logout", ensureAuthenticated, userController.logout, userController.redirectView);
router.get("/", ensureAuthenticated, userController.showUsers);
router.get("/:id/edit", ensureAuthenticated, validateUserId, userController.showEditUserForm);
router.put(
  "/:id",
  ensureAuthenticated,
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
router.post("/:id/delete", ensureAuthenticated, validateUserId, userController.deleteUser, userController.redirectView);

// RELATIONSHIPS
router.post(
  "/:id/link-course",
  ensureAuthenticated,
  validateUserId,
  [body("courseId").trim().notEmpty().withMessage("courseId is required.")],
  userController.linkCourse,
  userController.redirectView
);
router.post(
  "/:id/link-subscriber",
  ensureAuthenticated,
  validateUserId,
  [body("email").trim().isEmail().withMessage("Valid email required.")],
  userController.linkSubscriberByEmail,
  userController.redirectView
);

export default router;
