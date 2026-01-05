// run in REPL or seed script (ESM)
import mongoose from "mongoose";
import Course from "./models/course.js";
import Subscriber from "./models/subscribers.js";

await mongoose.connect("mongodb://127.0.0.1:27017/recipe_db");

// ensure indexes (unique title/email)
await Promise.all([Course.init(), Subscriber.init()]);

// 1) Create a course
const course1 = await Course.findOneAndUpdate(
  { title: "Node.js Fundamentals" },
  { title: "Node.js Fundamentals", description: "Learn routes, controllers, MongoDB", items: ["routes","controllers","mongoose"], zipCode: 12345 },
  { upsert: true, new: true }
);

// 2) Create a subscriber
const sub1 = await Subscriber.findOneAndUpdate(
  { email: "jon@jonwexler.com" },
  { name: "Jon", email: "jon@jonwexler.com", zipCode: 12345 },
  { upsert: true, new: true }
);

// 3) Associate (push ObjectId)
sub1.courses.push(course1._id);           // you can also push course1 directly; Mongoose grabs _id
await sub1.save();

// 4) Read back with populated courses
const withCourses = await Subscriber
  .findOne({ email: "jon@jonwexler.com" })
  .populate("courses");                   // pulls full course docs

console.log("Subscriber with populated courses:", withCourses);

// optional: show only specific fields from Course
const withCoursesLean = await Subscriber
  .findOne({ email: "jon@jonwexler.com" })
  .populate({ path: "courses", select: "title description -_id" })
  .lean();

console.log("Minimal view:", withCoursesLean);

await mongoose.disconnect();
