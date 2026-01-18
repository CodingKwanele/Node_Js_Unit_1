/**
 * @author: Kwanele Dladla
 * @description: Controller functions for managing subscribers (view, add, and list).
 */
// JSDoc comment block documenting the file's author and purpose

import Subscriber from "../models/subscribers.js";
// Imports the Subscriber model from the models directory to interact with the database

/**
 * GET /subscribers
 * Render the list of subscribers
 */
// JSDoc comment documenting the getAllSubscribers function and its route

export const getAllSubscribers = async (req, res) => {
// Exports an async function that handles GET requests; req = request object, res = response object
  try {
    // Starts error handling block
    const subscribers = await Subscriber.find()
    // Queries the database to find all subscriber documents
      .sort({ createdAt: -1 })
      // Sorts results by creation date in descending order (newest first)
      .lean();
    // Returns plain JavaScript objects instead of Mongoose documents for performance

    return res.render("subscribers", { subscribers });
    // Renders the "subscribers" view and passes the subscribers data to the template
  } catch (error) {
    // Catches any errors that occur during the try block
    console.error("Error retrieving subscribers:", error);
    // Logs the error to the console for debugging
    return res
      .status(500)
      // Sets HTTP status code to 500 (Internal Server Error)
      .json({ message: "Server error while retrieving subscribers." });
      // Sends a JSON error message to the client
  }
};

/**
 * GET /subscribers/contact
 * Render the subscription form
 */
// JSDoc comment documenting the getSubscriptionPage function and its route

export const getSubscriptionPage = (req, res) => {
// Exports a function that handles GET requests to display the subscription form
  return res.render("contact", {
  // Renders the "contact" view with initial data
    errors: {},
    // Empty errors object (no validation errors initially)
    values: { name: "", email: "", zipCode: "" },
    // Pre-fills form fields with empty strings
  });
};

/**
 * POST /subscribers/subscribe
 * Save a new subscriber
 */
// JSDoc comment documenting the saveSubscriber function and its route

export const saveSubscriber = async (req, res) => {
// Exports an async function that handles POST requests to save new subscribers
  try {
    // Starts error handling block
    const { name = "", email = "", zipCode = "" } = req.body;
    // Destructures form data from the request body with default empty string values

    if (!name.trim() || !email.trim()) {
    // Checks if name or email are empty after removing whitespace
      return res.status(400).render("contact", {
      // Returns 400 (Bad Request) and re-renders the form
        errors: { _general: "Name and Email are required." },
        // Shows validation error message
        values: { name, email, zipCode },
        // Retains the user's input for correction
      });
    }

    const cleanedEmail = email.trim().toLowerCase();
    // Removes whitespace and converts email to lowercase for consistency

    const exists = await Subscriber.findOne({ email: cleanedEmail }).lean();
    // Queries database to check if email already exists
    if (exists) {
    // If email is already subscribed
      return res.status(409).render("contact", {
      // Returns 409 (Conflict) and re-renders the form
        errors: { email: "This email is already subscribed." },
        // Shows duplicate email error
        values: { name, email, zipCode },
        // Retains the user's input
      });
    }

    await Subscriber.create({
    // Creates a new subscriber document in the database
      name: name.trim(),
      // Stores trimmed name
      email: cleanedEmail,
      // Stores cleaned email
      zipCode: zipCode.trim(),
      // Stores trimmed zip code
    });

    return res.redirect("/subscribers");
    // Redirects user to the subscribers list page after successful subscription
  } catch (error) {
  // Catches any unexpected errors
    console.error("Error saving subscriber:", error);
    // Logs the error for debugging
    return res.status(500).render("contact", {
    // Returns 500 (Server Error) and re-renders the form
      errors: { _general: "Unexpected error. Please try again." },
      // Shows generic error message
      values: req.body,
      // Retains the user's input
    });
  }
};
