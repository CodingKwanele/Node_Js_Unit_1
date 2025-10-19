/**
 * Utils.js
 *
 * Utility module for serving static files and handling HTTP errors.
 * Provides robust error handling with proper status codes and responses.
 *
 * @module Utils
 */

const fs = require('fs').promises;
const path = require('path');
const { StatusCodes, getReasonPhrase } = require('http-status-codes');
const contentType = require('./contentTypes');

/**
 * Serves a static file to the client.
 * @param {string} filePath - Absolute path to the file.
 * @param {import('http').ServerResponse} res - HTTP response object.
 */
async function serveFile(filePath, res) {
  try {
    const data = await fs.readFile(filePath);
    const headers = { 'Content-Type': contentType.getContentTypeByPath(filePath) };
    res.writeHead(StatusCodes.OK, headers);
    res.end(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // File not found
      sendError(res, 'The requested resource was not found.', StatusCodes.NOT_FOUND);
    } else {
      // Other errors
      console.error(`Error serving file ${filePath}:`, err);
      sendError(res, 'An unexpected error occurred.', StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
}

/**
 * Sends an HTML error response.
 * @param {import('http').ServerResponse} res - HTTP response object.
 * @param {string} message - Custom error message.
 * @param {number} [code=StatusCodes.INTERNAL_SERVER_ERROR] - HTTP status code.
 */
function sendError(res, message, code = StatusCodes.INTERNAL_SERVER_ERROR) {
  const reason = getReasonPhrase(code);
  const headers = { 'Content-Type': contentType.getContentType('html') };
  res.writeHead(code, headers);
  res.end(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${code} ${reason}</title>
        <style>
          body { font-family: sans-serif; text-align: center; padding: 2rem; }
          h1 { color: #d32f2f; }
        </style>
      </head>
      <body>
        <h1>${code} - ${reason}</h1>
        <p>${message}</p>
      </body>
    </html>
  `);
}

module.exports = { serveFile, sendError };
