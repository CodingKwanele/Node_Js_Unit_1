/**
 * Subscriber Controller
 * Full CRUD with validation and flash messaging.
 * Author: Kwanele Dladla
 */

import mongoose from "mongoose";
import Subscriber from "../models/subscribers.js";

const isValidZaPostal = (v) => /^\d{4}$/.test(String(v || "").trim());
const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());

const guardId = (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).render("error", { message: "Invalid subscriber ID." });
    return false;
  }
  return true;
};

// GET /subscribers
const showSubscribers = async (req, res) => {
  try {
    const subscribers = await Subscriber.find()
      .populate({ path: "courses", select: "title" })
      .sort({ createdAt: -1 })
      .lean();
    res.render("subscribers", { subscribers });
  } catch (err) {
    console.error("Error retrieving subscribers:", err);
    res.status(500).render("error", { message: "Failed to load subscribers." });
  }
};

// GET /contact
const showSubscriptionForm = (_req, res) =>
  res.render("contact", { errors: {}, values: { name: "", email: "", zipCode: "" } });

// POST /subscribe
const createSubscriber = async (req, res, next) => {
  try {
    const { name, email, zipCode } = req.body;
    const trimmed = {
      name: name?.trim(),
      email: email?.trim().toLowerCase(),
      zipCode: zipCode?.trim(),
    };
    const errors = {};
    if (!trimmed.name) errors.name = "Name required.";
    if (!trimmed.email) errors.email = "Email required.";
    else if (!isValidEmail(trimmed.email)) errors.email = "Invalid email.";
    if (trimmed.zipCode && !isValidZaPostal(trimmed.zipCode))
      errors.zipCode = "Postal must be 4 digits.";

    if (Object.keys(errors).length)
      return res.status(400).render("contact", { errors, values: trimmed });

    const exists = await Subscriber.findOne({ email: trimmed.email }).lean();
    if (exists) {
      req.flash("error", "This email is already subscribed.");
      res.locals.redirect = "/contact";
      return next();
    }

    await Subscriber.create({
      name: trimmed.name,
      email: trimmed.email,
      zipCode: trimmed.zipCode ? Number(trimmed.zipCode) : undefined,
    });

    req.flash("success", `${trimmed.name} subscribed successfully!`);
    res.locals.redirect = "/subscribers";
    return next();
  } catch (err) {
    console.error("Error saving subscriber:", err);
    req.flash("error", "Subscription failed.");
    res.locals.redirect = "/contact";
    return next();
  }
};

// GET /subscribers/:id/edit
const showEditSubscriberForm = async (req, res) => {
  if (!guardId(req, res)) return;
  const subscriber = await Subscriber.findById(req.params.id).lean();
  if (!subscriber) return res.status(404).render("error", { message: "Subscriber not found." });
  res.render("subscriber_edit", {
    errors: {},
    values: subscriber,
    id: subscriber._id,
  });
};

// PUT /subscribers/:id/update
const updateSubscriber = async (req, res, next) => {
  if (!guardId(req, res)) return;
  try {
    const sub = await Subscriber.findById(req.params.id);
    if (!sub) {
      req.flash("error", "Subscriber not found.");
      res.locals.redirect = "/subscribers";
      return next();
    }
    sub.name = req.body.name?.trim();
    sub.email = req.body.email?.trim().toLowerCase();
    sub.zipCode = req.body.zipCode ? Number(req.body.zipCode) : undefined;
    await sub.save();
    req.flash("success", "Subscriber updated.");
    res.locals.redirect = "/subscribers";
    next();
  } catch (err) {
    console.error("Error updating subscriber:", err);
    req.flash("error", "Update failed.");
    res.locals.redirect = "/subscribers";
    next();
  }
};

// DELETE /subscribers/:id/delete
const deleteSubscriber = async (req, res, next) => {
  if (!guardId(req, res)) return;
  try {
    await Subscriber.findByIdAndDelete(req.params.id);
    req.flash("success", "Subscriber deleted.");
    res.locals.redirect = "/subscribers";
    next();
  } catch (err) {
    console.error("Delete error:", err);
    req.flash("error", "Failed to delete subscriber.");
    res.locals.redirect = "/subscribers";
    next();
  }
};

const redirectView = (req, res, next) => {
  if (res.locals.redirect) return res.redirect(res.locals.redirect);
  next();
};

export default {
  showSubscribers,
  showSubscriptionForm,
  createSubscriber,
  showEditSubscriberForm,
  updateSubscriber,
  deleteSubscriber,
  redirectView,
};
