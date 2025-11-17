/**
 * Centralized chunk loading error detection
 * Handles various error formats from different browsers and loading scenarios
 */
export function isChunkLoadError(error: any): boolean {
  if (!error) return false;
  
  // Check error message
  const errorMessage = error?.message || error?.toString() || '';
  const hasChunkErrorMessage = 
    errorMessage.includes('Failed to fetch dynamically imported module') ||
    errorMessage.includes('error loading dynamically imported module') ||
    errorMessage.includes('Importing a module script failed') ||
    errorMessage.includes('ChunkLoadError') ||
    errorMessage.includes('Loading chunk') ||
    errorMessage.includes('Loading CSS chunk');
  
  if (hasChunkErrorMessage) return true;
  
  // Check for script/module loading errors
  // When a script 404s, error.type === 'error' and error.target is a script element
  if (error.type === 'error' && error.target) {
    const target = error.target;
    if (target.tagName === 'SCRIPT' || target.tagName === 'LINK') {
      return true;
    }
  }
  
  // Check filename patterns (common chunk file patterns)
  if (error.filename) {
    const hasChunkFilename = 
      /\.chunk\.(js|css)/.test(error.filename) ||
      /-[a-f0-9]{8,}\.(js|css)/.test(error.filename);
    if (hasChunkFilename) return true;
  }
  
  return false;
}
