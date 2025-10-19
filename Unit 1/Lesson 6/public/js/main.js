/**
 * @file main.js
 * Author: Kwanele Dladla
 * Minimal static file server with clean URLs, caching, and safe path resolution.
 * - / -> ./views/index.html
 * - /about -> ./views/about.html (clean URLs for views)
 * - /public/* -> ./public/* (css/js/images/fonts/etc.)
 */

import http from 'http';
import { createReadStream, existsSync } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import httpStatus from 'http-status-codes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

// Absolute roots we allow serving from
const ROOT_VIEWS = path.join(__dirname, 'views');
const ROOT_PUBLIC = path.join(__dirname, 'public');

/* ------------------------------
   Utilities
-------------------------------- */
const log = (...args) => console.log(new Date().toISOString(), '-', ...args);

const send = (res, code, html) => {
  res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
};

const sendNotFound = (res, msg = 'The requested resource was not found on this server.') =>
  send(res, httpStatus.NOT_FOUND, `<h1>404 Not Found</h1><p>${msg}</p>`);

const sendBadRequest = (res, msg = 'Bad Request') =>
  send(res, httpStatus.BAD_REQUEST, `<h1>400 Bad Request</h1><p>${msg}</p>`);

const sendMethodNotAllowed = (res) => {
  res.writeHead(httpStatus.METHOD_NOT_ALLOWED, {
    'Content-Type': 'text/html; charset=utf-8',
    'Allow': 'GET, HEAD'
  });
  res.end('<h1>405 Method Not Allowed</h1><p>Only GET and HEAD are supported.</p>');
};

const getContentType = (ext) => {
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.json': 'application/json; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.map': 'application/json; charset=utf-8'
  };
  return types[ext] || 'application/octet-stream';
};

/** Normalize and reject traversal; trim trailing slash except root */
const normalizePathname = (pathname) => {
  if (pathname.includes('..')) return null; // block traversal attempts
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
  return pathname;
};

const resolveView = (urlPathname) => {
  const fileName = path.basename(urlPathname);
  return path.join(ROOT_VIEWS, fileName);
};

const resolvePublic = (urlPathname) => {
  const relative = urlPathname.replace(/^\/+/, ''); // strip leading slash
  return path.join(__dirname, relative);
};

/** Set sane caching policy based on location/content */
const applyCacheHeaders = (headers, absPath, contentType) => {
  const isHTML = contentType.startsWith('text/html');
  const isPublic = absPath.startsWith(ROOT_PUBLIC + path.sep);

  if (isHTML) {
    headers['Cache-Control'] = 'no-store';
  } else if (isPublic) {
    // 1 day cache for /public/* (adjust as you like)
    headers['Cache-Control'] = 'public, max-age=86400';
  } else {
    headers['Cache-Control'] = 'no-cache';
  }
};

/**
 * Stream a file with Last-Modified/304 support.
 * @param {string} absPath - absolute path
 * @param {http.ServerResponse} res
 * @param {string} method - GET or HEAD
 * @param {string} contentType
 * @param {string} allowedRoot - root directory constraint
 */
const streamFile = async (absPath, res, method, contentType, allowedRoot) => {
  try {
    const safePath = path.normalize(absPath);

    // Guard: must be within allowedRoot
    if (!safePath.startsWith(allowedRoot + path.sep) && safePath !== allowedRoot) {
      log('Path guard blocked:', { safePath, allowedRoot });
      return sendNotFound(res, 'Blocked by path guard.');
    }

    if (!existsSync(safePath)) {
      log('Missing file:', safePath);
      return sendNotFound(res, `Missing file: ${safePath}`);
    }

    const stat = await fs.stat(safePath);
    if (!stat.isFile()) {
      log('Not a file:', safePath);
      return sendNotFound(res, 'Not a file.');
    }

    const lastModified = stat.mtime.toUTCString();
    const headers = {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Last-Modified': lastModified
    };
    applyCacheHeaders(headers, safePath, contentType);

    // 304 if not modified
    const ims = res.req.headers['if-modified-since'];
    if (ims && new Date(ims).getTime() >= stat.mtime.getTime()) {
      res.writeHead(httpStatus.NOT_MODIFIED, headers);
      return res.end();
    }

    res.writeHead(httpStatus.OK, headers);

    if (method === 'HEAD') return res.end();

    const stream = createReadStream(safePath);
    stream.on('error', (e) => {
      log('Stream error:', e);
      if (!res.headersSent) res.writeHead(httpStatus.INTERNAL_SERVER_ERROR);
      res.end('Internal Server Error');
    });
    stream.pipe(res);
  } catch (err) {
    log('Error serving file:', absPath, err);
    return send(res, httpStatus.INTERNAL_SERVER_ERROR, '<h1>500 Internal Server Error</h1>');
  }
};

/* ------------------------------
   Server
-------------------------------- */
const server = http.createServer(async (req, res) => {
  // Only GET / HEAD
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return sendMethodNotAllowed(res);
  }

  try {
    const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    // Decode percent-encodings safely
    let pathname = decodeURIComponent(urlObj.pathname || '/');
    pathname = normalizePathname(pathname);
    if (!pathname) {
      return sendBadRequest(res, 'Invalid path (.. not allowed).');
    }

    log(`${req.method} ${pathname}`);

    // Serve anything under /public/* directly
    if (pathname.startsWith('/public/')) {
      const ext = path.extname(pathname).toLowerCase();
      const abs = resolvePublic(pathname);
      return streamFile(abs, res, req.method, getContentType(ext), ROOT_PUBLIC);
    }

    // Root -> /views/index.html
    if (pathname === '/') {
      const abs = path.join(ROOT_VIEWS, 'index.html');
      return streamFile(abs, res, req.method, 'text/html; charset=utf-8', ROOT_VIEWS);
    }

    // With extension?
    const ext = path.extname(pathname).toLowerCase();
    if (ext) {
      const ct = getContentType(ext);

      if (ext === '.html') {
        const abs = resolveView(pathname);
        return streamFile(abs, res, req.method, ct, ROOT_VIEWS);
      }

      // Allow explicit /public/* with any ext (already handled above), otherwise 404
      return sendNotFound(res, 'Unknown extension or location.');
    }

    // Clean URL -> /views/<name>.html
    const pretty = path.join(ROOT_VIEWS, `${path.basename(pathname)}.html`);
    return streamFile(pretty, res, req.method, 'text/html; charset=utf-8', ROOT_VIEWS);
  } catch (err) {
    log('Unexpected server error:', err);
    return send(res, httpStatus.INTERNAL_SERVER_ERROR, '<h1>500 Internal Server Error</h1>');
  }
});

/* ------------------------------
   Startup & Shutdown
-------------------------------- */
server.listen(PORT, () => {
  log(`Server listening on http://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
  log('SIGTERM received: closing HTTP server');
  server.close(() => log('HTTP server closed'));
});

process.on('SIGINT', () => {
  log('SIGINT received: closing HTTP server');
  server.close(() => {
    log('HTTP server closed');
    process.exit(0);
  });
});
