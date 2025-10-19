/**
 * @author: Kwanele Dladla
 * @version: 1.0.0
 * 
 */

// Creating a port that our server will be listening on 
const port = process.env.PORT || 3000;
// Creating a http server 
const http = require("http");
// Using fs and we need to require it 
const fs = require("fs");
// We need to a function that calls the URL into file path 
const getViewUrl = (url) => {
    return `views/${url}.html`;
};
// Creating a server
http.createServer((req, res) => {
    // Retrieving the file path string 
    let urlfilepath = getViewUrl(req.url);
    fs.readFile(urlfilepath, (err, data) => {
        if (err) {
            res.writeHead(404, { "Content-Type": "text/html" });
            res.write("<h1>404 Not Found</h1>");
            res.end();
        } else {
            res.writeHead(200, { "Content-Type": "text/html" });
            res.write(data);
            res.end();
        }
    });
}).listen(port, () => {
    console.log(`Server is running on port ${port}`);
});