/**
 * Normalizes object storage URLs to ensure they use the /api/objects proxy route
 * This ensures proper CORS headers are applied
 * 
 * @param url - The URL to normalize
 * @returns Normalized URL with /api/objects prefix, or original URL if already normalized/absolute
 */
export function normalizeObjectStorageUrl(url: string | null | undefined): string {
  // Handle null/undefined
  if (!url) {
    return '';
  }

  // Skip normalization for absolute URLs (http/https)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Skip normalization for Vite dev server paths (/@fs/, /@assets/, etc.)
  if (url.startsWith('/@')) {
    return url;
  }

  // Skip normalization if already has /api/objects prefix
  if (url.startsWith('/api/objects')) {
    return url;
  }

  // If URL starts with /objects/, prepend only /api
  if (url.startsWith('/objects/')) {
    return `/api${url}`;
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
