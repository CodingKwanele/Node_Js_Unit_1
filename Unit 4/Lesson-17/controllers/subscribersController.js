/**
 * @author: Kwanele Dladla
 * @description: Controller functions for managing subscribers (view, add, and list).
 */

import express from "express";
import Subscriber from "../models/subscribers.js";

const subscribersRouter = express.Router();

/**
 * GET /subscribers
 * Render the list of subscribers
 */
const getAllSubscribers = async (req, res) => {
  try {
    const subscribers = await Subscriber.find().sort({ createdAt: -1 }).lean();
    res.render("subscribers", { subscribers });
  } catch (error) {
    console.error("Error retrieving subscribers:", error);
    res.status(500).json({ message: "Server error while retrieving subscribers." });
  }
};

/**
 * GET /contact
 * Render the subscription form
 */
const getSubscriptionPage = (req, res) => {
  res.render("contact", { errors: {}, values: { name: "", email: "", zipCode: "" } });
};

/**
 * POST /subscribe
 * Save a new subscriber
 */
const saveSubscriber = async (req, res) => {
  try {
    const { name = "", email = "", zipCode = "" } = req.body;

    if (!name.trim() || !email.trim()) {
      return res.status(400).render("contact", {
        errors: { _general: "Name and Email are required." },
        values: { name, email, zipCode }
      });
    }

    // optional: block duplicate emails
    const exists = await Subscriber.findOne({ email: email.trim() });
    if (exists) {
      return res.status(409).render("contact", {
        errors: { email: "This email is already subscribed." },
        values: { name, email, zipCode }
      });
    }

    await new Subscriber({ name: name.trim(), email: email.trim(), zipCode: zipCode.trim() }).save();
    res.redirect("/subscribers");
  } catch (error) {
    console.error("Error saving subscriber:", error);
    res.status(500).render("contact", {
      errors: { _general: "Unexpected error. Please try again." },
      values: req.body
    });
  }
};

// Router only handles /subscribers
subscribersRouter.get("/", getAllSubscribers);

export default subscribersRouter;
export { getAllSubscribers, getSubscriptionPage, saveSubscriber };
