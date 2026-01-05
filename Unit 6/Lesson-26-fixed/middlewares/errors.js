export const notFound = (req, res, _next) => {
  res.status(404);
  if (req.accepts("json") && !req.accepts("html")) {
    return res.json({ error: "Not Found", path: req.originalUrl });
  }
  return res.render("404", { title: "Not Found" });
};

export const errorHandler = (err, req, res, _next) => {
  console.error(err);
  const status = res.statusCode >= 400 ? res.statusCode : 500;
  const isDev = req.app.get("env") !== "production";
  const message = isDev ? err.message : "Something went wrong";
  res.status(status);

  if (req.accepts("json") && !req.accepts("html")) {
    return res.json({ error: message });
  }

  return res.render("500", {
    title: "Server Error",
    message,
    stack: isDev ? err.stack : undefined,
  });
};
