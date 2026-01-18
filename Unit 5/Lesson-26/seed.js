// seed.js  (run: node seed.js)
// Requires: models already set up with passport-local-mongoose on User

import mongoose from "mongoose";
import dotenv from "dotenv";

import User from "./models/user.js";
import Course from "./models/course.js";
import Subscriber from "./models/subscribers.js";

dotenv.config();

const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/recipe_db";
const CLEAN = (process.env.CLEAN || "false").toLowerCase() === "true";

const log = (...args) => console.log("[seed]", ...args);

try {
  log("Connecting to Mongo…");
  await mongoose.connect(MONGO_URL);
  log("Connected.");

  // Ensure indexes (unique constraints, etc.)
  await Promise.all([User.init(), Course.init(), Subscriber.init()]);

  if (CLEAN) {
    log("CLEAN=true → wiping collections…");
    await Promise.all([
      User.deleteMany({}),
      Course.deleteMany({}),
      Subscriber.deleteMany({}),
    ]);
  }

  // ---------- Upsert a Course ----------
  const course1 = await Course.findOneAndUpdate(
    { title: "Node.js Fundamentals" },
    {
      title: "Node.js Fundamentals",
      description: "Learn routes, controllers, MongoDB",
      items: ["routes", "controllers", "mongoose"],
      zipCode: 12345,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  log("Upserted course:", course1.title);

  // ---------- Upsert a Subscriber ----------
  const sub1 = await Subscriber.findOneAndUpdate(
    { email: "jon@jonwexler.com" },
    { name: "Jon", email: "jon@jonwexler.com", zipCode: 12345 },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Ensure subscriber has course linked (addToSet behavior)
  if (!sub1.courses?.some((id) => id.equals(course1._id))) {
    sub1.courses.push(course1._id);
    await sub1.save();
    log("Linked course to subscriber:", sub1.email);
  }

  // ---------- Register Users via Passport ----------
  // NOTE: With passport-local-mongoose, DO NOT set a `password` field on the doc.
  // Use `User.register(new User({...}), plainTextPassword)`

  const usersToRegister = [
    {
      doc: {
        name: { first: "Jon", last: "Wexler" },
        email: "jon@jonwexler.com",
        zipCode: 12345,
        courses: [course1._id],
      },
      password: "secret123", // demo
    },
    {
      doc: {
        name: { first: "Ada", last: "Lovelace" },
        email: "ada@example.com",
        zipCode: 54321,
      },
      password: "secret123",
    },
  ];

  for (const { doc, password } of usersToRegister) {
    // If a user already exists (from prior runs), skip registering to avoid UserExistsError
    const existing = await User.findOne({ email: doc.email });
    if (existing) {
      log(`User exists, skipping register: ${doc.email}`);
      continue;
    }

    const created = await User.register(new User(doc), password);
    log("Registered:", created.email);

    // Auto-link subscriber if emails match
    const sub = await Subscriber.findOne({ email: created.email }).lean();
    if (sub) {
      await User.findByIdAndUpdate(
        created._id,
        { $set: { subscriberAccount: sub._id } },
        { runValidators: true, context: "query" }
      );
      log("Linked subscriberAccount for:", created.email);
    }
  }

  // ---------- Show results ----------
  const users = await User.find().lean();
  log("Users in DB:", users.map(u => ({
    email: u.email,
    hasHash: !!u.hash, // passport-local-mongoose fields
    hasSalt: !!u.salt,
    hasPasswordField: "password" in u, // should be false
  })));

  const subs = await Subscriber.find().populate("courses").lean();
  log("Subscribers:", subs.map(s => ({
    email: s.email,
    courses: (s.courses || []).map(c => c.title),
  })));

  await mongoose.disconnect();
  log("Done. Disconnected.");
} catch (err) {
  console.error("[seed] Error:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
}
