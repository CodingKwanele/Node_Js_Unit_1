/**
 * @module main                        // Defines the module name.
 * @description Entry point for Confetti Cuisine web application   // Describes the purpose of the module.
 * @version 2.1                        // Specifies the version.
 * @author Kwanele Dladla               // Specifies the author.
 * @date 2025-04-30                    // Specifies the date.
 */

require('dotenv').config();             // Loads environment variables from a .env file into process.env.
const http = require('http');           // Imports Node.js http module for creating the server.
const path = require('path');           // Imports Node.js path module to handle and transform file paths.
const httpStatus = require('http-status-codes'); // Imports HTTP status codes for easier status management.
const router = require('./router');     // Imports the router module for handling application routes.
const utils = require('./utils');       // Imports utility functions for file serving and error handling.

// Configuration
const PORT = process.env.PORT || 3000;   // Sets the server's port from environment variables or defaults to 3000.
const ENV = process.env.NODE_ENV || 'development'; // Sets the environment mode or defaults to 'development'.

// Create HTTP server
const server = http.createServer(async (req, res) => {  // Creates a new HTTP server with an async request handler.
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`); // Logs the current request time, method, and URL.
  
  try {  // Start of try block to catch errors during request handling.
    // Serve static files (CSS, JS, images, etc.)
    if (
      req.url.startsWith('/css/') ||     // Check if the URL starts with '/css/'.
      req.url.startsWith('/js/') ||        // Check if the URL starts with '/js/'.
      req.url.startsWith('/images/') ||    // Check if the URL starts with '/images/'.
      req.url.startsWith('/fonts/')        // Check if the URL starts with '/fonts/'.
    ) {
      const filePath = path.join(__dirname, 'public', req.url); // Combines __dirname with 'public' and req.url to form a full path.
      return await utils.serveFile(filePath, res); // Serves the file and returns early.
    }

    // Optionally handle favicon.ico
    if (req.url === '/favicon.ico') {      // Check if the requested URL is '/favicon.ico'.
      const filePath = path.join(__dirname, 'public', 'favicon.ico'); // Combines __dirname with 'public/favicon.ico' path.
      return await utils.serveFile(filePath, res); // Serves the favicon file and returns early.
    }

    // Handle routes
    router.handle(req, res);              // Passes the request and response objects to the router to manage dynamic routes.
    
  } catch (error) {                      // Catch any errors that occur in the try block.
    console.error('Server error:', error); // Logs the error details to the console.
    utils.sendError(res, 'Server Error', httpStatus.StatusCodes.INTERNAL_SERVER_ERROR); // Sends a 500 Internal Server error response.
  }
});

// Error handling
server.on('error', (error) => {           // Attaches an error event handler to the server.
  console.error('Server error:', error);  // Logs server errors.
  if (error.code === 'EADDRINUSE') {        // Checks if the error indicates the port is already in use.
    console.log(`Port ${PORT} is already in use`); // Logs a message if the port is in use.
  }
});

// Start server
server.listen(PORT, () => {               // Starts the server on the specified PORT.
  console.log(`                           // Logs a multi-line banner to the console.
  ██████╗ ██████╗ ███╗   ██╗███████╗████████╗████████╗  ██╗
 ██╔════╝██╔═══██╗████╗  ██║██╔════╝╚══██╔══╝╚══██╔══╝  ██║
 ██║     ██║   ██║██╔██╗ ██║█████╗     ██║      ██║     ██║
 ██║     ██║   ██║██║╚██╗██║██╔══╝     ██║      ██║     ╚═╝
 ╚██████╗╚██████╔╝██║ ╚████║███████╗   ██║      ██║     ██╗
  ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝   ╚═╝      ╚═╝     ╚═╝

  Server running in ${ENV} mode      // Logs the current environment mode.
  Listening on port ${PORT}            // Logs the port the server is listening on.
  http://localhost:${PORT}             // Logs the URL to access the server.
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {             // Listens for the SIGINT signal (e.g., Ctrl+C).
  console.log('\nServer shutting down...'); // Logs that the server is shutting down.
  server.close(() => {                  // Closes the server gracefully.
    console.log('Server terminated');   // Logs that the server has terminated.
    process.exit(0);                   // Exits the process with a success code.
  });
});
