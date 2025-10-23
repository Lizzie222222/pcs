import sharp from 'sharp';

/**
 * Compression options for different image types
 */
export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'original';
}

/**
 * Default compression settings optimized for web storage
 */
const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 85,
  format: 'original',
};

/**
 * Compresses an image buffer while maintaining aspect ratio and quality
 * 
 * @param buffer - Input image buffer
 * @param options - Compression options (optional)
 * @returns Compressed image buffer
 */
export async function compressImage(
  buffer: Buffer,
  options: CompressionOptions = {}
): Promise<Buffer> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  try {
    let transformer = sharp(buffer);
    
    // Get metadata to determine original format
    const metadata = await transformer.metadata();
    const originalFormat = metadata.format;
    
    // Resize if dimensions exceed maximum
    if (opts.maxWidth || opts.maxHeight) {
      transformer = transformer.resize(opts.maxWidth, opts.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }
    
    // Apply format-specific compression
    const targetFormat = opts.format === 'original' ? originalFormat : opts.format;
    
    switch (targetFormat) {
      case 'jpeg':
      case 'jpg':
        transformer = transformer.jpeg({ quality: opts.quality, mozjpeg: true });
        break;
      case 'png':
        transformer = transformer.png({ 
          quality: opts.quality,
          compressionLevel: 9,
          adaptiveFiltering: true,
        });
        break;
      case 'webp':
        transformer = transformer.webp({ quality: opts.quality });
        break;
      default:
        // For other formats (gif, svg, etc.), apply jpeg compression as fallback
        if (originalFormat !== 'gif' && originalFormat !== 'svg') {
          transformer = transformer.jpeg({ quality: opts.quality, mozjpeg: true });
        }
    }
    
    return await transformer.toBuffer();
  } catch (error) {
    console.error('Image compression error:', error);
    throw new Error('Failed to compress image');
  }
}

/**
 * Estimates compression savings without actually compressing
 * 
 * @param originalSize - Original file size in bytes
 * @param options - Compression options
 * @returns Estimated compressed size in bytes
 */
export function estimateCompressionSavings(
  originalSize: number,
  options: CompressionOptions = {}
): number {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Rough estimation based on quality setting
  const qualityFactor = (opts.quality || 85) / 100;
  const estimatedSize = originalSize * qualityFactor * 0.7; // Conservative estimate
  
  return Math.max(estimatedSize, originalSize * 0.3); // At least 30% of original
}

/**
 * Checks if a file should be compressed based on its mime type
 * 
 * @param mimeType - File MIME type (can be undefined or empty)
 * @returns true if the file is an image that can be compressed
 */
export function shouldCompressFile(mimeType: string | undefined): boolean {
  if (!mimeType) {
    return false;
  }
  
  const compressibleTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/tiff',
    'image/bmp',
  ];
  
  return compressibleTypes.includes(mimeType.toLowerCase());
}
