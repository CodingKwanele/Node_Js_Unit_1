// routes/subscribers.js
// Public subscribe form + admin management

import express from "express";
import { body, param, query } from "express-validator";
import { ensureAuthenticated } from "../middlewares/auth.js";
import { limitPublicPosts } from "../middlewares/ratelimit.js"; // optional
import subscriberController from "../controllers/subscribersController.js";

const router = express.Router();

/* -----------------------------------------
   VALIDATORS
----------------------------------------- */
const validateId = [param("id").isMongoId().withMessage("Invalid subscriber id")];
const validateIndexQuery = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt()
];

/* -----------------------------------------
   PUBLIC
   Mounted at /subscribers
----------------------------------------- */

// GET /subscribers/contact – show form
router.get("/contact", subscriberController.showSubscriptionForm);

// POST /subscribers/subscribe – create subscription
router.post(
  "/subscribe",
  limitPublicPosts, 
  
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
    body("message")
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage("Message too long")
  ],
  subscriberController.createSubscriber,
  subscriberController.redirectView
);

/* -----------------------------------------
   ADMIN (AUTH REQUIRED)
----------------------------------------- */

// GET /subscribers – list subscribers (supports ?page=&limit=)
router.get("/", ensureAuthenticated, validateIndexQuery, subscriberController.showSubscribers);

// GET /subscribers/:id/edit – edit form
router.get("/:id/edit", ensureAuthenticated, validateId, subscriberController.showEditSubscriberForm);

// PUT /subscribers/:id/update – update
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

// DELETE /subscribers/:id/delete – delete
router.delete(
  "/:id/delete",
  ensureAuthenticated,
  validateId,
  subscriberController.deleteSubscriber,
  subscriberController.redirectView
);

export default router;
