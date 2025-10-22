import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SortableImageCardProps {
  id: string;
  image: {
    url: string;
    caption?: string;
    altText?: string;
    source?: string;
  };
  index: number;
  onRemove: () => void;
}

export function SortableImageCard({ id, image, index, onRemove }: SortableImageCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group border rounded-lg overflow-hidden bg-card"
      data-testid={`sortable-image-${index}`}
    >
      {/* Screen reader instructions */}
      <span id="drag-instructions" className="sr-only">
        Press Space to grab the image, use Arrow keys to reorder, and press Space again to drop
      </span>

      {/* Drag Handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 cursor-grab active:cursor-grabbing z-20 bg-background/90 backdrop-blur-sm rounded p-1.5 border shadow-sm hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
        data-testid={`drag-handle-${index}`}
        aria-label="Drag to reorder image"
        aria-describedby="drag-instructions"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Source Badge - positioned with enough space from corners */}
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
          onLoad={() => {
            console.log('[SortableImageCard] ✅ Image loaded successfully:', {
              url: image.url,
              source: image.source,
              index,
              hasCaption: !!image.caption
            });
          }}
          onError={(e) => {
            console.error('[SortableImageCard] ❌ Image failed to load:', {
              url: image.url,
              source: image.source,
              index,
              fullImage: image
            });
            const img = e.currentTarget;
            img.style.display = 'none';
            const parent = img.parentElement;
            if (parent && !parent.querySelector('.image-error-placeholder')) {
              const placeholder = document.createElement('div');
              placeholder.className = 'image-error-placeholder flex flex-col items-center justify-center text-destructive p-4';
              
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
              path.setAttribute('d', 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z');
              svg.appendChild(path);
              
              // Create title text safely
              const title = document.createElement('p');
              title.className = 'text-xs font-semibold text-center';
              title.textContent = 'Image Failed to Load';
              
              // Create URL text safely (prevents XSS by using textContent)
              const urlText = document.createElement('p');
              urlText.className = 'text-xs text-center break-all mt-1 max-w-full';
              const truncatedUrl = image.url?.substring(0, 50) || '';
              urlText.textContent = truncatedUrl + ((image.url?.length || 0) > 50 ? '...' : '');
              
              // Append all elements safely
              placeholder.appendChild(svg);
              placeholder.appendChild(title);
              placeholder.appendChild(urlText);
              parent.appendChild(placeholder);
            }
          }}
        />
      </div>

      {/* Info & Actions */}
      <div className="p-3 space-y-2">
        {image.caption && (
          <p className="text-sm line-clamp-2 text-foreground">{image.caption}</p>
        )}
        <div className="flex justify-center w-full">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onRemove}
            className="w-full"
            data-testid={`button-remove-image-${index}`}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
}
