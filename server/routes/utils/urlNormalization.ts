/**
 * Normalizes object storage URLs to ensure they use the /objects proxy route
 * This ensures proper CORS headers are applied
 * 
 * Handles:
 * - Google Cloud Storage absolute URLs (https://storage.googleapis.com/...)
 * - Already normalized paths (/objects/...)
 * - Legacy /api/objects paths (removes /api prefix)
 * - Legacy bucket paths
 * - External URLs (returned as-is)
 * 
 * @param url - The URL to normalize
 * @returns Normalized URL with /objects prefix, or original URL if external
 */
export function normalizeObjectStorageUrl(url: string | null | undefined): string {
  // Handle null/undefined
  if (!url) {
    return '';
  }

  // Handle Google Cloud Storage URLs (convert to /api/objects/... format)
  if (url.startsWith('https://storage.googleapis.com/')) {
    try {
      const urlObj = new URL(url);
      const rawObjectPath = urlObj.pathname;
      
      // Extract uploads path from /.private/uploads/...
      const privateUploadsMatch = rawObjectPath.match(/\/.private\/uploads\/(.+)$/);
      if (privateUploadsMatch) {
        return `/api/objects/uploads/${privateUploadsMatch[1]}`;
      }
      
      // Extract path from /public/...
      const publicMatch = rawObjectPath.match(/\/public\/(.+)$/);
      if (publicMatch) {
        return `/api/objects/public/${publicMatch[1]}`;
      }
      
      // If no pattern match, try to extract anything after the bucket name
      // Format: /{bucketName}/{path}
      const pathParts = rawObjectPath.split('/').filter(p => p);
      if (pathParts.length >= 2) {
        // Skip bucket name (first part), take the rest
        const objectPath = pathParts.slice(1).join('/');
        return `/api/objects/${objectPath}`;
      }
    } catch (error) {
      console.error('Failed to parse Google Storage URL:', url, error);
      // Fall through to other checks
    }
  }

  // Skip normalization for other external absolute URLs (http/https)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Skip normalization for Vite dev server paths (/@fs/, /@assets/, etc.)
  if (url.startsWith('/@')) {
    return url;
  }

  // Add /api prefix if it has /objects but no /api prefix  
  if (url.startsWith('/objects/')) {
    return url.replace('/objects/', '/api/objects/');
  }

  // Skip normalization if already has /api/objects prefix
  if (url.startsWith('/api/objects/')) {
    return url;
  }

  // For other relative paths that look like bucket paths, prepend /api/objects
  // This handles legacy formats like /repl-default-bucket-xxx/.private/...
  if (url.startsWith('/')) {
    return `/api/objects${url}`;
  }

  // If it doesn't start with /, assume it's a relative path and prepend /api/objects/
  return `/api/objects/${url}`;
}

/**
 * Normalizes a file object that contains a url property
 * Used for evidence files, event pack files, etc.
 */
export function normalizeFileObject<T extends { url?: string }>(file: T): T {
  if (!file || !file.url) {
    return file;
  }

  return {
    ...file,
    url: normalizeObjectStorageUrl(file.url),
  };
}

/**
 * Normalizes an array of files
 */
export function normalizeFileArray<T extends { url?: string }>(files: T[] | null | undefined): T[] {
  if (!files || !Array.isArray(files)) {
    return [];
  }

  return files.map(normalizeFileObject);
}
