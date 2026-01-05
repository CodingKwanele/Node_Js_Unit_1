// seed.js
import mongoose from "mongoose";
import Subscriber from "./models/subscribers.js";
import Course from "./models/course.js";

async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/recipe_db");

  // Sync indexes AFTER you’ve cleaned duplicates once
  await Promise.all([Subscriber.syncIndexes(), Course.syncIndexes()]);

  // Upserts avoid duplicate insert crashes
  const course = await Course.findOneAndUpdate(
    { title: "Node.js Fundamentals" },
    { title: "Node.js Fundamentals", description: "Learn routes, controllers, MongoDB", items: ["routes","controllers","mongoose"], zipCode: 12345 },
    { upsert: true, new: true }
  );

  const sub = await Subscriber.findOneAndUpdate(
    { email: "jon@jonwexler.com" },
    { name: "Jon", email: "jon@jonwexler.com", zipCode: 12345 },
    { upsert: true, new: true }
  );

  // link (push if not already present)
  if (!sub.courses.some(id => id.toString() === course._id.toString())) {
    sub.courses.push(course._id);
    await sub.save();
  }

  console.log("Seed OK");
  await mongoose.disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
