/** // Start of JSDoc comment block with module metadata.
 * Robust HTTP server with logging, security, and graceful shutdown. // Describes the purpose of the server module.
 * @module server // Declares the module name as "server".
 * @author Kwanele // Specifies the author of the module.
 * @version 2.1.0 // Specifies the version of the module.
 */ // End of JSDoc comment block.

const http = require("http"); // Import the built-in HTTP module to create an HTTP server.
const httpStatus = require("http-status-codes"); // Import HTTP status code constants for cleaner response handling.
const logger = require("./logger"); // Import a custom logger module for logging events and errors.

const PORT = process.env.PORT || 3000; // Define the port to listen on from an environment variable, defaulting to 3000.

const ipHits = {}; // Initialize an empty object to store rate limiting data per IP address.
const WINDOW_MS = 15 * 60 * 1000; // Define the time window (15 minutes in milliseconds) for rate limiting.
const MAX_HITS = 100; // Set the maximum number of allowed requests per IP during the time window.

setInterval(() => { // Set up an interval to periodically clean up rate limiting data.
  for (let ip in ipHits) { // Loop through each IP address in the rate limiting store.
    if (Date.now() - ipHits[ip].start > WINDOW_MS) delete ipHits[ip]; // Remove entries that have expired beyond the time window.
  }
}, WINDOW_MS); // Execute the cleanup function every WINDOW_MS milliseconds.

function setSecurityHeaders(res) { // Define a utility function to set security-related HTTP headers.
  res.setHeader("X-Content-Type-Options", "nosniff"); // Prevent MIME type sniffing.
  res.setHeader("X-Frame-Options", "DENY"); // Prevent the page from being framed to avoid clickjacking.
  res.setHeader("X-XSS-Protection", "1; mode=block"); // Enable built-in Cross-Site Scripting (XSS) protection.
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains"); // Enforce secure (HTTPS) connections for one year including subdomains.
}

const server = http.createServer((req, res) => { // Create an HTTP server instance with a request handler callback.
  try { // Start a try block for error handling.
    const ip = req.socket.remoteAddress; // Extract the client's IP address from the socket.
    logger.info(`${req.method} ${req.url} – Incoming from ${ip}`); // Log the incoming request's method, URL, and IP address.

    if (req.url === "/login") { // Check if the incoming request is targeting the "/login" route.
      const now = Date.now(); // Get the current timestamp.
      if (!ipHits[ip]) { // If there is no existing record for this IP,
        ipHits[ip] = { count: 1, start: now }; // Initialize rate limiting data for this IP.
      } else { // If there is an existing record for this IP,
        ipHits[ip].count++; // Increment the request count for this IP.
        if (ipHits[ip].count > MAX_HITS && now - ipHits[ip].start < WINDOW_MS) { // Check if the rate limit has been exceeded.
          res.writeHead(httpStatus.TOO_MANY_REQUESTS, { "Content-Type": "text/plain" }); // Set the response status to 429 Too Many Requests.
          res.end("Too many requests. Try again later."); // Send a plain text response about rate limiting.
          logger.warn(`Rate limit hit for ${ip}`); // Log a warning message that the rate limit has been exceeded for this IP.
          return; // Exit the request handler early.
        }
      }
    }

    setSecurityHeaders(res); // Apply security headers to the response.

    if (req.url === "/health") { // Check if the request URL matches the "/health" route.
      res.writeHead(httpStatus.OK, { "Content-Type": "application/json" }); // Set response status to 200 OK with JSON content type.
      res.end(JSON.stringify({ status: "OK" })); // Return a JSON response indicating server health.
      return; // Exit the request handler.
    }

    if (req.url === "/") { // Check if the request URL is the root ("/").
      const body = "<h1>Hello, Universe!</h1>"; // Define the HTML body content to send.
      res.writeHead(httpStatus.OK, { "Content-Type": "text/html" }); // Set response status to 200 OK with HTML content type.
      res.end(body); // Send the HTML response body.
      logger.info(`Response sent (${body.length} bytes)`); // Log the size of the response body sent.
      return; // Exit the request handler.
    }

    res.writeHead(httpStatus.NOT_FOUND, { "Content-Type": "text/plain" }); // For any unknown routes, set status to 404 Not Found with plain text.
    res.end("Not Found"); // Send a "Not Found" plain text response.

  } catch (err) { // Catch any error that occurs within the try block.
    logger.error(`Server error: ${err.message}`); // Log the error message.
    res.writeHead(httpStatus.INTERNAL_SERVER_ERROR); // Set the response status to 500 Internal Server Error.
    res.end("Internal Server Error"); // Send a plain text message for internal errors.
  }
});

const shutdown = () => { // Define a function to handle graceful server shutdown.
  logger.info("Shutting down gracefully..."); // Log that the shutdown process has started.
  server.close(() => { // Stop the server from accepting new connections.
    logger.info("Server closed."); // Log that the server has successfully closed.
    process.exit(0); // Exit the process with a success code.
  });
};

process.on("SIGTERM", shutdown); // Listen for the SIGTERM signal and invoke the shutdown process.
process.on("SIGINT", shutdown); // Listen for the SIGINT signal (Ctrl+C) and invoke the shutdown process.
process.on("uncaughtException", (err) => { // Listen for any uncaught exceptions.
  logger.error(`Uncaught Exception: ${err.message}`); // Log the uncaught exception.
  shutdown(); // Initiate a graceful shutdown.
});
process.on("unhandledRejection", (err) => { // Listen for any unhandled promise rejections.
  logger.error(`Unhandled Rejection: ${err.message}`); // Log the unhandled rejection.
  shutdown(); // Initiate a graceful shutdown.
});

server.listen(PORT, () => { // Start the server and begin listening on the defined port.
  logger.info(`Server started on port ${PORT}`); // Log that the server has started and is listening on the specified port.
});
