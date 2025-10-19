/**
 *  
 * @author: Kwanele Dladla 
 * @description: Log request data and respond with HTML based on route
 * 
 */

// Import the HTTP module
const http = require('http'); 
// Import HTTP status codes
const httpStatus = require('http-status-codes');

// Map of routes to responses
const routeResponseMap = {
  '/': 'This is the home page',
  '/about': 'This is the about page',
  '/contact': 'This is the contact page',
  '/hello': 'This is the hello page',
  '/error': 'Sorry, an error has occurred'
};

const PORT = 3000; // Define the port number

/**
 * Helper function to convert objects to formatted JSON strings
 * @param {Object} obj - The object to stringify
 * @returns {string} - JSON string with indentation
 */
function getJSONString(obj) 
{
  return JSON.stringify(obj, null, 2);
}

// Create the HTTP server
const server = http.createServer();

// Listen for 'request' events
server.on('request', (req, res) => 
{
  let body = [];

  // Collect incoming data chunks
  req.on('data', (chunk) => {
    body.push(chunk);
  });

  // When all data is received
  req.on('end', () => {
    body = Buffer.concat(body).toString();
    if (body.length > 0) {
      console.log(`Request Body Contents: ${body}`);
    }
  });

  // Log request method, URL, and headers
  console.log(`Request Method: ${req.method}`);
  console.log(`Request URL: ${req.url}`);
  console.log(`Request Headers: ${getJSONString(req.headers)}`);

  // Check if URL exists in routeResponseMap, otherwise show 404
  if (routeResponseMap[req.url]) {
    res.writeHead(httpStatus.OK, { 'Content-Type': 'text/html' });
    res.end(`<h1>${routeResponseMap[req.url]}</h1>`);
  } else {
    res.writeHead(httpStatus.NOT_FOUND, { 'Content-Type': 'text/html' });
    res.end('<h1>404 Not Found</h1>');
  }
});

// Start the server
server.listen(PORT, () => console.log(`Server is listening on port ${PORT}`));
