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
          onError={(e) => {
            const img = e.currentTarget;
            img.style.display = 'none';
            const parent = img.parentElement;
            if (parent && !parent.querySelector('.image-error-placeholder')) {
              const placeholder = document.createElement('div');
              placeholder.className = 'image-error-placeholder flex flex-col items-center justify-center text-muted-foreground p-4';
              placeholder.innerHTML = `
                <svg class="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p class="text-xs text-center">Image loading...</p>
              `;
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
