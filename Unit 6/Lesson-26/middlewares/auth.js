// middlewares/auth.js

export const ensureAuthenticated = (req, res, next) => {
  if (typeof req.isAuthenticated === "function" && req.isAuthenticated()) {
    return next();
  }
  req.flash?.("error", "Please log in first.");
  return res.redirect("/users/login");
};

export const ensureGuest = (req, res, next) => {
  if (typeof req.isAuthenticated === "function" && req.isAuthenticated()) {
    return res.redirect("/dashboard");
  }
  return next();
};

export const ensureAdmin = (req, res, next) => {
  if (req.isAuthenticated?.() && req.user?.isAdmin) return next();
  req.flash?.("error", "Admins only.");
  return res.redirect("/dashboard");
};
