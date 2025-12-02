import rateLimit from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';
import { log } from '../vite';

// Bot blocklist - common bot/scanner endpoints that don't exist on our site
// NOTE: Do NOT include '/admin' here - it's a real route for the admin panel!
const botEndpoints = [
  '/xmlrpc.php',
  '/wp-admin',
  '/wp-login.php',
  '/wp-signup.php',
  '/.env',
  '/phpmyadmin',
  '/.git',
  '/wp-content',
  '/wordpress',
  '/wp-includes',
  '/wp-json',
  '/.well-known/security.txt',
  '/config.php',
  '/administrator',
  '/admin.php',
  '/backup',
  '/mysql',
  '/phpinfo',
  '/shell',
  '/cgi-bin',
];

// Immediate bot blocker - returns 404 instantly without any processing
// This is applied BEFORE rate limiting to save resources
export const immediateBlocker = (req: Request, res: Response, next: NextFunction) => {
  const path = req.path.toLowerCase();
  
  // Check for known bot endpoints
  const isBotPath = botEndpoints.some(endpoint => 
    path === endpoint.toLowerCase() || path.startsWith(endpoint.toLowerCase() + '/')
  );
  
  if (isBotPath) {
    log(`[Bot Block] Blocked bot request to ${req.path} from ${req.ip}`);
    return res.status(404).send('Not Found');
  }
  
  // Check for empty User-Agent (common with bots and scanners)
  const userAgent = req.headers['user-agent'];
  if (!userAgent || userAgent.trim() === '') {
    // Allow some internal requests without User-Agent
    const isInternalRequest = req.path.startsWith('/api/') && req.headers['x-requested-with'];
    if (!isInternalRequest) {
      log(`[Bot Block] Blocked empty User-Agent request to ${req.path} from ${req.ip}`);
      return res.status(403).json({ error: 'Forbidden' });
    }
  }
  
  // Check for known malicious User-Agent patterns
  if (userAgent) {
    const lowerUA = userAgent.toLowerCase();
    const suspiciousPatterns = [
      'sqlmap',
      'nikto',
      'nmap',
      'masscan',
      'zgrab',
      'gobuster',
      'dirbuster',
      'wpscan',
      'acunetix',
      'nessus',
      'openvas',
    ];
    
    if (suspiciousPatterns.some(pattern => lowerUA.includes(pattern))) {
      log(`[Bot Block] Blocked suspicious User-Agent "${userAgent}" from ${req.ip}`);
      return res.status(403).json({ error: 'Forbidden' });
    }
  }
  
  next();
};

// Legacy bot blocker with rate limiting (kept for additional protection)
// This catches any bots that slip through the immediate blocker
export const botBlocker = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Too many requests to non-existent endpoint' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, default: false },
  skip: (req: Request) => {
    const path = req.path.toLowerCase();
    return !botEndpoints.some(endpoint => 
      path === endpoint.toLowerCase() || path.startsWith(endpoint.toLowerCase() + '/')
    );
  },
  handler: (req: Request, res: Response) => {
    log(`[Rate Limit] Blocked bot request to ${req.path} from ${req.ip}`);
    res.status(429).json({ 
      error: 'Too many requests to non-existent endpoint',
      retryAfter: '1 hour'
    });
  },
  keyGenerator: (req: Request) => `bot:${req.ip || 'unknown'}`,
});

// General API rate limiter with tiered limits based on authentication
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: async (req: Request) => {
    const user = (req as any).user;
    
    if (!user) {
      return 100;
    }
    
    if (user.role === 'admin' || user.isAdmin) {
      return 5000; // Increased for admin analytics dashboards
    }
    
    return 300;
  },
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, default: false },
  skip: (req: Request) => {
    // Skip rate limiting for non-API routes
    if (!req.path.startsWith('/api')) {
      return true;
    }
    
    // Skip rate limiting for admin analytics endpoints for authenticated admins
    const user = (req as any).user;
    if (user && (user.role === 'admin' || user.isAdmin)) {
      if (req.path.startsWith('/api/admin/analytics')) {
        return true;
      }
    }
    
    return false;
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
  keyGenerator: (req: Request) => {
    const user = (req as any).user;
    return user ? `user:${user.id}` : `ip:${req.ip || 'unknown'}`;
  },
});
