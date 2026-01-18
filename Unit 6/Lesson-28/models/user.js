/**
 * @author: Kwanele Dladla
 * @description: User model using passport-local-mongoose
 * Handles password hashing, authentication, and registration automatically.
 *
 * Notes:
 * - passport-local-mongoose adds hash + salt fields and helpers like register(), authenticate(), setPassword().
 * - We use `email` as the usernameField.
 * - We DO NOT store a raw password field.
 */

import mongoose from "mongoose";
import passportLocalMongoose from "passport-local-mongoose";
import randToken from "rand-token";

/* ----------------------------- schema definition ---------------------------- */

const userSchema = new mongoose.Schema(
  {
    name: {
      first: {
        type: String,
        required: [true, "First name is required"],
        trim: true,
      },
      last: {
        type: String,
        required: [true, "Last name is required"],
        trim: true,
      },
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },

    // ZA postal code: 4 digits (0000–9999). If you want to disallow 0000, we can change min to 1000.
    zipCode: {
      type: Number,
      min: [0, "Postal code must be 4 digits (ZA)."],
      max: [9999, "Postal code must be 4 digits (ZA)."],
    },

    // Simple API token for query/token usage (optional)
    apiToken: {
      type: String,
      index: true,
    },

    subscriberAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscriber",
    },

    courses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* --------------------------------- virtuals -------------------------------- */

userSchema.virtual("fullName").get(function () {
  const f = this?.name?.first || "";
  const l = this?.name?.last || "";
  return `${f} ${l}`.trim();
});

/* --------------------------------- methods --------------------------------- */

userSchema.methods.getInfo = function () {
  return `User: ${this.fullName} <${this.email}>`;
};

/* ----------------------- passport-local-mongoose plugin --------------------- */

userSchema.plugin(passportLocalMongoose, {
  usernameField: "email",
  usernameLowerCase: true,
  errorMessages: {
    UserExistsError: "A user with this email already exists.",
  },
});

/* --------------------------------- hooks ---------------------------------- */

// Ensure every user has an apiToken
userSchema.pre("save", function (next) {
  // Only set it if missing
  if (!this.apiToken) {
    this.apiToken = randToken.generate(16);
  }
  return next();
});

/* --------------------------------- export --------------------------------- */

const User = mongoose.model("User", userSchema);
export default User;
