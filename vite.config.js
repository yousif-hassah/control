import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const _require = createRequire(import.meta.url);

// Load .env file into process.env (Vite does this for client but not for plugins)
function loadDotEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (key && !process.env[key]) process.env[key] = val;
  });
}

export default defineConfig({
  server: {
    port: 5174,
  },

  build: {
    rollupOptions: {
      input: {
        main: path.resolve(process.cwd(), 'index.html'),
        booking: path.resolve(process.cwd(), 'booking.html'),
        admin: path.resolve(process.cwd(), 'admin.html'),
      },
    },
  },

  plugins: [
    {
      name: 'local-api-handler',

      configureServer(server) {
        loadDotEnv();

        // Handle any /api/* route directly inside Vite dev server
        server.middlewares.use('/api', (req, res) => {
          // Parse request URL to extract filename
          const urlStr = req.url.startsWith('/') ? `http://localhost${req.url}` : req.url;
          const parsedUrl = new URL(urlStr);
          const endpoint = parsedUrl.pathname.replace(/^\//, '').split('/')[0]; // get the first segment after /api

          if (req.method === 'OPTIONS') {
            res.writeHead(200, {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Passcode',
            });
            res.end();
            return;
          }

          const handlerFilename = `${endpoint || 'chat'}.js`;
          const handlerPath = path.resolve(process.cwd(), 'api', handlerFilename);

          if (!fs.existsSync(handlerPath)) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `API Route /api/${endpoint} not found` }));
            return;
          }

          const chunks = [];
          req.on('data', chunk => chunks.push(chunk));
          req.on('end', async () => {
            try {
              const rawBody = Buffer.concat(chunks);
              req.query = Object.fromEntries(parsedUrl.searchParams);

              // Parse body based on content type
              const contentType = req.headers['content-type'] || '';
              if (contentType.includes('application/json')) {
                req.body = rawBody.length ? JSON.parse(rawBody.toString('utf8')) : {};
              } else {
                req.body = {};
                req.rawBody = rawBody;
              }

              // Mock Vercel-style response object
              const mockRes = {
                _status: 200,
                _done: false,
                setHeader(k, v) { if (!this._done) res.setHeader(k, v); },
                status(code) { this._status = code; return this; },
                json(data) {
                  if (this._done) return;
                  this._done = true;
                  res.writeHead(this._status, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                  });
                  res.end(JSON.stringify(data));
                },
                end() {
                  if (!this._done) {
                    this._done = true;
                    res.writeHead(this._status, { 'Access-Control-Allow-Origin': '*' });
                    res.end();
                  }
                },
              };

              // Clear require cache so hot-reload works
              delete _require.cache[_require.resolve(handlerPath)];
              const handler = _require(handlerPath);

              await handler(req, mockRes);
            } catch (err) {
              console.error(`[API /api/${endpoint}] Error:`, err.message);
              if (!res.headersSent) {
                res.writeHead(500, {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({ error: err.message }));
              }
            }
          });
        });
      },
    },
  ],
});
