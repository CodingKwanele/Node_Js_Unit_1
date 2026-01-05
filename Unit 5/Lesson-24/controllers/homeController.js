/**
 * @file controllers/homeController.js
 * @author: Kwanele Dladla
 * @description:
 *   Home controller for rendering public pages and sample course listings.
 *   Clean version aligned with the app's MVC structure (Lesson 18).
 */

// Temporary mock data — later you can pull from MongoDB
const courses = [
  { title: "Event Driven Cakes", cost: 50 },
  { title: "Asynchronous Artichoke", cost: 25 },
  { title: "Object Oriented Orange Juice", cost: 10 },
];

/**
 * GET /courses — render all offered courses
 */
const showCourses = (req, res) => {
  res.render("courses", { offeredCourses: courses });
};

/**
 * GET / — render home page
 */
const showHome = (req, res) => {
  res.render("index");
};

/**
 * GET /contact — render contact form
 */
const showContact = (req, res) => {
  res.render("contact", {
    errors: {},
    values: { name: "", email: "", zipCode: "" },
  });
};

/**
 * Export all controller actions
 */
export default {
  showCourses,
  showHome,
  showContact,
};
