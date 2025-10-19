/**
 * Minimal static server + routes.js.
 * Serves:
 * - /           -> views/home.html (falls back to views/index.html)
 * - /home, /about, /about.html
 * - /css/*, /js/*, /images/*
 */

import http from 'http';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import httpStatus from 'http-status-codes';
import { handleRoute } from './routes.js';

// __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Config
const PORT = process.env.PORT || 3000;

// Roots
const ROOT_VIEWS   = path.join(__dirname, 'views');
const ROOT_PUBLIC  = path.join(__dirname, 'public');
const ROOT_JS      = path.join(ROOT_PUBLIC, 'js');
const ROOT_CSS     = path.join(ROOT_PUBLIC, 'css');
const ROOT_IMAGES  = path.join(ROOT_PUBLIC, 'images');

/* ---------- Helpers ---------- */
const HTML = 'text/html; charset=utf-8';

const sendHTML = (res, code, html) => {
  res.writeHead(code, { 'Content-Type': HTML });
  res.end(html);
};

const send404 = (res, extra = '') =>
  sendHTML(res, httpStatus.NOT_FOUND, `<h1>404 Not Found</h1><p>${extra || 'The requested resource was not found on this server.'}</p>`);

const guessContentType = (ext) => {
  const m = {
    '.html': 'text/html; charset=utf-8',
    '.js':   'application/javascript; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif':  'image/gif',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
    '.json': 'application/json; charset=utf-8',
  };
  return m[ext] || 'application/octet-stream';
};

// Safer "inside" check
const isInside = (base, target) => {
  const b = path.resolve(base) + path.sep;
  const t = path.resolve(target);
  return t.startsWith(b);
};

const serveFile = async (absPath, res, contentType) => {
  try {
    const safe = path.resolve(absPath);

    if (!existsSync(safe)) {
      console.error('[404] File does not exist:', safe);
      return send404(res, `Missing file: ${path.basename(safe)}`);
    }
    if (!isInside(__dirname, safe)) {
      console.error('[403] Attempted path escape:', safe);
      return send404(res);
    }

    const data = await fs.readFile(safe);
    res.writeHead(httpStatus.OK, { 'Content-Type': contentType || guessContentType(path.extname(safe).toLowerCase()) });
    res.end(data);
  } catch (err) {
    console.error('serveFile error:', err);
    res.writeHead(httpStatus.INTERNAL_SERVER_ERROR, { 'Content-Type': HTML });
    res.end('<h1>500 Internal Server Error</h1>');
  }
};

// Resolve helpers
const from = (root, url) => path.join(root, path.basename(url));

/* ---------- Server ---------- */
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    const pathname = url.pathname;

    // 1) Dynamic routes first
    const handled = await handleRoute(req, res);
    if (handled) return;

    // 2) Prevent traversal
    if (pathname.includes('..')) return send404(res);

    // 3) Root -> home.html (fallback to index.html)
    if (pathname === '/') {
      const home = path.join(ROOT_VIEWS, 'home.html');
      const index = path.join(ROOT_VIEWS, 'index.html');
      const target = existsSync(home) ? home : index;
      if (!existsSync(target)) {
        console.error('[404] Neither home.html nor index.html found in /views');
        return send404(res, 'Expected views/home.html or views/index.html');
      }
      return serveFile(target, res, HTML);
    }

    // 4) Clean pages
    if (['/home', '/home.html'].includes(pathname.toLowerCase())) {
      return serveFile(path.join(ROOT_VIEWS, 'home.html'), res, HTML);
    }
    if (['/about', '/about.html'].includes(pathname.toLowerCase())) {
      return serveFile(path.join(ROOT_VIEWS, 'about.html'), res, HTML);
    }

    // 5) Assets
    if (pathname.startsWith('/js/')) {
      return serveFile(path.join(ROOT_JS, pathname.slice(4)), res, 'application/javascript; charset=utf-8');
    }
    if (pathname.startsWith('/css/')) {
      return serveFile(path.join(ROOT_CSS, pathname.slice(5)), res, 'text/css; charset=utf-8');
    }
    if (pathname.startsWith('/images/')) {
      return serveFile(path.join(ROOT_IMAGES, pathname.slice(8)), res, guessContentType(path.extname(pathname).toLowerCase()));
    }

    // 6) Direct .html in /views (e.g., /contact.html)
    if (pathname.endsWith('.html')) {
      return serveFile(from(ROOT_VIEWS, pathname), res, HTML);
    }

    // 7) Not found
    return send404(res);
  } catch (err) {
    console.error('Request error:', err);
    res.writeHead(httpStatus.INTERNAL_SERVER_ERROR, { 'Content-Type': HTML });
    res.end('<h1>500 Internal Server Error</h1>');
  }
});

/* ---------- Start + graceful shutdown ---------- */
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received: closing HTTP server');
  server.close(() => console.log('HTTP server closed'));
});

process.on('SIGINT', () => {
  console.log('SIGINT received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
