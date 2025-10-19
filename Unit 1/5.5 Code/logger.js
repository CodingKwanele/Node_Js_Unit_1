// Begin file-level JSDoc comment explaining module details
/**
 * Configures Winston logger for console + file logging.
 * @module logger
 * @author Kwanele Dladla
 * @version 1.1.0
 */
// End file-level JSDoc comment

// Import createLogger, format, and transports from the winston module for logging functionality.
const { createLogger, format, transports } = require("winston");

// Import DailyRotateFile from winston-daily-rotate-file to handle log file rotation.
const DailyRotateFile = require("winston-daily-rotate-file");

// Import the file system module to handle file and directory operations.
const fs = require("fs");

// Import the path module to work with file and directory paths.
const path = require("path");

// Define a constant for the logs directory name.
const logDir = "logs";

// Check if the logs directory does not exist.
if (!fs.existsSync(logDir)) {
  // If the logs directory doesn't exist, create the logs directory.
  fs.mkdirSync(logDir);
}

// Define a custom log format using Winston's format.printf to structure log messages.
// This format includes a timestamp, the log level in uppercase, and the log message.
const logFormat = format.printf(({ timestamp, level, message }) =>
  `${timestamp} [${level.toUpperCase()}] ${message}`
);

// Define a format to scrub sensitive data from log messages (e.g., obscuring password values).
const scrubSensitiveData = format((info) => {
  // Check if the log message contains the substring "password=".
  if (info.message?.includes("password=")) {
    // Replace the value after "password=" with a placeholder (***), stopping at '&' or end of line.
    info.message = info.message.replace(/password=.*?(?=&|$)/, "password=***");
  }
  // Return the modified log info.
  return info;
});

// Create and export a logger instance configured with specified log levels, formats, and transports.
module.exports = createLogger({
  // Set a default logging level of "info".
  level: "info",
  // Combine multiple format functions: add timestamp, scrub sensitive data, then apply the custom log format.
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), // Add a timestamp to each log message.
    scrubSensitiveData(), // Apply the scrubbing format to remove sensitive data.
    logFormat // Apply the custom log format defined earlier.
  ),
  // Configure transports to determine where logs are sent (files and console).
  transports: [
    // Create a DailyRotateFile transport to write logs to a file that rotates daily.
    new DailyRotateFile({
      dirname: logDir, // Specify the directory for log files.
      filename: "server-%DATE%.log", // Define the file naming pattern including the date.
      datePattern: "YYYY-MM-DD", // Specify the date format in file names.
      maxFiles: "14d", // Retain log files for 14 days.
      zippedArchive: true, // Enable zipping of rotated files.
      level: "info" // Set the logging level for file logs.
    }),
    // Create a Console transport to display logs in the terminal.
    new transports.Console({
      // Use the debug level if in development mode, otherwise info level.
      level: process.env.NODE_ENV === "development" ? "debug" : "info",
      // Combine colorizing output with the custom log format.
      format: format.combine(format.colorize(), logFormat)
    })
  ],
  // Configure exception handlers to log uncaught exceptions to a separate file.
  exceptionHandlers: [
    new transports.File({ dirname: logDir, filename: "exceptions.log" })
  ],
  // Configure rejection handlers to log unhandled promise rejections to a separate file.
  rejectionHandlers: [
    new transports.File({ dirname: logDir, filename: "rejections.log" })
  ]
});