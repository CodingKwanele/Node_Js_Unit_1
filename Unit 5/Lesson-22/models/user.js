import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    name: {
      first: { type: String, required: [true, "First name is required"], trim: true },
      last:  { type: String, required: [true, "Last name is required"],  trim: true }
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    zipCode: {
      type: Number,
      min: [10000, "Zip Code must be at least 5 digits"],
      max: [99999, "Zip Code cannot exceed 5 digits"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      validate: {
        validator: (p) => p && p.length >= 6,
        message: "Password must be at least 6 characters long",
      },
    },
    courses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
    subscriberAccount: { type: mongoose.Schema.Types.ObjectId, ref: "Subscriber" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual full name
userSchema.virtual("fullName").get(function () {
  const f = this?.name?.first || "";
  const l = this?.name?.last  || "";
  return `${f} ${l}`.trim();
});

// Utility method
userSchema.methods.getInfo = function () {
  return `User: ${this.fullName} <${this.email}>`;
};

// === Password Hashing & Comparison ===
// Pre-save middleware that runs before saving a user document
userSchema.pre("save", async function (next) {
  try {
    // Check if the password field has been modified; if not, skip hashing
    if (!this.isModified("password")) return next();
    // Hash the password using bcrypt with a salt rounds of 10
    const hash = await bcrypt.hash(this.password, 10);
    // Replace the plain text password with the hashed password
    this.password = hash;
    // Call next() to proceed with the save operation
    next();
  } catch (err) {
    // Log any errors that occur during the hashing process
    console.error(`Error in hashing password: ${err.message}`);
    // Pass the error to the next middleware for error handling
    next(err);
  }
});

userSchema.methods.passwordComparison = function (inputPassword) {
  return bcrypt.compare(inputPassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;
