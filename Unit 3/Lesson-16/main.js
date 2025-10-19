/**
 * @author: Kwanele Dladla
 * @description: Main entry point (Express + EJS + static HTML)
 */

import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Controllers / Routers
import subscribersRouter, {
    getSubscriptionPage,
    saveSubscriber,
} from "./controllers/subscribersController.js";

import validateSubscriber from "./middlewares/validateSubscriber.js";

dotenv.config();

// __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Application variables
let app;
let PORT;
let MONGO_URL;

app = express();
PORT = process.env.PORT || 3000;

MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/recipe_db";

// --- MongoDB setup ---
mongoose.set("strictQuery", false);

mongoose
    .connect(MONGO_URL)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB connection error:", err));

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // for form POSTs
app.use(express.static(path.join(__dirname, "public"))); // css/js/images

// --- View engine (EJS for dynamic pages) ---
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// --- Static HTML routes (served as files) ---
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "home.html"));
});

app.get("/about", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "about.html"));
});

// --- EJS routes (dynamic) ---
app.use("/subscribers", subscribersRouter); // GET /subscribers
app.get("/contact", getSubscriptionPage);   // GET /contact -> contact.ejs
app.post("/subscribe", validateSubscriber, saveSubscriber);

// --- Health check ---
app.get("/health", (_req, res) => res.json({ ok: true }));

// --- 404 handler ---
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, "views", "error.html"));
});

// --- 500 handler ---
app.use((err, req, res, next) => {
    console.error("Internal server error:", err);
    try {
        res.status(500).sendFile(path.join(__dirname, "views", "error.html"));
    } catch {
        res.status(500).type("text").send("Internal Server Error");
    }
});

// --- Start server ---
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
