/**
 * @author: Kwanele Dladla
 * @description: Subscribers controller (full CRUD) with SA postal validation,
 * email normalization, basic ID guards, flashes, and redirect middleware.
 */

import mongoose from "mongoose";
import Subscriber from "../models/subscribers.js";

/* ------------------------------- helpers ---------------------------------- */

const isValidZaPostal = (v) => /^\d{4}$/.test(String(v || "").trim());
const isValidEmail = (v) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());

export const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated?.()) return next();
  req.flash("error", "Please log in to continue.");
  res.redirect("/users/login");
};

const guardId = (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    res.status(404).render("error", { message: "Not found." });
    return false;
  }
  return true;
};

/* --------------------------------- actions -------------------------------- */

// GET /subscribers — list all with populated courses
const showSubscribers = async (req, res) => {
  try {
    const subscribers = await Subscriber.find()
      .populate({ path: "courses", select: "title" })
      .sort({ createdAt: -1 })
      .lean();

    res.render("subscribers", { subscribers });
  } catch (error) {
    console.error("Error retrieving subscribers:", error);
    res.status(500).render("error", { message: "Failed to load subscribers." });
  }
};

const showSubscriptionForm = (_req, res) =>
  res.render("contact", { title: "Subscribe — My Recipe Web", errors: {}, values: {} });

// POST /subscribe — create new subscriber
const createSubscriber = async (req, res, next) => {
  try {
    let { name = "", email = "", zipCode = "" } = req.body;
    name = String(name).trim();
    email = String(email).trim().toLowerCase();
    zipCode = String(zipCode).trim();

    const errors = {};
    if (!name) errors.name = "Name is required.";
    if (!email) errors.email = "Email is required.";
    else if (!isValidEmail(email)) errors.email = "Enter a valid email address.";
    if (zipCode && !isValidZaPostal(zipCode)) {
      errors.zipCode = "Postal code must be 4 digits (ZA).";
    }

    if (Object.keys(errors).length) {
      return res.status(400).render("contact", {
        errors,
        values: { name, email, zipCode },
      });
    }

    // Prevent duplicates
    const exists = await Subscriber.findOne({ email }).lean();
    if (exists) {
      req.flash("error", "This email is already subscribed.");
      res.locals.redirect = "/contact";
      return next();
    }

    await Subscriber.create({
      name,
      email,
      zipCode: zipCode ? Number(zipCode) : undefined,
    });

    req.flash("success", `${name} subscribed successfully!`);
    res.locals.redirect = "/subscribers";
    return next();
  } catch (error) {
    console.error("Error saving subscriber:", error);
    if (error?.code === 11000) {
      req.flash("error", "This email is already subscribed.");
      res.locals.redirect = "/contact";
      return next();
    }
    req.flash("error", "Failed to create subscriber. Please try again.");
    res.locals.redirect = "/contact";
    return next();
  }
};

// GET /subscribers/:id/edit — show edit form
const showEditSubscriberForm = async (req, res) => {
  if (!guardId(req, res)) return;
  try {
    const subscriber = await Subscriber.findById(req.params.id).lean();
    if (!subscriber) {
      return res.status(404).render("error", { message: "Subscriber not found." });
    }

    return res.render("subscriber_edit", {
      errors: {},
      values: {
        name: subscriber.name ?? "",
        email: subscriber.email ?? "",
        zipCode: subscriber.zipCode ?? "",
      },
      id: subscriber._id,
    });
  } catch (error) {
    console.error("Error loading subscriber:", error);
    return res.status(500).render("error", { message: "Failed to load subscriber." });
  }
};

// POST /subscribers/:id — update subscriber
const updateSubscriber = async (req, res, next) => {
  if (!guardId(req, res)) return;
  try {
    let { name = "", email = "", zipCode = "" } = req.body;
    name = String(name).trim();
    email = String(email).trim().toLowerCase();
    zipCode = String(zipCode).trim();

    const errors = {};
    if (!name) errors.name = "Name is required.";
    if (!email) errors.email = "Email is required.";
    else if (!isValidEmail(email)) errors.email = "Enter a valid email address.";
    if (zipCode && !isValidZaPostal(zipCode)) {
      errors.zipCode = "Postal code must be 4 digits (ZA).";
    }

    if (Object.keys(errors).length) {
      return res.status(400).render("subscriber_edit", {
        errors,
        values: { name, email, zipCode },
        id: req.params.id,
      });
    }

    const subscriber = await Subscriber.findById(req.params.id);
    if (!subscriber) {
      req.flash("error", "Subscriber not found.");
      res.locals.redirect = "/subscribers";
      return next();
    }

    subscriber.name = name;
    subscriber.email = email;
    subscriber.zipCode = zipCode ? Number(zipCode) : undefined;

    await subscriber.save();

    req.flash("success", "Subscriber updated successfully.");
    res.locals.redirect = "/subscribers";
    return next();
  } catch (error) {
    console.error("Error updating subscriber:", error);
    if (error?.code === 11000) {
      return res.status(409).render("subscriber_edit", {
        errors: { email: "A subscriber with this email already exists." },
        values: { ...req.body },
        id: req.params.id,
      });
    }
    req.flash("error", `Failed to update subscriber: ${error.message}`);
    res.locals.redirect = "/subscribers";
    return next();
  }
};

// POST /subscribers/:id/delete — delete subscriber
const deleteSubscriber = async (req, res, next) => {
  if (!guardId(req, res)) return;
  try {
    const deleted = await Subscriber.findByIdAndDelete(req.params.id);
    if (!deleted) {
      req.flash("error", "Subscriber not found.");
    } else {
      req.flash("success", "Subscriber deleted successfully.");
    }
    res.locals.redirect = "/subscribers";
    return next();
  } catch (error) {
    console.error("Error deleting subscriber:", error);
    req.flash("error", "Failed to delete subscriber.");
    res.locals.redirect = "/subscribers";
    return next();
  }
};

// Redirect middleware (same as user controller)
const redirectView = (req, res, next) => {
  const redirectPath = res.locals.redirect;
  if (redirectPath) res.redirect(redirectPath);
  else next();
};

export default {
  showSubscribers,
  showSubscriptionForm,
  createSubscriber,
  showEditSubscriberForm,
  updateSubscriber,
  deleteSubscriber,
  redirectView,
  ensureAuthenticated,
};
