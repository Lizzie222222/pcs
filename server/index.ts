import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import compression from "compression";
import fs from "fs";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite";
import { initializeWebSocket } from "./websocket";
import { initScheduler } from "./scheduler";
import { startHealthMonitoring } from "./healthMonitor";
import { botBlocker } from "./middleware/rateLimiting";
import { requestTimeout } from "./middleware/timeout";

const app = express();

// Bot blocker - Apply early to reject bot traffic immediately
app.use(botBlocker);

// Enable gzip/brotli compression for all responses
// This reduces JSON API responses by 60-80% for faster AI agent edits
app.use(compression({
  // Only compress responses larger than 1kb
  threshold: 1024,
  // Compression level (1-9, higher = better compression but slower)
  level: 6,
  // Filter function to decide what to compress
  filter: (req, res) => {
    // Don't compress if explicitly requested not to
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression filter
    return compression.filter(req, res);
  }
}));

app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: false, limit: '200mb' }));

// Configure CORS to allow credentials from approved origins only
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Build allowlist of approved origins
    const allowedOrigins: string[] = [];
    
    // Add REPLIT_DOMAINS (works for both dev and production)
    if (process.env.REPLIT_DOMAINS) {
      const replitDomains = process.env.REPLIT_DOMAINS.split(',').map(d => d.trim());
      allowedOrigins.push(...replitDomains.map(d => `https://${d}`));
    }
    
    // In development, also allow localhost
    if (process.env.NODE_ENV === 'development' || process.env.REPLIT_CONTEXT === 'testing') {
      allowedOrigins.push('http://localhost:5000');
      allowedOrigins.push('http://127.0.0.1:5000');
    }
    
    // In production, allow additional domains from environment variable
    if (process.env.ALLOWED_ORIGINS) {
      const origins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
      allowedOrigins.push(...origins);
    }
    
    // Check if origin is in allowlist
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Reject unauthorized origins
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Range'],
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length'],
}));

// Request timeout - Prevent hanging requests (90 seconds)
// Placed after CORS to ensure preflight requests get proper headers before timeout
app.use(requestTimeout(90000));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Initialize WebSocket server
  initializeWebSocket(server);
  log('[WebSocket] Real-time collaboration server initialized');

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    // Production: Serve static assets with proper cache-control headers
    const distPath = path.resolve(import.meta.dirname, "../dist/public");

    if (!fs.existsSync(distPath)) {
      throw new Error(
        `Could not find the build directory: ${distPath}, make sure to build the client first`,
      );
    }

    // Serve static files with appropriate caching based on file type
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        const ext = path.extname(filePath);
        const basename = path.basename(filePath);
        
        // For hashed assets (JS/CSS with content hashes in filename), cache aggressively
        if ((ext === '.js' || ext === '.css') && /[a-f0-9]{8,}/.test(basename)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
        // For other static assets (images, fonts, media), cache moderately
        else if (/\.(png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot|webp|avif|mp4|webm)$/.test(ext)) {
          res.setHeader('Cache-Control', 'public, max-age=604800'); // 1 week
        }
        // For HTML files, never cache
        else if (ext === '.html' || basename === 'index.html') {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      }
    }));

    // SPA fallback: serve index.html for all other routes
    app.use("*", (_req, res) => {
      // Never cache index.html for SPA routes
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    log(`serving on port ${port}`);
    
    // Run migration to fix schools stuck in previous rounds
    const { storage } = await import('./storage');
    try {
      const result = await storage.migrateStuckSchools();
      if (result.fixed > 0) {
        log(`[Migration] Fixed ${result.fixed} schools stuck in previous rounds`);
        result.schools.forEach(school => log(`  - ${school}`));
      }
    } catch (error) {
      console.error('[Migration] Error during school migration:', error);
    }
    
    // Initialize automated weekly digest scheduler
    initScheduler();
    
    // Initialize health monitoring service
    startHealthMonitoring();
  });
})();
