/**
 * @file models/course.js
 * @author Kwanele
 * @description Mongoose model for course details.
 */

import mongoose from "mongoose";

const ZIP_MIN = 10000;
const ZIP_MAX = 99999;

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Course title is required"],
      unique: true,           // keep this
      trim: true
    },
    description: {
      type: String,
      required: [true, "Course description is required"],
      trim: true
    },
    items: {
      type: [String],
      default: []
    },
    zipCode: {
      type: Number,
      min: [ZIP_MIN, `Zip code must be at least ${ZIP_MIN}`],
      max: ZIP_MAX
    }
  },
  { timestamps: true }
);

// REMOVE this to avoid duplicate-index warning:
// courseSchema.index({ title: 1 }, { unique: true });

const Course = mongoose.model("Course", courseSchema);
export default Course;
