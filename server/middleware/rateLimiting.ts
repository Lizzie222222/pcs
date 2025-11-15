import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request, Response } from 'express';
import { log } from '../vite';

// Bot blocklist - common bot/scanner endpoints that don't exist on our site
// NOTE: Do NOT include '/admin' here - it's a real route for the admin panel!
const botEndpoints = [
  '/xmlrpc.php',
  '/wp-admin',
  '/wp-login.php',
  '/.env',
  '/phpmyadmin',
  '/.git',
  '/wp-content',
  '/wordpress',
];

// Very aggressive rate limiting for bot endpoints (5 requests per hour)
export const botBlocker = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Too many requests to non-existent endpoint' },
  standardHeaders: true,
  legacyHeaders: false,
  // Only apply to bot endpoints - use exact path matching or startsWith
  skip: (req: Request) => {
    const path = req.path;
    return !botEndpoints.some(endpoint => 
      path === endpoint || path.startsWith(endpoint + '/')
    );
  },
  handler: (req: Request, res: Response) => {
    log(`[Rate Limit] Blocked bot request to ${req.path} from ${req.ip}`);
    res.status(429).json({ 
      error: 'Too many requests to non-existent endpoint',
      retryAfter: '1 hour'
    });
  },
  keyGenerator: (req: Request) => `bot:${ipKeyGenerator(req)}`,
});

// General API rate limiter with tiered limits based on authentication
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: async (req: Request) => {
    // Check if user is authenticated and their role
    const user = (req as any).user;
    
    if (!user) {
      // Anonymous users: 100 requests per 15 minutes
      return 100;
    }
    
    if (user.role === 'admin' || user.isAdmin) {
      // Admins: 1000 requests per 15 minutes (protects from infinite loops but won't bother normal use)
      return 1000;
    }
    
    // Authenticated users: 300 requests per 15 minutes
    return 300;
  },
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip non-API routes
  skip: (req: Request) => {
    return !req.path.startsWith('/api');
  },
  handler: (req: Request, res: Response) => {
    const user = (req as any).user;
    const identifier = user ? `user ${user.email}` : `IP ${req.ip}`;
    log(`[Rate Limit] Blocked ${identifier} from ${req.path}`);
    res.status(429).json({ 
      error: 'Too many requests, please try again later',
      retryAfter: '15 minutes'
    });
  },
  // Use IP + user ID as key for better accuracy
  keyGenerator: (req: Request) => {
    const user = (req as any).user;
    return user ? `user:${user.id}` : `ip:${ipKeyGenerator(req)}`;
  },
});
