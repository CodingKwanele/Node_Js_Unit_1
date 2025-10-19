/**
 * Basic HTTP Server with Request Logging
 * @author: Kwanele Dladla
 * @version: 1.0.0
 */

const http = require("http");
const httpStatus = require("http-status-codes");

const port = 3000;

// Utility to safely convert objects to pretty JSON strings
function getJSONString(obj) {
    try {
        return JSON.stringify(obj, null, 2);
    } catch (err) {
        return String(obj); // fallback if conversion fails
    }
}

// Create the server
const app = http.createServer();

// Listen for incoming requests
app.on("request", (req, res) => {
    let body = [];

    // Collect chunks of data
    req.on("data", (chunk) => {
        body.push(chunk);
    });

    // When request body is fully received
    req.on("end", () => {
        body = Buffer.concat(body).toString();
        console.log("Request Body:\n", body);
    });

    // Log request metadata
    console.log("Method:\n", getJSONString(req.method));
    console.log("URL:\n", getJSONString(req.url));
    console.log("Headers:\n", getJSONString(req.headers));

    // Send a response back to client
    res.writeHead(httpStatus.OK, {
        "Content-Type": "text/html"
    });

    const responseMessage = "<h1>This will show on the screen.</h1>";
    res.end(responseMessage);
});

// Start the server
app.listen(port, () => {
    console.log(`✅ Server is running at http://localhost:${port}`);
});
