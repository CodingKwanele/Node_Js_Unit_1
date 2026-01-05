// routes/users.js
// Handles all user-related routes: registration, authentication, profile management
import express from "express";
import userController from "../controllers/userController.js";

const router = express.Router();

// ============================================
// USER LISTING AND REGISTRATION
// ============================================

// Display all users
router.get("/users", userController.showUsers);

// Show registration form
router.get("/users/new", userController.showCreateUserForm);

// Process new user registration
router.post("/users/create", userController.createUser, userController.redirectView);

// ============================================
// AUTHENTICATION
// ============================================

// Show login form
router.get("/users/login", userController.showLoginForm);

// Process login
router.post("/users/login", userController.authenticate);

// Process logout
router.get("/users/logout", userController.logout, userController.redirectView);

// ============================================
// PROFILE MANAGEMENT
// ============================================

// Show edit form for specific user
router.get("/users/:id/edit", userController.showEditUserForm);

// Update specific user
router.put("/users/:id/update", userController.updateUser, userController.redirectView);

// Delete specific user
router.delete("/users/:id/delete", userController.deleteUser, userController.redirectView);

// ============================================
// USER RELATIONSHIPS
// ============================================

// Link user to course
router.post("/users/:id/link-course", userController.linkCourse, userController.redirectView);

// Link user to subscriber by email
router.post("/users/:id/link-subscriber", userController.linkSubscriberByEmail, userController.redirectView);

export default router;