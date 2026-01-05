export default function validateSubscriber(req, res, next) {
  const { name = "", email = "", zipCode = "" } = req.body;
  const errors = {};

  const trimmedName = name.trim();
  if (!trimmedName) errors.name = "Name is required.";
  else if (trimmedName.length < 2) errors.name = "Name must be at least 2 characters.";
  else if (trimmedName.length > 60) errors.name = "Name must be 60 characters or fewer.";
  else if (!/^[A-Za-z\s'.-]+$/.test(trimmedName))
    errors.name = "Use letters, spaces, ' . - only.";

  const trimmedEmail = email.trim();
  if (!trimmedEmail) errors.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmedEmail))
    errors.email = "Enter a valid email.";

  const trimmedZip = String(zipCode).trim();
  if (trimmedZip && !/^\d{5}$/.test(trimmedZip))
    errors.zipCode = "Zip Code must be 5 digits.";

  if (Object.keys(errors).length) {
    return res.status(400).render("contact", {
      errors,
      values: { name: trimmedName, email: trimmedEmail, zipCode: trimmedZip },
    });
  }

  req.body.name = trimmedName;
  req.body.email = trimmedEmail;
  req.body.zipCode = trimmedZip;
  next();
}
