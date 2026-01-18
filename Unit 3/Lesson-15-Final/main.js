/**
 * @author: Kwanele Dladla
 * @description: Main entry point (Express + EJS + static HTML)
 */

// Import the Express framework for building web applications
import express from "express";
// Import Mongoose for MongoDB object modeling
import mongoose from "mongoose";
// Import dotenv to load environment variables from .env file
import dotenv from "dotenv";
// Import Node.js path utilities for file path operations
import path from "path";
// Import utility to convert file URL to file path in ES modules
import { fileURLToPath } from "url";

// Routers
// Import the subscribers router that handles subscriber-related routes
import subscribersRouter from "./routes/subscribersRouter.js";

// Controllers
// Import controller functions for handling subscription page and saving subscribers
import {
    getSubscriptionPage,
    saveSubscriber,
} from "./controllers/subscribersController.js";

// Middleware
// Import custom middleware to validate subscriber data
import validateSubscriber from "./middlewares/validateSubscriber.js";

// Load environment variables from .env file into process.env
dotenv.config();

// Get the current file path in ES modules (equivalent to __filename in CommonJS)
const __filename = fileURLToPath(import.meta.url);
// Get the directory name of the current file (equivalent to __dirname in CommonJS)
const __dirname = path.dirname(__filename);

// Create an Express application instance
const app = express();
// Get the port from environment variables, default to 3000
const PORT = process.env.PORT || 3000;
// Get MongoDB connection URL from environment variables, default to local MongoDB
const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/recipe_db";

// --- MongoDB setup ---
// Disable strict query mode to allow flexible querying in Mongoose
mongoose.set("strictQuery", false);

// Attempt to connect to MongoDB
mongoose
    .connect(MONGO_URL)
    // Log success message when connected
    .then(() => console.log("MongoDB connected"))
    // Log error if connection fails
    .catch((err) => console.error("MongoDB connection error:", err));

// --- Middleware ---
// Parse incoming JSON request bodies
app.use(express.json());
// Parse incoming URL-encoded request bodies (form data)
app.use(express.urlencoded({ extended: true }));
// Serve static files (CSS, JS, images) from the public directory
app.use(express.static(path.join(__dirname, "public")));

// --- View engine ---
// Set the directory where EJS template files are located
app.set("views", path.join(__dirname, "views"));
// Set EJS as the template engine for rendering dynamic HTML
app.set("view engine", "ejs");

// --- Static HTML ---
// Handle GET request to "/" and send the home.html file
app.get("/", (_req, res) => {
    res.sendFile(path.join(__dirname, "views", "home.html"));
});

// Handle GET request to "/home" and send the home.html file
app.get("/home", (_req, res) => {
    res.sendFile(path.join(__dirname, "views", "home.html"));
});

// Handle GET request to "/about" and send the about.html file
app.get("/about", (_req, res) => {
    res.sendFile(path.join(__dirname, "views", "about.html"));
});

// --- Dynamic routes ---
// Mount the subscribers router at the "/subscribers" path
app.use("/subscribers", subscribersRouter);
// Handle GET request to "/contact" and display the subscription page
app.get("/contact", getSubscriptionPage);
// Handle POST request to "/subscribe" with validation middleware, then save subscriber
app.post("/subscribe", validateSubscriber, saveSubscriber);

// --- Health check ---
// Handle GET request to "/health" and return JSON indicating server is healthy
app.get("/health", (_req, res) => res.json({ ok: true }));

// --- 404 handler ---
// Catch all unmatched routes and send the error.html file with 404 status
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, "views", "error.html"));
});

// --- 500 handler ---
// Error handling middleware that catches errors and sends error.html with 500 status
app.use((err, req, res, next) => {
    console.error("Internal server error:", err);
    res.status(500).sendFile(path.join(__dirname, "views", "error.html"));
});

// --- Start server ---
// Start the Express server and listen on the specified port
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
