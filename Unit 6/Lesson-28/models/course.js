/**
 * @file models/course.js
 * @author Kwanele
 * @description Mongoose model for course details.
 */

import mongoose from "mongoose";

// South African postal codes are 0000–9999.
// Stored as Number → leading zeros are stripped → valid range is 0–9999.
const ZIP_MIN = 0;
const ZIP_MAX = 9999;

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Course title is required"],
      unique: true,     // keep this
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
      max: [ZIP_MAX, `Zip code must be at most ${ZIP_MAX}`]
    }
  },
  { timestamps: true }
);

// REMOVE duplicate index to avoid Mongo warnings
// courseSchema.index({ title: 1 }, { unique: true });

const Course = mongoose.model("Course", courseSchema);
export default Course;
