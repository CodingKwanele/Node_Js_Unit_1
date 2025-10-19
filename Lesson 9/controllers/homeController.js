// At the top
const path = require('path');

exports.getHomePage = (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
};

exports.submitRequest = (req, res) => {
    const { requesterName } = req.body;

    if (!requesterName) {
        return res.status(400).send('<h2>Error</h2><p>Requester name is missing.</p><a href="/">Go back to Home</a>');
    }

    console.log(' Request body:', req.body);
    if (req.file) {
        console.log(' File uploaded:', req.file.originalname);
    }

    res.send(`
        <h2>Request Submitted Successfully</h2>
        <p>Thank you <strong>${requesterName}</strong>. Your request has been received.</p>
        <a href="/">Submit another request</a>
    `);
};
