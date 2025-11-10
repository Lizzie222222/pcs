import { useState, useEffect } from 'react';
import { normalizeObjectStorageUrl } from './urlNormalization';

/**
 * Media asset detection utilities for handling images, PDFs, and other file types
 * Used across case study components to properly render different media types
 */

// Cache for PDF detection results to avoid redundant HEAD requests
const pdfDetectionCache = new Map<string, boolean>();

/**
 * Check if a URL points to a PDF file by checking Content-Type header
 * Results are cached to avoid redundant network requests
 */
export async function isPdfUrl(url: string): Promise<boolean> {
  if (!url) return false;

  // Check cache first
  if (pdfDetectionCache.has(url)) {
    return pdfDetectionCache.get(url)!;
  }

  // Quick check: file extension
  if (url.toLowerCase().endsWith('.pdf')) {
    pdfDetectionCache.set(url, true);
    return true;
  }

  // For object storage paths without extensions, check Content-Type
  try {
    const normalizedUrl = normalizeObjectStorageUrl(url);
    const response = await fetch(normalizedUrl, { method: 'HEAD' });
    const contentType = response.headers.get('Content-Type');
    const isPdf = contentType?.includes('application/pdf') || false;
    
    // Cache the result
    pdfDetectionCache.set(url, isPdf);
    return isPdf;
  } catch (error) {
    console.error('Error checking if URL is PDF:', error);
    pdfDetectionCache.set(url, false);
    return false;
  }
}

/**
 * Check if a media item (with optional type field) is a PDF
 * Uses type metadata if available, otherwise falls back to URL detection
 */
export function isPdfMedia(media: { url?: string; type?: string } | string): boolean {
  if (typeof media === 'string') {
    return media.toLowerCase().endsWith('.pdf');
  }
  
  // Check type field first (from metadata)
  if (media.type === 'application/pdf') {
    return true;
  }
  
  // Quick check URL extension
  if (media.url?.toLowerCase().endsWith('.pdf')) {
    return true;
  }
  
  return false;
}

/**
 * React hook for async PDF detection of a single URL
 * Returns [isPdf, isLoading] tuple
 * 
 * @example
 * const [isPdf, isLoading] = useMediaAssetInfo(imageUrl);
 * if (isLoading) return <LoadingState />;
 * if (isPdf) return <PDFThumbnail url={imageUrl} />;
 * return <OptimizedImage src={imageUrl} />;
 */
export function useMediaAssetInfo(url: string | undefined | null): [boolean, boolean] {
  const [isPdf, setIsPdf] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!url) {
      setIsPdf(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Quick synchronous checks first
    if (url.toLowerCase().endsWith('.pdf')) {
      setIsPdf(true);
      setIsLoading(false);
      return;
    }

    // Check cache
    if (pdfDetectionCache.has(url)) {
      setIsPdf(pdfDetectionCache.get(url)!);
      setIsLoading(false);
      return;
    }

    // Async detection
    isPdfUrl(url).then((result) => {
      setIsPdf(result);
      setIsLoading(false);
    });
  }, [url]);

  return [isPdf, isLoading];
}

/**
 * Clear the PDF detection cache
 * Useful for testing or when media URLs change
 */
export function clearMediaCache(): void {
  pdfDetectionCache.clear();
}
