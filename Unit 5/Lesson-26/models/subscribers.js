/**
 * @author : Kwanele Dladla
 * @description : Mongoose schema and model for subscribers
 */

import mongoose from 'mongoose';

const subscriberSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    zipCode: {
      type: Number,
      min: [10000, 'Zip Code must be at least 5 digits'],
      max: [99999, 'Zip Code cannot exceed 5 digits'],
      index: true,
    },

    courses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }]

  },
  {
    timestamps: true,
  }
);

// Custom instance methods
subscriberSchema.methods.findLocalSubscribers = function () {
  return this.model('Subscriber').find({ zipCode: this.zipCode }).exec();
};

subscriberSchema.methods.getInfo = function () {
  return `Subscriber: ${this.name}, Email: ${this.email}, Zip Code: ${this.zipCode}`;
};

const Subscriber = mongoose.model('Subscriber', subscriberSchema);

export default Subscriber;