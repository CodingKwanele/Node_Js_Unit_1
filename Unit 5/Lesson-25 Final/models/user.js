/**
 * @author: Kwanele Dladla
 * @description: User model using passport-local-mongoose
 * Handles password hashing, authentication, and registration automatically.
 *
 * Notes:
 * - passport-local-mongoose will add username, hash, and salt fields and
 *   provide register()/authenticate() helpers. We set `usernameField` to "email".
 * - The explicit password field is omitted because the plugin manages it.
 */

import mongoose from "mongoose";
import passportLocalMongoose from "passport-local-mongoose";

/*
  Define the User schema.
  - name: nested object containing first and last name
  - email: used as the login username (unique, validated, lower-cased)
  - zipCode: numeric zip code with 5-digit validation via min/max
  - subscriberAccount: reference to a Subscriber document (ObjectId)
  - courses: array of references to Course documents (ObjectId)
*/
const userSchema = new mongoose.Schema(
  {
    name: {
      first: {
        type: String,
        required: [true, "First name is required"],
        trim: true, // remove surrounding whitespace
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
      lowercase: true, // always store email in lowercase
      trim: true,
      unique: true, // ensure uniqueness at the DB level (index)
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"], // simple email regex
    },
    zipCode: {
      type: Number,
      // Using min/max to enforce a 5-digit numeric zip code (10000-99999)
      min: [10000, "Zip Code must be at least 5 digits"],
      max: [99999, "Zip Code cannot exceed 5 digits"],
    },
    // password field is intentionally omitted — passport-local-mongoose will add hashing fields
    subscriberAccount: { type: mongoose.Schema.Types.ObjectId, ref: "Subscriber" },
    courses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
  },
  {
    timestamps: true, // createdAt and updatedAt
    toJSON: { virtuals: true }, // include virtuals when converting to JSON
    toObject: { virtuals: true }, // include virtuals when converting to plain objects
  }
);

/*
  Virtual property: fullName
  - Combines first and last names and trims any extra spaces.
  - Accessible as user.fullName (won't be persisted to DB).
*/
userSchema.virtual("fullName").get(function () {
  const f = this?.name?.first || "";
  const l = this?.name?.last || "";
  return `${f} ${l}`.trim();
});

/*
  Instance method: getInfo
  - Returns a simple string summary for logging or display.
*/
userSchema.methods.getInfo = function () {
  return `User: ${this.fullName} <${this.email}>`;
};

/*
  Attach passport-local-mongoose plugin:
  - This adds username, hash, salt, and helpful static/instance methods
    like register(), authenticate(), setPassword(), etc.
  - Configure it to use the email field as the username and to normalize to lowercase.
  - Provide a friendly error message when a duplicate user (email) is created.
*/
userSchema.plugin(passportLocalMongoose, {
  usernameField: "email", // use the email as the login username
  usernameLowerCase: true, // convert username to lowercase for consistency
  errorMessages: {
    UserExistsError: "A user with this email already exists.",
  },
});

// Export the model
const User = mongoose.model("User", userSchema);
export default User;
