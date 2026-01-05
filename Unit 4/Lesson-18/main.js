/**
 * @author: Kwanele Dladla
 * @description: Main entry (Express + EJS + static HTML) with Users/Courses/Subscribers routes
 */

import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// ---- Routers ----
import subscribersRouter from "./routes/subscribers.js"; // handles /subscribers, /contact, /subscribe
import usersRouter from "./routes/users.js";             // handles /users...
import coursesRouter from "./routes/courses.js";         // handles /courses...

dotenv.config();

// __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// App + config
const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/recipe_db";

// ---- MongoDB ----
mongoose.set("strictQuery", false);

mongoose
  .connect(MONGO_URL)
  .then(() => console.log(" MongoDB connected"))
  .catch((err) => console.error(" MongoDB connection error:", err));

// ---- Middleware ----
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // form POSTs
app.use(express.static(path.join(__dirname, "public"))); // css/js/images

// ---- View engine (EJS) ----
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// ---- Static HTML pages ----
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "home.html"));
});

app.get("/home", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "home.html"));
});

app.get("/about", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "about.html"));
});

// ---- Dynamic (EJS) routes ----
// subscribersRouter exposes: GET /subscribers, GET /contact, POST /subscribe
app.use("/", subscribersRouter);

// users + courses pages & actions
app.use("/", usersRouter);
app.use("/", coursesRouter);

// ---- Health check ----
app.get("/health", (_req, res) => res.json({ ok: true }));

// ---- 404 ----
app.use((req, res) => {
  // Serve your static 404 page if present; otherwise render a generic EJS error page
  const static404 = path.join(__dirname, "views", "error.html");
  res.status(404).sendFile(static404, (err) => {
    if (err) {
      res.status(404).type("text").send("Not Found");
    }
  });
});

// ---- 500 ----
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
