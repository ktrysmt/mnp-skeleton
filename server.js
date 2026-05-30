/*
 * Zero-dependency static server + save endpoint for the MNP skeleton.
 * Run: node server.js   (or: npm start)
 *
 *   GET  /<path>   -> serve a file from the repo root (path-traversal guarded)
 *   POST /save     -> overwrite the data file (default data/diagram.mnp)
 *
 * No npm install required: uses only Node's built-in modules.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT || 8777;
const HOST = process.env.HOST || '127.0.0.1';

// Resolve the data file from domain/schema.js (falls back to the default).
function dataFile() {
  try {
    const txt = fs.readFileSync(path.join(ROOT, 'domain/schema.js'), 'utf8');
    const m = txt.match(/dataFile:\s*['"]([^'"]+)['"]/);
    if (m) return m[1];
  } catch (_) {}
  return 'data/diagram.mnp';
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.mnp': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function safeJoin(rel) {
  const p = path.normalize(path.join(ROOT, rel));
  if (!p.startsWith(ROOT)) return null;   // block path traversal
  return p;
}

const server = http.createServer((req, res) => {
  // --- save endpoint ---
  if (req.method === 'POST' && req.url === '/save') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const target = safeJoin(dataFile());
      if (!target) { res.writeHead(400); return res.end('bad path'); }
      fs.writeFile(target, body, err => {
        if (err) { res.writeHead(500); return res.end('write error'); }
        res.writeHead(200); res.end('ok');
      });
    });
    return;
  }

  // --- static files ---
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/') rel = '/index.html';
  const file = safeJoin(rel);
  if (!file) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, {
      'content-type': MIME[path.extname(file)] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(buf);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`MNP skeleton running:  http://${HOST}:${PORT}/`);
  console.log(`data file:             ${dataFile()}`);
  console.log(`Edit ${dataFile()} (by hand or via Claude Code) — the page updates live.`);
});
