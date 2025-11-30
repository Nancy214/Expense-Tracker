// server.mjs
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3002;
const distPath = path.join(__dirname, 'dist');

// Serve static files (CSS, JS, images, etc.) from dist folder
// Set proper options to ensure all files are served correctly
app.use(express.static(distPath, {
  maxAge: '1y', // Cache static assets
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Ensure CSS files are served with correct content-type
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    }
  }
}));

// SPA fallback – serve index.html for routes that don't match static files
app.get('*', (req, res, next) => {
  // Skip if this is a request for a static file
  if (req.path.startsWith('/assets/') || /\.[^/]+$/.test(req.path)) {
    return next(); // Let Express handle 404 for missing files
  }
  
  // For all other routes, serve index.html for SPA routing
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      next(err);
    }
  });
});

app.listen(port, () => {
  console.log(`Frontend listening on http://localhost:${port}`);
  console.log(`Serving files from: ${distPath}`);
});
