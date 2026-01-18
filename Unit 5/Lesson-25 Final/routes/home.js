// routes/home.js
import express from "express";
import { ensureAuthenticated, ensureGuest } from "../middlewares/auth.js";
import homeController from "../controllers/homeController.js";

const router = express.Router();

router.get("/", ensureGuest, homeController.showLoginPage);
router.get("/dashboard", ensureAuthenticated, homeController.showDashboard);
router.get("/health", homeController.health);

// If you switch from static files to EJS templates:
router.get("/about", homeController.showAbout);
router.get("/home", homeController.showHome);

export default router;
