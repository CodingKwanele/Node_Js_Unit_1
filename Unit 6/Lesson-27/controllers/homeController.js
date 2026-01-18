// controllers/homeController.js
import Course from "../models/course.js";

const noCache = (res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
};

const showLoginPage = (req, res) => {
  noCache(res);
  res.render("login", { title: "Sign In — My Recipe Web" });
};

const showDashboard = async (req, res, next) => {
  try {
    noCache(res);
    const recentCourses = await Course.find()
      .select("title createdAt")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.render("dashboard", {
      title: "Dashboard — My Recipe Web",
      user: req.user,
      recentCourses,
    });
  } catch (err) {
    next(err);
  }
};

const showAbout = (_req, res) => res.render("about", { title: "About — My Recipe Web" });
const showHome  = (_req, res) => res.render("home",  { title: "Home — My Recipe Web" });

const health = (_req, res) => res.status(200).json({ ok: true, timestamp: new Date().toISOString() });

export default { showLoginPage, showDashboard, showAbout, showHome, health };
