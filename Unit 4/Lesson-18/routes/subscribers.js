// routes/subscribers.js
import express from "express";
import subscriberController from "../controllers/subscribersController.js";
const router = express.Router();

router.get("/subscribers", subscriberController.showSubscribers);
router.get("/contact", subscriberController.showSubscriptionForm);
router.post("/subscribe", subscriberController.createSubscriber);

export default router;
