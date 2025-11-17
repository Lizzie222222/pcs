import { ComponentType, lazy, LazyExoticComponent } from 'react';
import { isChunkLoadError } from './chunkErrorDetection';

/**
 * Wraps a lazy import with retry logic to handle transient failures
 * Useful for network flakiness or temporary CDN issues
 * 
 * @param importFn - The dynamic import function
 * @param maxRetries - Maximum number of retry attempts (default: 2, so 3 total attempts)
 * @param interval - Delay between retries in ms (default: 1000)
 */
export function lazyRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  maxRetries = 2,
  interval = 1000
): LazyExoticComponent<T> {
  return lazy(() => {
    return new Promise<{ default: T }>((resolve, reject) => {
      const attemptImport = (retriesRemaining: number) => {
        importFn()
          .then(resolve)
          .catch((error) => {
            // If this is a chunk load error and we have retries left
            if (isChunkLoadError(error) && retriesRemaining > 0) {
              console.warn(
                `[Lazy Retry] Failed to load chunk, retrying... (${retriesRemaining} retries remaining)`,
                error
              );
              setTimeout(() => {
                attemptImport(retriesRemaining - 1);
              }, interval);
            } else {
              // Out of retries or non-chunk error - reject and let error boundary handle it
              reject(error);
            }
          });
      };

      attemptImport(maxRetries);
    });
  });
}
