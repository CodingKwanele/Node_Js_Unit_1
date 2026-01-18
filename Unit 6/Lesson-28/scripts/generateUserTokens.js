import mongoose from "mongoose";
import randToken from "rand-token";
import User from "../models/user.js";

const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/recipe_db";

if (!MONGO_URI) {
  console.error("Missing MONGODB_URI (or MONGO_URI) in your environment.");
  process.exit(1);
}

await mongoose.connect(MONGO_URI);

// find users missing token
const users = await User.find({
  $or: [{ apiToken: { $exists: false } }, { apiToken: null }, { apiToken: "" }],
}).select("_id email apiToken");

let updated = 0;

for (const u of users) {
  u.apiToken = randToken.generate(16);
  await u.save();
  updated += 1;
  console.log(`[token-set] ${u.email}: ${u.apiToken}`);
}

console.log(`Done. Updated ${updated} users.`);
await mongoose.disconnect();
process.exit(0);
