/**
 * @author: Kwanele Dladla 
 * @description: Learning Express.js Route Parameters
 * 
 * ROUTING BASICS:
 * - A route tells Express: "When someone visits THIS URL, run THIS code"
 * - Routes consist of: HTTP method + path + callback function
 * - The callback receives req (request from user) and res (response to send back)
 */

const port = process.env.PORT || 3000;
const express = require('express');
const app = express();  // Create an Express application instance

/**
 * ROUTE PARAMETERS (:paramName):
 * - Allow you to capture dynamic values from the URL
 * - Marked with a colon (:) in the route path
 * - Make one route handle multiple similar URLs
 * - Accessed via req.params object
 */

// ROUTE DEFINITION BREAKDOWN:
app.get(                           // HTTP method: GET (for retrieving/viewing data)
    '/items/:vegetables',          // Path with parameter: anything after /items/ gets captured
    (req, res) => {                // Callback function: runs when this route is visited
        
        // ACCESSING ROUTE PARAMETERS:
        // req.params is an object containing all route parameters
        // The property name matches the parameter name in the route (:vegetables)
        let veg = req.params.vegetables;
        
        // SENDING RESPONSE:
        // res.send() sends data back to the user's browser
        res.send(`You have requested the following items: ${veg}`);
    }
);

// START THE SERVER:
// app.listen() starts the web server and listens for incoming requests
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`Try: http://localhost:${port}/items/lettuce`);
    console.log(`Or: http://localhost:${port}/items/carrot`);
    console.log(`The word after /items/ becomes the 'vegetables' parameter`);
});

/**
 * HOW IT WORKS:
 * 1. User visits: http://localhost:3000/items/lettuce
 * 2. Express matches the URL to the route pattern /items/:vegetables
 * 3. "lettuce" is captured as the value of req.params.vegetables
 * 4. Callback function runs with req.params.vegetables = "lettuce"
 * 5. Response sent: "You have requested the following items: lettuce"
 * 
 * KEY CONCEPT: Route parameters turn static routes into dynamic ones!
 * Instead of creating separate routes for /items/lettuce, /items/carrot, etc.,
 * you create ONE route that handles ALL vegetables (or any item name).
 */