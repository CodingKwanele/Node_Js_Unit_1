import mongoose from "mongoose";
import User from "../models/user.js";
import Subscriber from "../models/subscribers.js";
import Course from "../models/course.js";

/**
 * Helper: build a clean user object from request body
 * Matches the style from the book's getUserParams.
 */
const getUserParams = (body) => ({
  name: {
    first: String(body.first || "").trim(),
    last: String(body.last || "").trim(),
  },
  email: String(body.email || "").trim().toLowerCase(),
  zipCode: body.zipCode ? Number(String(body.zipCode).trim()) : undefined,
  password: String(body.password || ""),
});

// GET /users — list with subscriber & course counts
const showUsers = async (req, res) => {
  try {
    const users = await User.find()
      .populate({ path: "subscriberAccount", select: "email" })
      .populate({ path: "courses", select: "title" })
      .sort({ createdAt: -1 })
      .lean();

    res.render("users", { users });
  } catch (e) {
    console.error(e);
    res.status(500).render("error", { message: "Failed to load users." });
  }
};

// GET /users/new — create form
const showCreateUserForm = (req, res) => {
  res.render("user_new", {
    errors: {},
    values: { first: "", last: "", email: "", zipCode: "", password: "" },
  });
};

// POST /users — create (flash + redirectView style)
const createUser = async (req, res, next) => {
  try {
    const { first, last, email, zipCode, password } = getUserParams(req.body);

    // Basic validation
    const errors = {};
    if (!first) errors.first = "First name is required.";
    if (!last) errors.last = "Last name is required.";
    if (!email) errors.email = "Email is required.";
    if (!password || password.length < 6)
      errors.password = "Password must be at least 6 characters.";
    if (
      zipCode !== undefined &&
      !/^\d{5}$/.test(String(req.body.zipCode || "").trim())
    ) {
      errors.zipCode = "Zip code must be 5 digits.";
    }

    // If validation fails, re-render form (no redirect here)
    if (Object.keys(errors).length) {
      return res.status(400).render("user_new", {
        errors,
        values: {
          first,
          last,
          email,
          zipCode: req.body.zipCode || "",
          password: "",
        },
      });
    }

    // Create the user (pre-save hook will hash password)
    const user = await User.create({
      name: { first, last },
      email,
      zipCode,
      password,
    });

    // Auto-link subscriber if email matches
    const sub = await Subscriber.findOne({ email });
    if (sub) {
      user.subscriberAccount = sub._id;
      await user.save(); // triggers pre-save only if user.subscriberAccount changed, password won't rehash since not modified
    }

    // success flash + redirect
    req.flash(
      "success",
      `${user.name.first} ${user.name.last} created successfully!`
    );
    res.locals.redirect = "/users";
    res.locals.user = user;
    return next();
  } catch (e) {
    console.error(e);

    // duplicate email
    if (e?.code === 11000) {
      req.flash("error", "A user with this email already exists.");
      res.locals.redirect = "/users/new";
      return next();
    }

    // generic error
    req.flash("error", `Failed to create user account: ${e.message}`);
    res.locals.redirect = "/users/new";
    return next();
  }
};

// GET /users/:id/edit — edit form
const showEditUserForm = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user)
      return res
        .status(404)
        .render("error", { message: "User not found." });

    return res.render("user_edit", {
      errors: {},
      values: {
        first: user.name?.first ?? "",
        last: user.name?.last ?? "",
        email: user.email,
        zipCode: user.zipCode ?? "",
        password: "", // never preload password
      },
      id: user._id,
    });
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .render("error", { message: "Failed to load user." });
  }
};

