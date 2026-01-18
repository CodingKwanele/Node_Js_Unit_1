import express from "express";
import { body, param } from "express-validator";
import { ensureAuthenticated, ensureGuest } from "../middlewares/auth.js";
import userController from "../controllers/userController.js";

const router = express.Router();

// Validation middleware
const validateUserId = [param("id").trim().isMongoId().withMessage("Invalid user ID.")];

const validateUserCreation = [
  body("first").trim().notEmpty().withMessage("First name required."),
  body("last").trim().notEmpty().withMessage("Last name required."),
  body("email").trim().isEmail().withMessage("Valid email required."),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters."),
];

const validateLogin = [
  body("email").trim().isEmail().withMessage("Valid email required."),
  body("password").notEmpty().withMessage("Password required."),
];

const validateUserUpdate = [
  body("first").optional().trim().notEmpty(),
  body("last").optional().trim().notEmpty(),
  body("email").optional().trim().isEmail().withMessage("Valid email required."),
  body("password").optional().isLength({ min: 6 }).withMessage("Password too short."),
];

// PUBLIC ROUTES (guest-only)
router.get("/users/login", ensureGuest, userController.showLoginForm);
router.post("/users/login", ensureGuest, validateLogin, userController.authenticate, userController.redirectView);
router.get("/users/new", ensureGuest, userController.showCreateUserForm);
router.post("/users", ensureGuest, validateUserCreation, userController.createUser, userController.redirectView);

// PROTECTED ROUTES (require authentication)
router.get("/users/logout", ensureAuthenticated, userController.logout, userController.redirectView);
router.get("/users", ensureAuthenticated, userController.showUsers);
router.get("/users/:id/edit", ensureAuthenticated, validateUserId, userController.showEditUserForm);
router.post("/users/:id", ensureAuthenticated, validateUserId, validateUserUpdate, userController.updateUser, userController.redirectView);
router.post("/users/:id/delete", ensureAuthenticated, validateUserId, userController.deleteUser, userController.redirectView);

// RELATIONSHIP ROUTES
router.post(
  "/users/:id/link-course",
  ensureAuthenticated,
  validateUserId,
  [body("courseId").trim().notEmpty().withMessage("Course ID required.")],
  userController.linkCourse,
  userController.redirectView
);

router.post(
  "/users/:id/link-subscriber",
  ensureAuthenticated,
  validateUserId,
  [body("email").trim().isEmail().withMessage("Valid email required.")],
  userController.linkSubscriberByEmail,
  userController.redirectView
);

export default router;