// routes.js (ESM)
import httpStatus from 'http-status-codes';

const GET  = new Map();
const POST = new Map();

export const get  = (path, handler) => GET.set(path, handler);
export const post = (path, handler) => POST.set(path, handler);

/** Try to handle a dynamic route. Returns true if handled, else false. */
export async function handleRoute(req, res) {
  const pathname = new URL(req.url, 'http://localhost').pathname;

  const table =
    req.method === 'GET'  ? GET  :
    req.method === 'POST' ? POST : null;
  if (!table) return false;

  const handler = table.get(pathname);
  if (!handler) return false;

  try {
    await handler(req, res);
  } catch (err) {
    console.error('Route handler error:', err);
    res.writeHead(httpStatus.INTERNAL_SERVER_ERROR, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>500 Internal Server Error</h1>');
  }
  return true;
}

/* Example API routes (optional) */
get('/info', (req, res) => {
  res.writeHead(httpStatus.OK, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ info: 'This is some info' }));
});

post('/submit', async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks).toString();
  res.writeHead(httpStatus.OK, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ received: body }));
});
