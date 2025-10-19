/**
 * @file server.js
 * @description Entry point of the Express application.
 *              Sets up middleware, routes, and starts the server.
 * 
 * @author 
 * Kwanele Dladla
 * @date 2025-06-09
 */

const express = require('express');
const path = require('path');
const router = require('./routes/index.js');

const app = express();

// ─── Configuration ─────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.set('port', PORT);

// ─── Middleware ────────────────────────────────────────────────
// Parse incoming JSON data
app.use(express.json());

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Use main router
app.use('/', router);

// ─── Start Server ──────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`✅\ Server running at http://localhost:${PORT}`);
});
