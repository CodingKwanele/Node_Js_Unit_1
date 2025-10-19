// Author information for tracking who wrote the code
/**
 * @author: Kwanele Dladla 
 */

// Import only the 'request' object from Node's built-in 'http' module (though it's not used later)
const { request } = require("http");

// Define the port number (3000) on which the server will listen for incoming requests
const port = 3000; 

// Import the complete 'http' module to create an HTTP server
http = require("http");

// Import the 'http-status-codes' module to easily refer to standard HTTP status codes
httpStatus = require("http-status-codes"); 

// Create an HTTP server instance using the 'http.createServer' method
app = http.createServer();

// Set up an event listener on the server to handle incoming 'request' events
app.on("request", (req, res) => {
    // Prepare and send the HTTP response header with a status code of 200 (OK)
    // and specify that the content type is HTML
    res.writeHead(httpStatus.OK, {
        "content-Type": "text/html"
    });

    // Define the HTML message that will be sent as the response body
    let responseMessage = "<h1>This will show on the screen. </h1>";
    
    // End the response by sending the defined HTML message to the client
    res.end(responseMessage);
});

// Start the server and make it listen on the defined port (3000)
app.listen(port);

// Log a confirmation message to the console indicating that the server is running
console.log(`The server has started and is listening on port number: ${port}`);