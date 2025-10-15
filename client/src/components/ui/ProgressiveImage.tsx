import { useState, useEffect, useRef } from 'react';
import { useConnectionSpeed } from '@/hooks/useConnectionSpeed';

interface ProgressiveImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  onLoad?: () => void;
}

export function ProgressiveImage({ 
  src, 
  alt, 
  className = '', 
  width, 
  height,
  priority = false,
  onLoad 
}: ProgressiveImageProps) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [imageLoading, setImageLoading] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);
  const { connectionInfo } = useConnectionSpeed();

  useEffect(() => {
    const img = new Image();
    
    // Use lower quality for slow connections
    const quality = connectionInfo.isSlowConnection ? 'q_50' : 'q_80';
    const format = 'f_auto';
    
    // Optimize image URL if it's from attached_assets
    let optimizedSrc = src;
    if (src.includes('attached_assets/')) {
      // For very large images on slow connections, use a smaller version
      if (connectionInfo.isSlowConnection && width && width > 1200) {
        optimizedSrc = src; // Keep original for now, will optimize server-side later
      }
    }
    
    img.src = optimizedSrc;
    img.onload = () => {
      setImageSrc(optimizedSrc);
      setImageLoading(false);
      onLoad?.();
    };
    
    img.onerror = () => {
      setImageSrc(src); // Fallback to original
      setImageLoading(false);
    };
  }, [src, connectionInfo.isSlowConnection, width, onLoad]);

  return (
    <div className={`relative ${className}`}>
      {imageLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
      <img
        ref={imgRef}
        src={imageSrc || src}
        alt={alt}
        width={width}
        height={height}
        className={`${className} ${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-500`}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
      />
    </div>
  );
}
