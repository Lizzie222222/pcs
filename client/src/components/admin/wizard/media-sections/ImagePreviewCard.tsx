import { Badge } from '@/components/ui/badge';

interface ImagePreviewCardProps {
  image: {
    url: string;
    caption?: string;
    altText?: string;
    source?: string;
  };
}

export function ImagePreviewCard({ image }: ImagePreviewCardProps) {
  if (!image) {
    return null;
  }

  return (
    <div className="relative border rounded-lg overflow-hidden bg-card">
      {/* Source Badge - positioned with proper z-index */}
      <div className="absolute top-2 right-2 z-20">
        <Badge variant={image.source === 'evidence' ? 'default' : 'secondary'} className="shadow-sm">
          {image.source === 'evidence' ? 'Evidence' : 'Custom'}
        </Badge>
      </div>

      {/* Image Container with fallback */}
      <div className="relative w-full h-48 bg-muted flex items-center justify-center">
        <img
          src={image.url}
          alt={image.altText || 'Case study image'}
          className="w-full h-full object-cover"
          loading="lazy"
          crossOrigin="anonymous"
          onError={(e) => {
            const img = e.currentTarget;
            img.style.display = 'none';
            const parent = img.parentElement;
            if (parent && !parent.querySelector('.image-error-placeholder')) {
              const placeholder = document.createElement('div');
              placeholder.className = 'image-error-placeholder flex flex-col items-center justify-center text-muted-foreground p-4';
              
              // Create SVG icon safely
              const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
              svg.setAttribute('class', 'w-12 h-12 mb-2');
              svg.setAttribute('fill', 'none');
              svg.setAttribute('viewBox', '0 0 24 24');
              svg.setAttribute('stroke', 'currentColor');
              const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
              path.setAttribute('stroke-linecap', 'round');
              path.setAttribute('stroke-linejoin', 'round');
              path.setAttribute('stroke-width', '2');
              path.setAttribute('d', 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z');
              svg.appendChild(path);
              
              // Create text safely
              const text = document.createElement('p');
              text.className = 'text-xs text-center';
              text.textContent = 'Image loading...';
              
              // Append elements safely
              placeholder.appendChild(svg);
              placeholder.appendChild(text);
              parent.appendChild(placeholder);
            }
          }}
        />
      </div>

      {/* Caption */}
      {image.caption && (
        <div className="p-3">
          <p className="text-sm line-clamp-2">{image.caption}</p>
        </div>
      )}
    </div>
  );
}
