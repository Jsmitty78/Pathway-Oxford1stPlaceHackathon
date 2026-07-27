// Static file server for the demo. Dependency-free — Node's standard library only.
//
// This exists instead of `python3 -m http.server` because that server answers a Range
// request with `200 OK` and the whole body. Chrome's media stack requires `206 Partial
// Content`, so the hackathon footage in assets/videos/ will not play against it. Every
// real static host (GitHub Pages included) supports Range, so this only matters locally.

import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const PORT = Number(process.env.PORT) || 5173;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
};

const send = (res, code, body = '') => {
  res.writeHead(code, { 'content-type': 'text/plain; charset=utf-8' });
  res.end(body || String(code));
};

createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);

  // normalize() collapses `..` segments, so the prefix check below cannot be escaped.
  let path = join(ROOT, normalize(url));
  if (!path.startsWith(ROOT)) return send(res, 403, 'Forbidden');

  let info;
  try {
    info = statSync(path);
    if (info.isDirectory()) {
      path = join(path, 'index.html');
      info = statSync(path);
    }
  } catch {
    return send(res, 404, 'Not found');
  }

  const type = TYPES[extname(path).toLowerCase()] || 'application/octet-stream';
  const total = info.size;
  const range = req.headers.range;

  // Byte-range support. Without this, <video> shows a spinner and never starts.
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (match) {
      const [, rawStart, rawEnd] = match;
      const start = rawStart === '' ? total - Number(rawEnd) : Number(rawStart);
      const end = rawStart === '' || rawEnd === '' ? total - 1 : Number(rawEnd);

      if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= total) {
        res.writeHead(416, { 'content-range': `bytes */${total}` });
        return res.end();
      }

      res.writeHead(206, {
        'content-type': type,
        'content-length': end - start + 1,
        'content-range': `bytes ${start}-${end}/${total}`,
        'accept-ranges': 'bytes',
      });
      return createReadStream(path, { start, end }).pipe(res);
    }
  }

  res.writeHead(200, {
    'content-type': type,
    'content-length': total,
    'accept-ranges': 'bytes',
  });
  if (req.method === 'HEAD') return res.end();
  createReadStream(path).pipe(res);
}).listen(PORT, () => {
  console.log(`Pathway demo → http://localhost:${PORT}`);
});
