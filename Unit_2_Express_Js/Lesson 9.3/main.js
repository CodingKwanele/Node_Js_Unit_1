/**
 * @author: Kwanele Dladla 
 * @description
 * 
 */


const port = process.env.PORT || 3000;
const express = require('express');
const app = express();

/**
 * Route parameters : Are handy when you want to specift data objects an application
 */
app.get('/items:vegetables', (req, res) => {
    let veg = req.params.veg;
    res.send(`You have requested the following items: ${veg}`);
}).listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`http://localhost:${port}/items`);
});