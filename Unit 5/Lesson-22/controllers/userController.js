import mongoose from "mongoose";
import User from "../models/user.js";
import Subscriber from "../models/subscribers.js";
import Course from "../models/course.js";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract and sanitize user parameters from request body
 * Transforms raw form data into a clean user object for database operations
 * 
 * @param {Object} body - Request body containing user form data
 * @returns {Object} Sanitized user parameters ready for User model
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

// ============================================================================
// USER LISTING & DISPLAY
// ============================================================================

/**
 * GET /users — Display all users with their associated data
 * Populates subscriber accounts and enrolled courses for each user
 * Users are sorted by creation date (newest first)
 */
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

// ============================================================================
// USER CREATION
// ============================================================================

/**
 * GET /users/new — Display user creation form
 * Renders empty form with no validation errors
 */
const showCreateUserForm = (req, res) => {
  res.render("user_new", {
    errors: {},
    values: { first: "", last: "", email: "", zipCode: "", password: "" },
  });
};

/**
 * POST /users — Create a new user account
 * 
 * Process:
 * 1. Validate all required fields
 * 2. Create user with hashed password (via pre-save hook)
 * 3. Auto-link subscriber account if matching email exists
 * 4. Flash success message and redirect to users list
 * 
 * Validation rules:
 * - First name, last name, email are required
 * - Password must be at least 6 characters
 * - Zip code must be exactly 5 digits (if provided)
 */
const createUser = async (req, res, next) => {
  try {
    const { first, last, email, zipCode, password } = getUserParams(req.body);

    // ===== VALIDATION =====
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

    // Re-render form with errors if validation fails
    if (Object.keys(errors).length) {
      return res.status(400).render("user_new", {
        errors,
        values: {
          first,
          last,
          email,
          zipCode: req.body.zipCode || "",
          password: "", // Never send password back to form
        },
      });
    }

    // ===== CREATE USER =====
    // Password will be hashed automatically by User model's pre-save hook
    const user = await User.create({
      name: { first, last },
      email,
      zipCode,
      password,
    });

    // ===== AUTO-LINK SUBSCRIBER =====
    // If a subscriber exists with matching email, link them to this user
    const sub = await Subscriber.findOne({ email });
    if (sub) {
      user.subscriberAccount = sub._id;
      await user.save(); // Only subscriberAccount changed, password won't rehash
    }

    // ===== SUCCESS =====
    req.flash(
      "success",
      `${user.name.first} ${user.name.last} created successfully!`
    );
    res.locals.redirect = "/users";
    res.locals.user = user;
    return next();
  } catch (e) {
    console.error(e);

    // Handle duplicate email error (MongoDB error code 11000)
    if (e?.code === 11000) {
      req.flash("error", "A user with this email already exists.");
      res.locals.redirect = "/users/new";
      return next();
    }

    // Handle any other errors
    req.flash("error", `Failed to create user account: ${e.message}`);
    res.locals.redirect = "/users/new";
    return next();
  }
};

// ============================================================================
// USER EDITING
// ============================================================================

/**
 * GET /users/:id/edit — Display user edit form
 * Loads existing user data into form fields
 * Password field is always left empty for security
 */
