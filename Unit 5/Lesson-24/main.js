/**
 * Main entry (Express + EJS + static HTML)
 * Sessions + flash + Passport + routers (users/courses/subscribers)
 */
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
// Import the package passport 
import passport from "passport";
import session from "express-session";
import flash from "connect-flash";

// Routers
import subscribersRouter from "./routes/subscribers.js";
import usersRouter from "./routes/users.js";
import coursesRouter from "./routes/courses.js";
import methodOverride from "method-override";



// Models
import User from "./models/user.js";

dotenv.config();

// __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// App + config
const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/recipe_db";
const SESSION_SECRET = process.env.SESSION_SECRET || "change-me";

// ---- MongoDB ----
mongoose.set("strictQuery", false);
mongoose
  .connect(MONGO_URL)
  .then(() => console.log(" MongoDB connected"))
  .catch((err) => console.error(" MongoDB connection error:", err));


  
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

// ---- Core middleware ----
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ---- Sessions (before flash & passport) ----
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // set true behind HTTPS + trust proxy
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
// Initializes passport 
app.use(passport.initialize());
// The method passpor.session tells us to continue with the session, the user is on. 
app.use(passport.session());

// ---- Locals (after flash + passport) ----
app.use((req, res, next) => {
  res.locals.flashMessages = req.flash();
  res.locals.session = req.session;
  res.locals.loggedIn = req.isAuthenticated();
  res.locals.currentUser = req.user || null;
  next();
});

// ---- View engine (EJS) ----
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// ---- Static HTML routes ----
app.get("/", (req, res) => res.redirect("/users/login"));
app.get("/home", (req, res) => res.sendFile(path.join(__dirname, "views", "home.html")));
app.get("/about", (req, res) => res.sendFile(path.join(__dirname, "views", "about.html")));

// ---- Feature routers ----
app.use("/", subscribersRouter);
app.use("/", usersRouter);
app.use("/", coursesRouter);

// ---- Health ----
app.get("/health", (_req, res) => res.json({ ok: true }));

// ---- 404 ----
app.use((req, res) => {
  const static404 = path.join(__dirname, "views", "error.html");
  res.status(404).sendFile(static404, (err) => {
    if (err) res.status(404).type("text").send("Not Found");
  });
});

// ---- 500 ----
app.use((err, req, res, next) => {
  console.error("Internal server error:", err);
  const static500 = path.join(__dirname, "views", "error.html");
  res.status(500).sendFile(static500, (e) => {
    if (e) res.status(500).type("text").send("Internal Server Error");
  });
});

// ---- Start ----
app.listen(PORT, () => {
  console.log(` Server running at http://localhost:${PORT}`);
});
