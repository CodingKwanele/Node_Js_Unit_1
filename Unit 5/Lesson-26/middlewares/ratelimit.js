// middlewares/ratelimit.js
import rateLimit from "express-rate-limit";

export const limitPublicPosts = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // max 5 requests/minute per IP
  message: "Too many requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
