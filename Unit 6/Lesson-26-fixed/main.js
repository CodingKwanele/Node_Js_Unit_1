/**
 * Main entry (Express + EJS + static HTML)
 * Sessions, flash, Passport, routers, and error handling
 * - Locks the site for unauthenticated users (except login/signup/static)
 */

import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import passport from "passport";
import session from "express-session";
import flash from "connect-flash";
import methodOverride from "method-override";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import expressLayouts from "express-ejs-layouts";

// Routers
import homeRouter from "./routes/home.js";
import errorsRouter from "./routes/errors.js";
import subscribersRouter from "./routes/subscribers.js";
import usersRouter from "./routes/users.js";
import coursesRouter from "./routes/courses.js";

// Models
import User from "./models/user.js";

// Shared error middlewares
import { notFound, errorHandler } from "./middlewares/errors.js";

dotenv.config();

// __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- App + env ----
const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URL =
  process.env.MONGO_URL || "mongodb://127.0.0.1:27017/recipe_db";
const SESSION_SECRET = process.env.SESSION_SECRET || "change-me";
const NODE_ENV = process.env.NODE_ENV || "development";

// ---- MongoDB ----
mongoose.set("strictQuery", false);
mongoose
  .connect(MONGO_URL)
  .then(() => console.log("✓ MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// ---- Trust proxy (cookies behind Nginx/Heroku) ----
app.set("trust proxy", 1);

// ---- Core middleware ----
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method")); // enables PUT/DELETE via forms ?_method=PUT

// Static files (served before auth gate so CSS/JS/images still load)
app.use(express.static(path.join(__dirname, "public")));

// Security + perf + logs
app.use(helmet());
app.use(compression());
app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));

// ---- Sessions (before flash & passport) ----
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: NODE_ENV === "production", // only secure over HTTPS in prod
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  })
);

// ---- Flash (depends on session) ----
app.use(flash());

// ---- Passport (after session) ----
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use(passport.initialize());
app.use(passport.session());

// ---- View engine (EJS + layout) ----
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(expressLayouts);
// NOTE: ensure you have "views/layout.ejs" (not in partials)
app.set("layout", "layout");

// ---- Locals (after flash + passport) ----
app.use((req, res, next) => {
  res.locals.flashMessages = req.flash();
  res.locals.session = req.session;
  res.locals.loggedIn =
    typeof req.isAuthenticated === "function" ? req.isAuthenticated() : false;
  res.locals.currentUser = req.user || null;
  next();
});

/**
 * Auth gate:
 *  - Blocks everything unless logged in
 *  - Allows only:
 *    * GET/POST /users/login
 *    * GET /users/new (signup form)
 *    * POST /users/create (handle signup)
 *    * /errors/* (optional)
 *    * /health (optional)
 *    * static assets (already allowed above by position)
 */
const PUBLIC_ALLOW = [
  /^\/users\/login$/, // GET (form) & POST (submit)
  /^\/users\/new$/,   // GET signup form
  /^\/users\/create$/, // POST signup
  /^\/errors\//,
  /^\/health$/,
];

function isPublicPath(pathname) {
  return PUBLIC_ALLOW.some((rx) => rx.test(pathname));
}

function enforceAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  if (isPublicPath(req.path)) return next();
  // If not authenticated and not public → redirect to login
  return res.redirect("/users/login");
}

app.use(enforceAuth);

// ---- Routers ----
app.use("/", homeRouter);
app.use("/errors", errorsRouter);
app.use("/subscribers", subscribersRouter);
app.use("/users", usersRouter);
app.use("/courses", coursesRouter);

// ---- Optional: health ----
app.get("/health", (_req, res) => res.json({ ok: true }));

// ---- 404 and 500 handlers ----
app.use(notFound);
app.use(errorHandler);

// ---- Start ----
const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT} (${NODE_ENV})`);
});

// ---- Graceful shutdown (SIGINT/SIGTERM) ----
async function shutdown(signal) {
  console.log(`\n${signal} received. Closing server and MongoDB connection...`);
  try {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    console.log("Shutdown complete.");
    process.exit(0);
  } catch (err) {
    console.error("Error during shutdown:", err);
    process.exit(1);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
