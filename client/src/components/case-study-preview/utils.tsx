import { useEffect, useRef, useState } from "react";
import type { VideoItem } from "./types";

export function getStageColor(stage: string): string {
  switch (stage) {
    case 'inspire': return 'bg-pcs_blue text-white';
    case 'investigate': return 'bg-yellow text-white';
    case 'act': return 'bg-coral text-white';
    default: return 'bg-gray-500 text-white';
  }
}

export function AnimatedCounter({ 
  value, 
  duration = 2000,
  animate = true 
}: { 
  value: string; 
  duration?: number;
  animate?: boolean;
}) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  
  const parseValue = (val: string) => {
    const match = val.match(/^([^\d.-]*)?([\d.,]+)(.*)$/);
    if (match) {
      const prefix = match[1] || '';
      const number = parseFloat(match[2].replace(/,/g, '')) || 0;
      const suffix = match[3] || '';
      return { prefix, number, suffix };
    }
    return { prefix: '', number: 0, suffix: val };
  };

  const { prefix, number: numericValue, suffix } = parseValue(value);
  const hasDecimals = value.includes('.');

  useEffect(() => {
    if (!animate) {
      setCount(numericValue);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);
            let start = 0;
            const increment = numericValue / (duration / 16);
            
            const timer = setInterval(() => {
              start += increment;
              if (start >= numericValue) {
                setCount(numericValue);
                clearInterval(timer);
              } else {
                setCount(start);
              }
            }, 16);

            return () => clearInterval(timer);
          }
        });
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [numericValue, duration, hasAnimated, animate]);

  const displayValue = hasDecimals ? count.toFixed(1) : Math.floor(count);
  
  return <span ref={ref}>{prefix}{displayValue}{suffix}</span>;
}

export function VideoEmbed({ video }: { video: VideoItem }) {
  const getEmbedUrl = (url: string, platform?: string) => {
    if (platform === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('youtu.be') 
        ? url.split('youtu.be/')[1]?.split('?')[0]
        : url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (platform === 'vimeo' || url.includes('vimeo.com')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return url;
  };

  const embedUrl = getEmbedUrl(video.url, video.platform);

  return (
    <div className="relative w-full pt-[56.25%]">
      <iframe
        src={embedUrl}
        className="absolute top-0 left-0 w-full h-full rounded-lg"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
