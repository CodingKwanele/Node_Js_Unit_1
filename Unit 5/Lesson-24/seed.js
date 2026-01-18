// seed.js  (run: node seed.js)
// Optional wipe: CLEAN=true node seed.js
// Requires: User model uses passport-local-mongoose

import mongoose from "mongoose";
import dotenv from "dotenv";

import User from "./models/user.js";
import Course from "./models/course.js";
import Subscriber from "./models/subscribers.js";

dotenv.config();

const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/recipe_db";
const CLEAN = (process.env.CLEAN || "false").toLowerCase() === "true";

const log = (...args) => console.log("[seed]", ...args);

const ZA_POSTAL = {
  JHB: 22001,
  CPT: 80201,
};

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
      // NOTE: removed zipCode from course (only keep if your Course schema needs it)
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  );
  log("Upserted course:", course1.title);

  // ---------- Upsert a Subscriber ----------
  const sub1 = await Subscriber.findOneAndUpdate(
    { email: "jon@jonwexler.com" },
    { name: "Jon", email: "jon@jonwexler.com", zipCode: ZA_POSTAL.JHB },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  );

  // Ensure subscriber has course linked
  if (!sub1.courses?.some((id) => id.equals(course1._id))) {
    sub1.courses = sub1.courses || [];
    sub1.courses.push(course1._id);
    await sub1.save();
    log("Linked course to subscriber:", sub1.email);
  } else {
    log("Subscriber already has course:", sub1.email);
  }

  // ---------- Register / Update Users via Passport ----------
  const usersToRegister = [
    {
      doc: {
        name: { first: "Jon", last: "Wexler" },
        email: "jon@jonwexler.com",
        zipCode: ZA_POSTAL.JHB,
        courses: [course1._id],
      },
      password: "secret123", // demo
    },
    {
      doc: {
        name: { first: "Ada", last: "Lovelace" },
        email: "ada@example.com",
        zipCode: ZA_POSTAL.CPT,
        courses: [],
      },
      password: "secret123",
    },
  ];

  for (const { doc, password } of usersToRegister) {
    const email = String(doc.email).trim().toLowerCase();

    // Find subscriber with same email (optional link)
    const sub = await Subscriber.findOne({ email }).lean();

    // If user exists, UPDATE links and profile (idempotent behavior)
    const existing = await User.findOne({ email });
    if (existing) {
      existing.name = existing.name || {};
      existing.name.first = doc.name?.first ?? existing.name.first;
      existing.name.last = doc.name?.last ?? existing.name.last;
      existing.zipCode = doc.zipCode ?? existing.zipCode;

      // courses: addToSet behavior
      const existingCourses = new Set((existing.courses || []).map(String));
      for (const cId of doc.courses || []) existingCourses.add(String(cId));
      existing.courses = Array.from(existingCourses);

      // subscriber link
      if (sub) existing.subscriberAccount = sub._id;

      await existing.save();
      log(`User exists → updated: ${email}`);
      continue;
    }

    // Otherwise create fresh user correctly (creates hash/salt)
    const created = await User.register(
      new User({ ...doc, email }), // ensure lowercase
      password
    );
    log("Registered:", created.email);

    // Auto-link subscriber if emails match
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
  const users = await User.find()
    .populate({ path: "subscriberAccount", select: "email" })
    .populate({ path: "courses", select: "title" })
    .lean();

  log(
    "Users in DB:",
    users.map((u) => ({
      email: u.email,
      zipCode: u.zipCode,
      subscriberEmail: u.subscriberAccount?.email || null,
      courses: (u.courses || []).map((c) => c.title || c),
      hasHash: !!u.hash,
      hasSalt: !!u.salt,
      hasPasswordField: Object.prototype.hasOwnProperty.call(u, "password"),
    }))
  );

  const subs = await Subscriber.find().populate("courses").lean();
  log(
    "Subscribers:",
    subs.map((s) => ({
      email: s.email,
      zipCode: s.zipCode,
      courses: (s.courses || []).map((c) => c.title),
    }))
  );

  await mongoose.disconnect();
  log("Done. Disconnected.");
} catch (err) {
  console.error("[seed] Error:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
}
