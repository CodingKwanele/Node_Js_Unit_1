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

// === 🔒 Password Hashing & Comparison ===
userSchema.pre("save", async function (next) {
  try {
    if (!this.isModified("password")) return next();
    const hash = await bcrypt.hash(this.password, 10);
    this.password = hash;
    next();
  } catch (err) {
    console.error(`Error in hashing password: ${err.message}`);
    next(err);
  }
});

userSchema.methods.passwordComparison = function (inputPassword) {
  return bcrypt.compare(inputPassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;
