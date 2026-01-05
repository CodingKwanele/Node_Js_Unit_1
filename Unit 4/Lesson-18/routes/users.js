// routes/users.js
import express from "express";
import userController from "../controllers/userController.js";
const router = express.Router();

router.get("/users", userController.showUsers);
router.get("/users/new", userController.showCreateUserForm);
router.post("/users", userController.createUser);
router.get("/users/:id/edit", userController.showEditUserForm);
router.post("/users/:id", userController.updateUser);
router.post("/users/:id/delete", userController.deleteUser);

// linking helpers
router.post("/users/:id/link-course", userController.linkCourse);
router.post("/users/:id/link-subscriber", userController.linkSubscriberByEmail);

export default router;