// POST /users/:id — update
const updateUser = async (req, res, next) => {
  try {
    const first = String(req.body.first || "").trim();
    const last = String(req.body.last || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const zipCodeStr = String(req.body.zipCode || "").trim();
    const newPassword = String(req.body.password || "");

    // If user is trying to change password, we MUST use .save() so pre('save') can hash
    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).render("user_edit", {
          errors: { password: "Password must be at least 6 characters." },
          values: { ...req.body, password: "" },
          id: req.params.id,
        });
      }

      // Load full document so we can trigger save()
      const userDoc = await User.findById(req.params.id);
      if (!userDoc) {
        req.flash("error", "User not found.");
        res.locals.redirect = "/users";
        return next();
      }

      userDoc.name.first = first;
      userDoc.name.last = last;
      userDoc.email = email;
      userDoc.zipCode = zipCodeStr ? Number(zipCodeStr) : undefined;
      userDoc.password = newPassword; // raw for now, will be hashed in pre('save')

      await userDoc.save(); // this will hash the new password

      req.flash("success", "User updated successfully.");
      res.locals.redirect = "/users";
      return next();
    }

    // No password change -> safe to use findByIdAndUpdate
    await User.findByIdAndUpdate(
      req.params.id,
      {
        name: { first, last },
        email,
        zipCode: zipCodeStr ? Number(zipCodeStr) : undefined,
      },
      {
        runValidators: true,
        context: "query",
      }
    );

    req.flash("success", "User updated successfully.");
    res.locals.redirect = "/users";
    return next();
  } catch (e) {
    console.error(e);

    if (e?.code === 11000) {
      // duplicate email
      return res.status(409).render("user_edit", {
        errors: { email: "A user with this email already exists." },
        values: { ...req.body, password: "" },
        id: req.params.id,
      });
    }

    req.flash("error", `Failed to update user: ${e.message}`);
    res.locals.redirect = "/users";
    return next();
  }
};

// POST /users/:id/delete — delete
const deleteUser = async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.params.id);

    req.flash("success", "User deleted.");
    res.locals.redirect = "/users";
    return next();
  } catch (e) {
    console.error(e);
    req.flash("error", "Failed to delete user.");
    res.locals.redirect = "/users";
    return next();
  }
};

// POST /users/:id/link-course — add a course to a user (atomic)
const linkCourse = async (req, res, next) => {
  try {
    const { courseId } = req.body;

    if (!mongoose.isValidObjectId(courseId)) {
      req.flash("error", "Invalid course id.");
      res.locals.redirect = "/users";
      return next();
    }

    const course = await Course.findById(courseId).lean();
    if (!course) {
      req.flash("error", "Course not found.");
      res.locals.redirect = "/users";
      return next();
    }

    await User.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { courses: course._id } },
      { runValidators: true, context: "query" }
    );

    req.flash("success", "Course linked.");
    res.locals.redirect = "/users";
    return next();
  } catch (e) {
    console.error(e);
    req.flash("error", "Failed to link course.");
    res.locals.redirect = "/users";
    return next();
  }
};

// POST /users/:id/link-subscriber — link subscriber by email (atomic)
const linkSubscriberByEmail = async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email) {
      req.flash("error", "Subscriber email is required.");
      res.locals.redirect = "/users";
      return next();
    }

    const sub = await Subscriber.findOne({ email }).lean();
    if (!sub) {
      req.flash("error", "Subscriber not found.");
      res.locals.redirect = "/users";
      return next();
    }

    await User.findByIdAndUpdate(
      req.params.id,
      { $set: { subscriberAccount: sub._id } },
      { runValidators: true, context: "query" }
    );

    req.flash("success", "Subscriber linked.");
    res.locals.redirect = "/users";
    return next();
  } catch (e) {
    console.error(e);
    req.flash("error", "Failed to link subscriber.");
    res.locals.redirect = "/users";
    return next();
  }
};

/** ===========================
 * AUTH / LOGIN
 * ===========================
 */

// GET /users/login — show login form
const showLoginForm = (req, res) => {
  res.render("login");
};

const authenticate = async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      req.flash("error", "Email and password are required.");
      res.locals.redirect = "/users/login";
      return next();
    }

    // pull a full doc, not .lean()
    const user = await User.findOne({ email });
    if (!user) {
      req.flash("error", "Account not found.");
      res.locals.redirect = "/users/login";
      return next();
    }

    const passwordsMatch = await user.passwordComparison(password);
    if (!passwordsMatch) {
      req.flash("error", "Incorrect password.");
      res.locals.redirect = "/users/login";
      return next();
    }

    // success:
    req.session.userId = user._id;
    req.session.userName = user.name?.first || "User";

    req.flash("success", `Welcome back, ${req.session.userName}!`);
    res.locals.redirect = "/users";
    return next();
  } catch (err) {
    console.error("Login error:", err);
    req.flash("error", "Login failed due to server error.");
    res.locals.redirect = "/users/login";
    return next();
  }
};


// middleware to perform the redirect after setting flash
export const redirectView = (req, res, next) => {
  const redirectPath = res.locals.redirect;
  if (redirectPath) {
    res.redirect(redirectPath);
  } else {
    next();
  }
};

export default {
  showUsers,
  showCreateUserForm,
  createUser,
  showEditUserForm,
  updateUser,
  deleteUser,
  linkCourse,
  linkSubscriberByEmail,
  showLoginForm,
  authenticate,
  redirectView,
};
