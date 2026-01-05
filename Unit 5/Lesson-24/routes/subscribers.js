// routes/subscribers.js
import express from "express";
import subscriberController from "../controllers/subscribersController.js";

const router = express.Router();

// List / New / Create
router.get("/subscribers", subscriberController.showSubscribers);
router.get("/contact", subscriberController.showSubscriptionForm);
router.post("/subscribe", subscriberController.createSubscriber, subscriberController.redirectView);

// Edit / Update / Delete
router.get("/subscribers/:id/edit", subscriberController.showEditSubscriberForm);
router.post("/subscribers/:id", subscriberController.updateSubscriber, subscriberController.redirectView);
router.post("/subscribers/:id/delete", subscriberController.deleteSubscriber, subscriberController.redirectView);

export default router;