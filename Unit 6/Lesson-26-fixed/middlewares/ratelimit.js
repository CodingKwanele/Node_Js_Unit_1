import rateLimit from "express-rate-limit";

export const limitPublicPosts = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests/minute/IP
  message: "Too many requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
