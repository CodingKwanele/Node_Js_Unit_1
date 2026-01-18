/**
 * Main entry (Express + EJS + static HTML)
 * Sessions, flash, Passport, routers, and error handling
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

// Routers
import homeRouter from "./routes/home.js";
import errorsRouter from "./routes/errors.js";
import subscribersRouter from "./routes/subscribers.js";
import usersRouter from "./routes/users.js";
import coursesRouter from "./routes/courses.js";

import expressLayouts from "express-ejs-layouts";

// Models
import User from "./models/user.js";

// Shared error middlewares
import { notFound, errorHandler } from "./middlewares/errors.js";

dotenv.config();

// __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// App + config
const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/recipe_db";
const SESSION_SECRET = process.env.SESSION_SECRET || "change-me";
const NODE_ENV = process.env.NODE_ENV || "development";

// ---- MongoDB ----
mongoose.set("strictQuery", false);
mongoose
  .connect(MONGO_URL)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// ---- Trust proxy (so secure cookies work behind proxies like Nginx/Heroku) ----
app.set("trust proxy", 1);

// ---- Core middleware ----
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method")); // enables PUT/DELETE via forms ?_method=PUT
app.use(express.static(path.join(__dirname, "public")));
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
      secure: NODE_ENV === "production", // true only over HTTPS
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
  res.locals.loggedIn = typeof req.isAuthenticated === "function" ? req.isAuthenticated() : false;
  res.locals.currentUser = req.user || null;
  next();
});



// ---- View engine (EJS) ----
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");


app.use(expressLayouts);
app.set("layout", "layout"); // looks for views/layout.ejs
// ---- Routers ----
app.use("/", homeRouter);         // "/", "/dashboard", maybe "/health"
app.use("/errors", errorsRouter); // "/errors/404", "/errors/500", "/errors/boom"
app.use("/subscribers", subscribersRouter);
app.use("/users", usersRouter);
app.use("/courses", coursesRouter);

// ---- Static HTML routes (optional; you can convert to EJS later) ----
app.get("/home", (_req, res) => res.sendFile(path.join(__dirname, "views", "home.html")));
app.get("/about", (_req, res) => res.sendFile(path.join(__dirname, "views", "about.html")));

// ---- Health (safe even if home router also exposes it) ----
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
