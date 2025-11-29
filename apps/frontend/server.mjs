// server.mjs
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const distPath = path.join(__dirname, 'dist');

// Serve static files (CSS, JS, images, etc.) from dist folder
app.use(express.static(distPath));

// SPA fallback – serve index.html for routes that don't match static files
app.use((req, res, next) => {
  // If response was already sent (by express.static), don't do anything
  if (res.headersSent) {
    return next();
  }
  
  // Check if this is a request for a static file (has file extension)
  // or is in the assets folder
  if (req.path.startsWith('/assets/') || /\.[^/]+$/.test(req.path)) {
    return next(); // Let Express handle 404 for missing files
  }
  
  // For all other routes, serve index.html for SPA routing
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Frontend listening on http://localhost:${port}`);
});
