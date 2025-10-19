// Import the built-in HTTP module to enable server creation
const http = require("http");
// Import the HTTP status codes module to use standard status code numbers by name
const httpStatus = require("http-status-codes");

// Define the port number where the server will listen for incoming connections
const port = 3000;

// Define an object mapping specific URL paths to their corresponding HTML responses
const routeResponseMap = {
    "/info": "<h1>Info</h1>", // When the request URL is "/info", respond with an h1 element showing "Info"
    "/about": "<h1>Learn more about Code College</h1>", // For "/about", provide info about Code College
    "/contact": "<h1>Contact us</h1>", // For "/contact", allow users to contact via the rendered page
    "/error": "<h1>The page you are looking for isn't here.</h1>", // For "/error", show an error message
    "/hello": "<h1>Hello World</h1>", // For "/hello", display a greeting message
};

// Create an HTTP server that handles client requests and sends responses
const app = http.createServer((req, res) => {
    // Write the HTTP response header, setting status to 200 (OK) and content type to HTML
    res.writeHead(httpStatus.OK, {
        "Content-Type": "text/html",
    });

    // Check if the requested URL matches any key in the routeResponseMap
    const responseContent = routeResponseMap[req.url];

    // If a match is found, send the associated HTML content as the response
    if (responseContent) {
        res.end(responseContent);
    } else {
        // If no match is found, send a default welcome HTML message
        res.end("<h1>Welcome to the server</h1>");
    }
});

// Start the server and have it listen on the specified port
app.listen(port, () => {
    // Log a message indicating that the server has started and on which port it is listening
    console.log(`The server has started and is listening on port number: ${port}`);
});
