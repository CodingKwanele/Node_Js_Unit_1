// routes/subscribers.js
// Public subscribe form + admin management

import express from "express";
import { body, param, query } from "express-validator";
import { ensureAuthenticated } from "../middlewares/auth.js";
import { limitPublicPosts } from "../middlewares/ratelimit.js";
import validateSubscriber from "../middlewares/validateSubscriber.js";
import subscriberController from "../controllers/subscribersController.js";

const router = express.Router();

// VALIDATORS
const validateId = [param("id").isMongoId().withMessage("Invalid subscriber id")];
const validateIndexQuery = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt()
];

// PUBLIC
router.get("/contact", subscriberController.showSubscriptionForm);
router.post(
  "/subscribe",
  limitPublicPosts,            // rate-limit public form posts
  validateSubscriber,          // validate + sanitize (renders with errors on fail)
  [
    // Optional extra guards if you still want express-validator in addition
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
    body("message").optional().trim().isLength({ max: 2000 }).withMessage("Message too long")
  ],
  subscriberController.createSubscriber,
  subscriberController.redirectView
);

// ADMIN (AUTH REQUIRED)
router.get("/", ensureAuthenticated, validateIndexQuery, subscriberController.showSubscribers);
router.get("/:id/edit", ensureAuthenticated, validateId, subscriberController.showEditSubscriberForm);
router.put(
  "/:id/update",
  ensureAuthenticated,
  validateId,
  [
    body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
    body("email").optional().isEmail().withMessage("Provide a valid email").normalizeEmail()
  ],
  subscriberController.updateSubscriber,
  subscriberController.redirectView
);
router.delete("/:id/delete", ensureAuthenticated, validateId, subscriberController.deleteSubscriber, subscriberController.redirectView);

export default router;
