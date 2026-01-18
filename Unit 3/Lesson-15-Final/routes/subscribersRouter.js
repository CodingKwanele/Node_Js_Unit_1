import express from "express";
import { getAllSubscribers } from "../controllers/subscribersController.js";

const subscribersRouter = express.Router();

subscribersRouter.get("/", getAllSubscribers);

export default subscribersRouter;
