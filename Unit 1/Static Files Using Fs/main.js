/**
 * @author : Kwanele Dladla
 * @version : 1.0.0 
 * @description : This module sets up a simple HTTP server using Node.js and the 'fs' module
 * to serve static files.
 */

const http = require("http"); // Import the built-in HTTP module to create the server.
const fs = require("fs"); // Import the File System module for file operations.
const { StatusCodes } = require("http-status-codes"); // Import standard HTTP status codes.

const port = 3000; // Define the port number for the server to listen on.

// Map routes to corresponding HTML file names.
const routeMap = {
    "/": "index.html",   // When the user visits the root route, serve index.html.
    "/about": "about.html",   // When the user visits /about, serve about.html.
    "/contact": "contact.html"  // When the user visits /contact, serve contact.html.
};

// Set the base directory where the HTML files are located.
const basePath = "views/";

// Create the HTTP server.
http.createServer((req, res) => {
    // Look up the file name based on the requested URL.
    const fileName = routeMap[req.url];

    // If a file is mapped to the requested URL, attempt to read and serve it.
    if (fileName) {
        const filePath = basePath + fileName;  // Construct the full file path.

        // Read the file from the file system.
        fs.readFile(filePath, (error, data) => {
            if (error) {
                // If an error occurs while reading the file, send a 500 Internal Server Error response.
                res.writeHead(StatusCodes.INTERNAL_SERVER_ERROR, {
                    "Content-Type": "text/html"
                });
                res.end("<h1>Internal Server Error</h1>");
            } else {
                // Successfully read the file, send a 200 OK response along with the file content.
                res.writeHead(StatusCodes.OK, {
                    "Content-Type": "text/html"
                });
                res.end(data);
            }
        });
    } else {
        // If no file is mapped to the requested URL, send a 404 Not Found response.
        res.writeHead(StatusCodes.NOT_FOUND, {
            "Content-Type": "text/html"
        });
        res.end("<h1>404 - Page Not Found</h1>");
    }
}).listen(port);  // The server starts listening on the defined port.

console.log(`The Server Has Started Listening on port number: ${port}`);  // Log a message when the server starts.
