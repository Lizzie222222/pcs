import type { Request, Response, NextFunction } from 'express';
import { log } from '../vite';

// Request timeout middleware - prevents hanging requests
// Default: 90 seconds to handle long operations like PDF generation, bulk emails, etc.
export const requestTimeout = (timeoutMs: number = 90000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Set timeout on the request
    req.setTimeout(timeoutMs, () => {
      if (!res.headersSent) {
        log(`[Timeout] Request to ${req.method} ${req.path} timed out after ${timeoutMs}ms`);
        res.status(504).json({
          error: 'Gateway Timeout',
          message: 'The request took too long to process. Please try again.',
          timeout: `${timeoutMs / 1000} seconds`
        });
      }
    });

    // Set timeout on the response
    res.setTimeout(timeoutMs, () => {
      if (!res.headersSent) {
        log(`[Timeout] Response for ${req.method} ${req.path} timed out after ${timeoutMs}ms`);
        res.status(504).json({
          error: 'Gateway Timeout',
          message: 'The server took too long to respond. Please try again.',
          timeout: `${timeoutMs / 1000} seconds`
        });
      }
    });

    next();
  };
};
