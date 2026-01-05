/**
 * Home Controller
 * Landing page, dashboard, about & health endpoints.
 * Author: Kwanele Dladla
 */

import Course from "../models/course.js";

const noCache = (res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
};

// GET /
const showLoginPage = (req, res) => {
  noCache(res);
  res.render("login", { title: "Sign in" });
};

// GET /dashboard
const showDashboard = async (req, res, next) => {
  try {
    noCache(res);
    const recentCourses = await Course.find()
      .select("title createdAt")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    res.render("dashboard", { title: "Dashboard", user: req.user, recentCourses });
  } catch (err) {
    next(err);
  }
};

// GET /about
const showAbout = (_req, res) => res.render("about", { title: "About" });

// GET /home
const showHome = (_req, res) => res.render("index", { title: "Home" });

// GET /health
const health = (_req, res) => res.status(200).json({ ok: true });

export default { showLoginPage, showDashboard, showAbout, showHome, health };
