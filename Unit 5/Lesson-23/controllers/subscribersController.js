/**
 * @author: Kwanele Dladla
 * @description: Controller functions for managing subscribers (view, add, and list).
 */

// controllers/subscriberController.js
import Subscriber from "../models/subscribers.js";

const showSubscribers = async (req, res) => {
  try {
    const subscribers = await Subscriber.find().sort({ createdAt: -1 }).lean();
    res.render("subscribers", { subscribers });
  } catch (error) {
    console.error("Error retrieving subscribers:", error);
    res.status(500).render("error", { message: "Failed to load subscribers." });
  }
};

const showSubscriptionForm = (req, res) => {
  res.render("contact", { errors: {}, values: { name: "", email: "", zipCode: "" } });
};

const createSubscriber = async (req, res) => {
  try {
    let { name = "", email = "", zipCode = "" } = req.body;
    name = String(name).trim();
    email = String(email).trim().toLowerCase();
    zipCode = String(zipCode).trim();

    const errors = {};
    if (!name) errors.name = "Name is required.";
    if (!email) errors.email = "Email is required.";
    if (zipCode && !/^\d{5}$/.test(zipCode)) errors.zipCode = "Zip code must be 5 digits.";
    if (Object.keys(errors).length) {
      return res.status(400).render("contact", { errors, values: { name, email, zipCode } });
    }

    const exists = await Subscriber.findOne({ email });
    if (exists) {
      return res.status(409).render("contact", {
        errors: { email: "This email is already subscribed." },
        values: { name, email, zipCode }
      });
    }

    await Subscriber.create({
      name,
      email,
      zipCode: zipCode ? Number(zipCode) : undefined
    });

    res.redirect("/subscribers");
  } catch (error) {
    console.error("Error saving subscriber:", error);
    if (error?.code === 11000) {
      return res.status(409).render("contact", {
        errors: { email: "This email is already subscribed." },
        values: req.body
      });
    }
    res.status(500).render("contact", {
      errors: { _general: "Unexpected error. Please try again." },
      values: req.body
    });
  }
};

export default {
  showSubscribers,
  showSubscriptionForm,
  createSubscriber,
};
