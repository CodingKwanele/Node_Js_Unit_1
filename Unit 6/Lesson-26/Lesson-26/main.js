/**
 * Main entry point
 * ----------------
 * Express + EJS + express-ejs-layouts
 * Sessions, flash, Passport, routers, security, logging, and graceful shutdown.
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
import apiRoutes from "./routes/apiRoutes.js";

// Models
import User from "./models/user.js";

// Shared error middlewares
import { notFound, errorHandler } from "./middlewares/errors.js";

// Load environment variables
dotenv.config();

// __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// App + config
const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URL =
  process.env.MONGO_URL || "mongodb://127.0.0.1:27017/recipe_db";
const SESSION_SECRET = process.env.SESSION_SECRET || "change-me";
const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PRODUCTION = NODE_ENV === "production";

// ---- MongoDB ----
mongoose.set("strictQuery", false);

mongoose
  .connect(MONGO_URL)
  .then(() => {
    console.log("✓ MongoDB connected");
  })
  .catch((err) => {
    console.error("✗ MongoDB connection error:", err);
    // Optional: process.exit(1);
  });

// ---- Trust proxy (so secure cookies work behind proxies like Nginx/Heroku) ----
// Safe to always set; only matters if behind a proxy.
app.set("trust proxy", 1);

// ---- Core middleware ----
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method")); // enables PUT/DELETE via forms ?_method=PUT
app.use(express.static(path.join(__dirname, "public")));

// ---- Security (Helmet) ----
// CSP tuned for:
// - Bootstrap 5 from jsDelivr
// - Inline scripts (your modal fetch, etc.)
// - Local assets in /public
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
        ],
        fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"], // fetch/XHR back to same origin
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false, // avoid issues with some third-party assets
  })
);

app.use(compression());
app.use(morgan(IS_PRODUCTION ? "combined" : "dev"));

// ---- Sessions (before flash & passport) ----
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: IS_PRODUCTION, // true only over HTTPS
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

// ---- Locals (after flash + passport) ----
app.use((req, res, next) => {
  res.locals.flashMessages = req.flash();
  res.locals.session = req.session;
  res.locals.loggedIn =
    typeof req.isAuthenticated === "function" ? req.isAuthenticated() : false;
  res.locals.currentUser = req.user || null;
  next();
});

// ---- View engine (EJS + express-ejs-layouts) ----
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Use express-ejs-layouts with a single master layout: views/layout.ejs
app.use(expressLayouts);
app.set("layout", "layout");

// ---- Routers ----
// APIs first (clean separation / no conflicts with HTML routes)
app.use("/api", apiRoutes);

// Main site routers
app.use("/", homeRouter); // "/", "/dashboard", etc. (whatever you defined)
app.use("/errors", errorsRouter);
app.use("/subscribers", subscribersRouter);
app.use("/users", usersRouter);
app.use("/courses", coursesRouter);

// ---- Fallback EJS routes for /home and /about ----
// If homeRouter already defines these, it will handle them first.
// If not, these keep your app working instead of sending static HTML.
app.get("/home", (req, res) => {
  res.render("home", { title: "Home — My Recipe Web" });
});

app.get("/about", (req, res) => {
  res.render("about", { title: "About — My Recipe Web" });
});

// ---- Health (simple JSON) ----
app.get("/health", (_req, res) => {
  res.json({ ok: true, env: NODE_ENV });
});

// ---- 404 and 500 handlers ----
app.use(notFound);
app.use(errorHandler);

// ---- Start server ----
const server = app.listen(PORT, () => {
  console.log(`→ Server running at http://localhost:${PORT} (${NODE_ENV})`);
});

// ---- Graceful shutdown (SIGINT/SIGTERM) ----
async function shutdown(signal) {
  console.log(`\n${signal} received. Closing server and MongoDB connection...`);
  try {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    console.log("✓ Shutdown complete.");
    process.exit(0);
  } catch (err) {
    console.error("Error during shutdown:", err);
    process.exit(1);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Optional: log unhandled rejections (does not kill process)
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});
