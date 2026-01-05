/**
 * @file controllers/homeController.js
 * @description Home controller showing courses (Lesson 18 clean version).
 */

const courses = [
  { title: "Event Driven Cakes", cost: 50 },
  { title: "Asynchronous Artichoke", cost: 25 },
  { title: "Object Oriented Orange Juice", cost: 10 }
];

/**
 * Render the courses page with a list of offered courses.
 */
const showCourses = (req, res) => {
  res.render("courses", { offeredCourses: courses });
};

/**
 * Example: render the home page
 */
const showHome = (req, res) => {
  res.render("index");
};

/**
 * Example: render a contact page
 */
const showContact = (req, res) => {
  res.render("contact");
};

/**
 * Export all controller actions together
 */
export default {
  showCourses,
  showHome,
  showContact
};
