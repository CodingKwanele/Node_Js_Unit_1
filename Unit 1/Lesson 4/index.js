/**
 * @author: Kwanele Dladla
 * @description: Main file for Unit 1 Lesson 4
 */

// Assign a port number to use in the application
const port = 3000;
// Import the http module
const http = require('http');
// Import StatusCodes from http-status-codes for standard HTTP status codes
const StatusCodes= require('http-status-codes');
// Create the server and handle requests
const server = http.createServer((request, response) => {
    // Log that a request was received
    console.log("I received a request from the browser");
    // Set the response HTTP header with status and content type
    response.writeHead(StatusCodes.OK, {
        'Content-Type': 'text/html'
    });
    // Send the response body "Hello World"
    response.end('<h1>Hello World</h1>');
    // Log request details to the console
    console.log(`The request method is: ${request.method}`);
    console.log(`The request URL is: ${request.url}`);
    console.log(`The request headers are: ${JSON.stringify(request.headers)}`);
    console.log(`The request HTTP version is: ${request.httpVersion}`);
    console.log(`The response status code is: ${response.statusCode}`);
    console.log(`The response status message is: ${response.statusMessage}`);
});

// Make the server listen on port 3000 and localhost
server.listen(port, '127.0.0.1', () => {
    // Callback triggered when server is successfully listening
    console.log(`Server is listening on port number: ${port}`);
});
