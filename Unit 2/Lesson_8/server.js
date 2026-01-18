/**
    Author: Kwanele Dladla 
    Date: 2025-06-09 
    Description: This is the main file for the Express.js application.
    
*/

/**
 *    Importing the express module to create an Express application.
 *    The express webserver application is created using the express() function.
 *    The app variable will be used to define the routes and middleware for the application.
*/

/**
 *    GET is one of standard HTTP methods (along with POST, PUT, DELETE, etc.) used to request data from a specified resource.
 *    The term "get route" is a configuration that defines how the application responds to an incomming HTTP GET request.
 *    The app.get() method is used to define a route that responds to HTTP GET requests.
 *    
 * 
 *    When a users's web browsers or another client  make a request to a specific URL,  the web framework executes the code
 *    associated with that "get route" to generate a response.

 *   This is what the code does:
 *     - Fetches data from a database or other data source.
 *     - Processes the data to prepare it for display.
 *     - Renders a template or returns a JSON response.
 *     - Sends the response back to the client. (JSON, HTML, XML)
 * 
 *     - Example: If you have GET\users - It fetches a list of users from the database and returns it as HTML/JSON
 *     - Example: If you have GET\products - It fetches a list of products from the database and returns it as HTML/JSON
 */

const express = require('express');
const app = express();
app.set('port', process.env.PORT || 3000);

// This line tells Express to serve static files from the 'public' directory.
app.use(express.static('public'));

/**
 *  This is basically used to render the home page of the application.
 *  When a user visits the root URL ("/"), the server responds with a simple message.
 */
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
}).listen(app.get('port'), () => {
    console.log(`Server is running on port ${app.get('port')}`);
});


