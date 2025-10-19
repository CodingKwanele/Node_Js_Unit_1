/**
 * Configures Winston logger for console + file logging.
 * @module logger
 * @author Kwanele Dladla
 * @version 1.1.0
 */

const { createLogger, format, transports } = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const fs = require("fs");
const path = require("path");

// Ensure logs directory exists
const logDir = "logs";
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Log format with timestamp, level, and message
const logFormat = format.printf(({ timestamp, level, message }) =>
  `${timestamp} [${level.toUpperCase()}] ${message}`
);

// Scrub sensitive data (e.g., passwords, tokens)
const scrubSensitiveData = format((info) => {
  if (info.message?.includes("password=")) {
    info.message = info.message.replace(/password=.*?(?=&|$)/, "password=***");
  }
  return info;
});

module.exports = createLogger({
  level: "info", // Default threshold
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    scrubSensitiveData(),
    logFormat
  ),
  transports: [
    // Rotated daily logs (retain 14 days, zipped)
    new DailyRotateFile({
      dirname: logDir,
      filename: "server-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxFiles: "14d",
      zippedArchive: true,
      level: "info" // Only log info+ to files
    }),
    // Console (debug+ in development)
    new transports.Console({
      level: process.env.NODE_ENV === "development" ? "debug" : "info",
      format: format.combine(format.colorize(), logFormat)
    })
  ],
  exceptionHandlers: [
    new transports.File({ dirname: logDir, filename: "exceptions.log" })
  ],
  rejectionHandlers: [
    new transports.File({ dirname: logDir, filename: "rejections.log" })
  ]
});