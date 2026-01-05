import express from "express";
import userController from "../controllers/userController.js";

const router = express.Router();

// LIST users
router.get("/users", userController.showUsers);

// NEW user form
router.get("/users/new", userController.showCreateUserForm);

// CREATE user
router.post(
  "/users",
  userController.createUser,
  userController.redirectView
);

// LOGIN form (GET)  <-- put BEFORE any /users/:id routes
router.get(
  "/users/login",
  userController.showLoginForm
);

// LOGIN submit (POST) <-- also BEFORE any /users/:id routes
router.post(
  "/users/login",
  userController.authenticate,
  userController.redirectView
);

// EDIT user form
router.get("/users/:id/edit", userController.showEditUserForm);

// UPDATE user
router.post(
  "/users/:id",
  userController.updateUser,
  userController.redirectView
);

// DELETE user
router.post(
  "/users/:id/delete",
  userController.deleteUser,
  userController.redirectView
);

// LINK course
router.post(
  "/users/:id/link-course",
  userController.linkCourse,
  userController.redirectView
);

// LINK subscriber
router.post(
  "/users/:id/link-subscriber",
  userController.linkSubscriberByEmail,
  userController.redirectView
);

export default router;
