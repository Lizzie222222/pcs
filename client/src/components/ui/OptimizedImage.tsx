import { useState, useRef, useEffect, useCallback } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useConnectionSpeed } from '@/hooks/useConnectionSpeed';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  onLoad?: () => void;
  onError?: () => void;
  responsive?: boolean;
  respectConnectionSpeed?: boolean; // New prop to enable/disable connection speed optimization
  breakpoints?: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
}

interface ImageFormats {
  avif?: string;
  webp?: string;
  original: string;
}

/**
 * High-performance image component with modern format support and responsive loading
 * Features:
 * - WebP/AVIF format support with fallbacks
 * - Responsive images with srcset
 * - Progressive blur placeholder
 * - Intersection Observer lazy loading
 * - Size-based optimization
 */
export function OptimizedImage({ 
  src, 
  alt, 
  width, 
  height, 
  className = '', 
  priority = false, 
  sizes,
  quality = 85,
  placeholder = 'empty',
  blurDataURL,
  onLoad,
  onError,
  responsive = true,
  respectConnectionSpeed = true,
  breakpoints = { mobile: 640, tablet: 1024, desktop: 1920 }
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [failedFormats, setFailedFormats] = useState<Set<string>>(new Set());
  const imgRef = useRef<HTMLImageElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const connectionSpeed = useConnectionSpeed();
  
  // Apply connection speed optimizations
  const effectiveQuality = respectConnectionSpeed ? 
    (quality !== 85 ? quality : connectionSpeed.recommendedImageQuality) : quality;
  const effectiveResponsive = respectConnectionSpeed ? 
    (responsive && connectionSpeed.shouldLoadHighQuality) : responsive;
  // Disable lazy loading for small images (logos) or priority images
  const shouldUseLazyLoading = respectConnectionSpeed ? 
    (!priority && (connectionSpeed.connectionInfo.isSlowConnection || connectionSpeed.connectionInfo.saveData) && (width && width > 200)) : 
    (!priority && (width && width > 200));
  const effectiveBreakpoints = respectConnectionSpeed && connectionSpeed.connectionInfo.isSlowConnection ? 
    { mobile: Math.min(480, breakpoints.mobile), tablet: Math.min(768, breakpoints.tablet), desktop: Math.min(1280, breakpoints.desktop) } : 
    breakpoints;

  // Generate different format URLs based on the original src
  const generateImageFormats = useCallback((originalSrc: string): ImageFormats => {
    // If it's an external URL, check if it's a service that supports modern formats
    if (originalSrc.startsWith('http')) {
      // Services like Unsplash can generate WebP/AVIF on demand
      if (originalSrc.includes('unsplash.com') || 
          originalSrc.includes('images.unsplash.com') ||
          originalSrc.includes('cloudinary.com')) {
        const url = new URL(originalSrc);
        return {
          avif: url.toString() + (url.search ? '&' : '?') + 'fm=avif',
          webp: url.toString() + (url.search ? '&' : '?') + 'fm=webp', 
          original: originalSrc
        };
      }
      // For other external URLs, return as-is
      return { original: originalSrc };
    }

    // For local assets, be conservative and only use the original format
    // This prevents trying to load non-existent WebP/AVIF variants
    // If you have pre-generated modern format versions, you can uncomment
    // the code below and ensure those files exist:
    //
    // const basePath = originalSrc.replace(/\.[^.]+$/, '');
    // const extension = originalSrc.split('.').pop()?.toLowerCase();
    // 
    // if (extension === 'png' || extension === 'jpg' || extension === 'jpeg') {
    //   return {
    //     avif: `${basePath}.avif`,
    //     webp: `${basePath}.webp`,
    //     original: originalSrc
    //   };
    // }

    return { original: originalSrc };
  }, []);

  // Generate responsive srcset for different screen sizes
  const generateSrcSet = useCallback((formats: ImageFormats, targetWidth?: number): string => {
    if (!effectiveResponsive || !targetWidth) return '';

    // Adjust density multipliers based on connection speed
    const densityMultipliers = respectConnectionSpeed && connectionSpeed.connectionInfo.isSlowConnection ? 
      [0.5, 1] : // Only 0.5x and 1x for slow connections
      [0.5, 1, 1.5, 2]; // Full range for fast connections

    const sizes = densityMultipliers.map(multiplier => Math.round(targetWidth * multiplier));

    return sizes
      .map(size => {
        if (formats.original.startsWith('http')) {
          // For external URLs like Unsplash, use their URL parameters
          const url = new URL(formats.original);
          url.searchParams.set('w', size.toString());
          if (effectiveQuality !== 85) {
            url.searchParams.set('q', effectiveQuality.toString());
          }
          return `${url.toString()} ${size}w`;
        } else {
          // For local assets, assume we have different sizes available
          const basePath = formats.original.replace(/\.[^.]+$/, '');
          const extension = formats.original.split('.').pop();
          return `${basePath}-${size}w.${extension} ${size}w`;
        }
      })
      .join(', ');
  }, [effectiveResponsive, effectiveQuality, respectConnectionSpeed, connectionSpeed.connectionInfo.isSlowConnection]);

  // Intersection Observer for lazy loading (respects connection speed)
  useEffect(() => {
    if (!shouldUseLazyLoading || isInView) return;

    // Adjust root margin based on connection speed - load closer to viewport on slow connections
    const rootMargin = respectConnectionSpeed && connectionSpeed.connectionInfo.isSlowConnection ? 
      '20px 0px' : '50px 0px';

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin,
        threshold: 0.01
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [shouldUseLazyLoading, isInView, respectConnectionSpeed, connectionSpeed.connectionInfo.isSlowConnection]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setIsError(true);
    onError?.();
  }, [onError]);

  // Handle source format failures
  const handleSourceError = useCallback((format: 'avif' | 'webp') => {
    setFailedFormats(prev => new Set(Array.from(prev).concat(format)));
  }, []);

  // Generate image formats and srcsets
  const formats = generateImageFormats(src);
  const srcSet = generateSrcSet(formats, width);

  // Calculate sizes attribute for responsive images (respects connection speed)
  const sizesAttribute = sizes || (effectiveResponsive && width ? 
    `(max-width: ${effectiveBreakpoints.mobile}px) 100vw, ` +
    `(max-width: ${effectiveBreakpoints.tablet}px) 50vw, ` +
    `${width}px`
    : undefined
  );

  // Create blur placeholder styles
  const placeholderStyles = placeholder === 'blur' && blurDataURL ? {
    backgroundImage: `url("${blurDataURL}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  } : {};

  // Don't render anything until in view (for lazy loading) - but only if lazy loading is actually enabled
  if (shouldUseLazyLoading && !isInView) {
    return (
      <div
        ref={imgRef}
        className={`${className} bg-gray-100`}
        style={{ 
          width: width ? `${width}px` : '100%', 
          height: height ? `${height}px` : 'auto',
          aspectRatio: width && height ? `${width}/${height}` : undefined,
          ...placeholderStyles
        }}
        data-testid="img-placeholder"
      />
    );
  }

  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      style={{ 
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : 'auto',
        aspectRatio: width && height ? `${width}/${height}` : undefined
      }}
    >
      {/* Blur placeholder background */}
      {placeholder === 'blur' && blurDataURL && !isLoaded && (
        <div
          className="absolute inset-0"
          style={placeholderStyles}
        />
      )}

      {/* Loading placeholder */}
      {!isLoaded && !isError && placeholder === 'empty' && (
        <div className="absolute inset-0 bg-gray-100" />
      )}

      {/* Progressive enhancement with modern formats */}
      <picture>
        {/* AVIF format for maximum compression */}
        {formats.avif && !Array.from(failedFormats).includes('avif') && (
          <source
            srcSet={responsive ? generateSrcSet({ original: formats.avif }, width) : formats.avif}
            sizes={sizesAttribute}
            type="image/avif"
            onError={() => handleSourceError('avif')}
          />
        )}
        
        {/* WebP format as fallback */}
        {formats.webp && !Array.from(failedFormats).includes('webp') && (
          <source
            srcSet={responsive ? generateSrcSet({ original: formats.webp }, width) : formats.webp}
            sizes={sizesAttribute}
            type="image/webp"
            onError={() => handleSourceError('webp')}
          />
        )}
        
        {/* Original format as final fallback */}
        <img
          ref={imgRef}
          src={formats.original}
          srcSet={srcSet || undefined}
          sizes={sizesAttribute}
          alt={alt}
          width={width}
          height={height}
          className={`
            w-full h-full object-cover transition-opacity duration-300
            ${isLoaded ? 'opacity-100' : 'opacity-0'}
            ${!prefersReducedMotion && isLoaded ? 'animate-in fade-in duration-300' : ''}
          `}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          style={{
            ...(priority && { fetchPriority: 'high' } as any)
          }}
          data-testid="img-optimized"
        />
      </picture>

      {/* Error state */}
      {isError && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
          Failed to load image
        </div>
      )}
    </div>
  );
}

/**
 * Generate a low-quality blur placeholder from an image source
 * This would typically be done at build time or by a service
 */
export function generateBlurDataURL(src: string): string {
  // For demo purposes, return a simple gray placeholder
  // In production, this would generate an actual blurred, low-quality version
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
    </svg>
  `)}`;
}

/**
 * Hook to check if modern image formats are supported
 */
export function useModernImageSupport() {
  const [support, setSupport] = useState({
    avif: false,
    webp: false
  });

  useEffect(() => {
    const checkFormat = (format: 'avif' | 'webp'): Promise<boolean> => {
      return new Promise((resolve) => {
        const testImages = {
          avif: 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=',
          webp: 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA'
        };

        const img = new Image();
        img.onload = () => resolve(img.width > 0 && img.height > 0);
        img.onerror = () => resolve(false);
        img.src = testImages[format];
      });
    };

    const checkSupport = async () => {
      const [avifSupported, webpSupported] = await Promise.all([
        checkFormat('avif'),
        checkFormat('webp')
      ]);

      setSupport({ avif: avifSupported, webp: webpSupported });
    };

    checkSupport();
  }, []);

  return support;
}

export default OptimizedImage;