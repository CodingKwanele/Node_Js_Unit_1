/**
 * @author: Kwanele Dladla
 * @description: Main entry (Express + EJS + static HTML)
 * Adds sessions + flash messages + routers (users/courses/subscribers)
 */

import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// session + flash imports (ESM style)
import session from "express-session";
import flash from "connect-flash";

// Routers
import subscribersRouter from "./routes/subscribers.js";
import usersRouter from "./routes/users.js";
import coursesRouter from "./routes/courses.js";

dotenv.config();

// __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// App + config
const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URL =
  process.env.MONGO_URL || "mongodb://127.0.0.1:27017/recipe_db";

// ---- MongoDB ----
mongoose.set("strictQuery", false);

mongoose
  .connect(MONGO_URL)
  .then(() => console.log(" MongoDB connected"))
  .catch((err) => console.error(" MongoDB connection error:", err));

// ---- Core middleware ----
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // parse form POST
app.use(express.static(path.join(__dirname, "public"))); // serve /public

// ---- Sessions + Flash (must come BEFORE routes that use req.flash) ----
app.use(
  session({
    secret: "secret_passcode", // TODO: put in process.env.SESSION_SECRET in production
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 60000, // 1 minute demo session timeout
    },
  })
);

// flash depends on session
app.use(flash());

// expose flash + session to ALL views
app.use((req, res, next) => {
  res.locals.flashMessages = req.flash();
  res.locals.session = req.session;
  next();
});

// ---- View engine (EJS) ----
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// ---- Static HTML routes for public pages ----
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "home.html"));
});

app.get("/home", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "home.html"));
});

app.get("/about", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "about.html"));
});

// ---- Dynamic feature routers ----
// subscribersRouter exposes: GET /subscribers, GET /contact, POST /subscribe
app.use("/", subscribersRouter);

// users pages & actions (/users, /users/new, /users/login, etc.)
app.use("/", usersRouter);

// courses pages & actions (/courses, etc.)
app.use("/", coursesRouter);

// ---- Health check ----
app.get("/health", (_req, res) => res.json({ ok: true }));

// ---- 404 handler (must come AFTER all normal routes) ----
app.use((req, res) => {
  const static404 = path.join(__dirname, "views", "error.html");
  res.status(404).sendFile(static404, (err) => {
    if (err) {
      res.status(404).type("text").send("Not Found");
    }
  });
});

// ---- 500 handler (error middleware: has 4 params) ----
app.use((err, req, res, next) => {
  console.error("Internal server error:", err);
  const static500 = path.join(__dirname, "views", "error.html");
  res.status(500).sendFile(static500, (e) => {
    if (e) {
      res.status(500).type("text").send("Internal Server Error");
    }
  });
});

// ---- Start server ----
app.listen(PORT, () => {
  console.log(` Server running at http://localhost:${PORT}`);
});
