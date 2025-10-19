/**
 * router.js
 *
 * Enhanced router for Confetti Cuisine application.
 * Implements dynamic GET and POST routing with static asset support.
 *
 * @module router
 * @author Kwanele Dladla
 * @version 3.0.0
 */

const { StatusCodes } = require('http-status-codes');
const path = require('path');
const { serveFile, sendError } = require('./utils');
const images = require("/views");

// Base directories
const viewsDir = path.join(__dirname, 'views');
const publicDir = path.join(__dirname, 'public');

// Route configuration
const routes = {
  GET: new Map(),
  POST: new Map(),
};

// Helper to register GET routes
function get(url, handler) {
  routes.GET.set(url, handler);
}

// Helper to register POST routes
function post(url, handler) {
  routes.POST.set(url, handler);
}

// Register view routes
get('/', async (req, res) => {
  const filePath = path.join(viewsDir, 'index.html');
  await serveFile(filePath, res);
});

get('/courses', async (req, res) => {
  const filePath = path.join(viewsDir, 'courses.html');
  await serveFile(filePath, res);
});

get('/contact', async (req, res) => {
  const filePath = path.join(viewsDir, 'contact.html');
  await serveFile(filePath, res);
});

// Register static assets route (CSS, JS, images)
get('/public', async (req, res) => {
  const assetPath = path.join(publicDir, req.url.replace(/^\/public/, ''));
  await serveFile(assetPath, res);
});

// Contact form submission
post('/submit-contact', (req, res) => {
  let body = '';
  req.on('data', chunk => (body += chunk));
  req.on('end', () => {
    console.log('Contact submission:', body);
    res.writeHead(StatusCodes.OK, { 'Content-Type': 'text/html' });
    res.end(`<h1>Thank you for contacting us!</h1>`);
  });
});

/**
 * Main request handler
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
function handle(req, res) {
  const methodRoutes = routes[req.method];
  const url = req.url.split('?')[0];

  // Static asset fallback
  if (url.startsWith('/css') || url.startsWith('/js') || url.startsWith('/images')) {
    const assetPath = path.join(publicDir, url);
    return serveFile(assetPath, res).catch(err => sendError(res, 'Asset not found', StatusCodes.NOT_FOUND));
  }

  const handler = methodRoutes && methodRoutes.get(url);
  if (handler) {
    return handler(req, res).catch(err => {
      console.error('Route handler error:', err);
      sendError(res, 'Server error', StatusCodes.INTERNAL_SERVER_ERROR);
    });
  }

  // No route matched
  sendError(res, 'Page not found', StatusCodes.NOT_FOUND);
}

module.exports = { handle, get, post };