const showEditUserForm = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    
    if (!user) {
      return res
        .status(404)
        .render("error", { message: "User not found." });
    }

    return res.render("user_edit", {
      errors: {},
      values: {
        first: user.name?.first ?? "",
        last: user.name?.last ?? "",
        email: user.email,
        zipCode: user.zipCode ?? "",
        password: "", // Never preload password for security
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

/**
 * PUT /users/:id — Update existing user
 * 
 * Two update paths:
 * 1. WITH password change: Uses .save() to trigger pre-save hook for hashing
 * 2. WITHOUT password change: Uses findByIdAndUpdate for efficiency
 * 
 * This dual approach ensures passwords are always hashed when changed,
 * while avoiding unnecessary rehashing when updating other fields
 */
const updateUser = async (req, res, next) => {
  try {
    // ===== EXTRACT & SANITIZE INPUT =====
    const first = String(req.body.first || "").trim();
    const last = String(req.body.last || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const zipCodeStr = String(req.body.zipCode || "").trim();
    const newPassword = String(req.body.password || "");

    // ===== PATH 1: PASSWORD CHANGE =====
    // Must use .save() to trigger pre-save hook for password hashing
    if (newPassword) {
      // Validate password length
      if (newPassword.length < 6) {
        return res.status(400).render("user_edit", {
          errors: { password: "Password must be at least 6 characters." },
          values: { ...req.body, password: "" },
          id: req.params.id,
        });
      }

      // Load full Mongoose document (not .lean()) to enable .save()
      const userDoc = await User.findById(req.params.id);
      if (!userDoc) {
        req.flash("error", "User not found.");
        res.locals.redirect = "/users";
        return next();
      }

      // Update all fields including password
      userDoc.name.first = first;
      userDoc.name.last = last;
      userDoc.email = email;
      userDoc.zipCode = zipCodeStr ? Number(zipCodeStr) : undefined;
      userDoc.password = newPassword; // Raw password - will be hashed by pre-save hook

      await userDoc.save(); // Triggers password hashing

      req.flash("success", "User updated successfully.");
      res.locals.redirect = "/users";
      return next();
    }

    // ===== PATH 2: NO PASSWORD CHANGE =====
    // Safe to use findByIdAndUpdate for better performance
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

    // Handle duplicate email error
    if (e?.code === 11000) {
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

// ============================================================================
// USER DELETION
// ============================================================================

/**
 * DELETE /users/:id — Delete a user account
 * Removes user from database permanently
 */
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

// ============================================================================
// RELATIONSHIP MANAGEMENT
// ============================================================================

/**
 * POST /users/:id/link-course — Link a course to a user
 * Uses $addToSet to prevent duplicate course enrollments
 * Validates both course ID format and existence before linking
 */
const linkCourse = async (req, res, next) => {
  try {
    const { courseId } = req.body;

    // Validate MongoDB ObjectId format
    if (!mongoose.isValidObjectId(courseId)) {
      req.flash("error", "Invalid course id.");
      res.locals.redirect = "/users";
      return next();
    }

    // Verify course exists
    const course = await Course.findById(courseId).lean();
    if (!course) {
      req.flash("error", "Course not found.");
      res.locals.redirect = "/users";
      return next();
    }

    // Add course to user's courses array (no duplicates via $addToSet)
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

/**
 * POST /users/:id/link-subscriber — Link subscriber account by email
 * Finds subscriber by email and associates with user account
 * Useful for connecting existing subscriber records to new user accounts
 */
const linkSubscriberByEmail = async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    
    if (!email) {
      req.flash("error", "Subscriber email is required.");
      res.locals.redirect = "/users";
      return next();
    }

    // Find subscriber by email
    const sub = await Subscriber.findOne({ email }).lean();
    if (!sub) {
      req.flash("error", "Subscriber not found.");
      res.locals.redirect = "/users";
      return next();
    }

    // Link subscriber to user
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

// ============================================================================
// AUTHENTICATION & SESSION MANAGEMENT
// ============================================================================

/**
 * GET /users/login — Display login form
 * Public route - no authentication required
 */
const showLoginForm = (_req, res) => {
  res.render("login");
};

/**
 * POST /users/login — Authenticate user credentials
 * 
 * Authentication flow:
 * 1. Validate email and password are provided
 * 2. Query database for user with matching email
 * 3. Compare provided password with hashed password using bcrypt
 * 4. On success: Create session and redirect to users page
 * 5. On failure: Flash error and redirect back to login
 * 
 * Session data stored:
 * - userId: MongoDB ObjectId for user identification
 * - userName: User's first name for personalized greetings
 */
const authenticate = async (req, res, next) => {
  try {
    // ===== EXTRACT & VALIDATE INPUT =====
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      req.flash("error", "Email and password are required.");
      res.locals.redirect = "/users/login";
      return next();
    }

    // ===== FIND USER =====
    // Must use full document (not .lean()) to access passwordComparison method
    const user = await User.findOne({ email });
    if (!user) {
      req.flash("error", "Account not found.");
      res.locals.redirect = "/users/login";
      return next();
    }

    // ===== VERIFY PASSWORD =====
    // Uses bcrypt comparison via User model instance method
    const passwordsMatch = await user.passwordComparison(password);
    if (!passwordsMatch) {
      req.flash("error", "Incorrect password.");
      res.locals.redirect = "/users/login";
      return next();
    }

    // ===== CREATE SESSION =====
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

/**
 * GET /users/logout — Destroy user session and log out
 * Clears session data and redirects to home page
 */
const logout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      req.flash("error", "Failed to log out.");
    } else {
      req.flash("success", "Logged out successfully.");
    }
    res.locals.redirect = "/";
    next();
  });
};

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Redirect middleware - performs final redirect after controller actions
 * 
 * Used in conjunction with controllers that set res.locals.redirect
 * Allows controllers to set redirect path without immediately redirecting,
 * enabling additional middleware to run (like flash message handling)
 * 
 * @example
 * // In route: router.post('/users', createUser, redirectView);
 * // createUser sets res.locals.redirect = '/users'
 * // redirectView then performs the actual redirect
 */
const redirectView = (_req, res, next) => {
  const redirectPath = res.locals.redirect;
  if (redirectPath) {
    res.redirect(redirectPath);
  } else {
    next();
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

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
  logout,
  redirectView,
};