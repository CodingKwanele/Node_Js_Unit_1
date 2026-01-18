import express from "express";
import userController from "../controllers/userController.js";

const router = express.Router();

// ============================================
// USER LISTING AND REGISTRATION
// ============================================

// Display all users (protected)
router.get("/users", userController.ensureAuthenticated, userController.showUsers);

// Show registration form (public)
router.get("/users/new", userController.showCreateUserForm);

// Process new user registration (public)
router.post("/users/create", userController.createUser, userController.redirectView);

// ============================================
// AUTHENTICATION
// ============================================

router.get("/users/login", userController.showLoginForm);
router.post("/users/login", userController.authenticate);

router.get("/users/logout", userController.logout, userController.redirectView);

// ============================================
// PROFILE MANAGEMENT (protected)
// ============================================

router.get("/users/:id/edit", userController.ensureAuthenticated, userController.showEditUserForm);

router.put("/users/:id/update", userController.ensureAuthenticated, userController.updateUser, userController.redirectView);

router.delete("/users/:id/delete", userController.ensureAuthenticated, userController.deleteUser, userController.redirectView);

// ============================================
// USER RELATIONSHIPS (protected)
// ============================================

router.post("/users/:id/link-course", userController.ensureAuthenticated, userController.linkCourse, userController.redirectView);

router.post("/users/:id/link-subscriber", userController.ensureAuthenticated, userController.linkSubscriberByEmail, userController.redirectView);

export default router;
