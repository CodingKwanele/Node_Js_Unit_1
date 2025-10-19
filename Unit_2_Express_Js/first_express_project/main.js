/**
 * @author: Kwanele Dladla 
 * @description: This is a simple Express.js application that serves static files from the "public" directory and listens on port 3000.
 */

const express = require('express');
const path = process.env.PORT || 3000;
const app = express();

app.get("/", (req, res) => {
  res.send("Hello Universe!");
}).listen(path, () => {
  console.log(`Server is running on port ${path}`);
});