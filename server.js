const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { spawn } = require('child_process');
const path = require('path');
const httpProxy = require('http-proxy');

// Environment Configuration
const dev = false; // ALWAYS force production mode in Plesk to prevent Webpack build hangs
const port = process.env.PORT || 3000;
const nestPort = process.env.NEST_PORT || 3001;

const fs = require('fs');
const out = fs.openSync(path.join(__dirname, 'backend-out.log'), 'a');
const err = fs.openSync(path.join(__dirname, 'backend-err.log'), 'a');

// 1. Start NestJS Backend in the background
const backendProcess = spawn('node', [path.join(__dirname, 'backend', 'dist', 'src', 'main.js')], {
  cwd: path.join(__dirname, 'backend'),
  env: { ...process.env, PORT: nestPort },
  stdio: ['ignore', out, err],
  detached: true
});
backendProcess.unref();

// 2. Setup HTTP Proxy for API and WebSockets
const proxy = httpProxy.createProxyServer({
  target: `http://127.0.0.1:${nestPort}`,
  ws: true,
});

proxy.on('error', (err, req, res) => {
  console.error('Proxy Error:', err);
  if (res.writeHead) {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Bad Gateway: Backend API is not ready or down.');
  }
});

// 3. Start Next.js Frontend
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      const { pathname } = parsedUrl;

      // Route /api/* and /socket.io/* to NestJS
      if (pathname.startsWith('/api') || pathname.startsWith('/socket.io')) {
        proxy.web(req, res);
      } else {
        // Route everything else to Next.js
        handle(req, res, parsedUrl);
      }
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Handle WebSocket Upgrades
  server.on('upgrade', (req, socket, head) => {
    const { pathname } = parse(req.url);
    if (pathname.startsWith('/socket.io')) {
      proxy.ws(req, socket, head);
    }
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Single Domain Mode Ready on port ${port}`);
    console.log(`> - Next.js (Frontend) handled internally`);
    console.log(`> - NestJS (Backend) running on internal port ${nestPort}`);
  });
}).catch((err) => {
  console.error('Fatal Error during Next.js app.prepare():', err);
  process.exit(1); // Exit immediately to prevent Passenger from hanging
});

// Ensure backend is killed when the server shuts down
process.on('exit', () => {
  backendProcess.kill();
});
process.on('SIGINT', () => {
  backendProcess.kill();
  process.exit();
});
process.on('SIGTERM', () => {
  backendProcess.kill();
  process.exit();
});
