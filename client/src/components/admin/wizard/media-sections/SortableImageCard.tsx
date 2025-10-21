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
        className="absolute top-2 left-2 cursor-grab active:cursor-grabbing z-10 bg-background/80 rounded p-1 border-0 focus:outline-none focus:ring-2 focus:ring-primary"
        data-testid={`drag-handle-${index}`}
        aria-label="Drag to reorder image"
        aria-describedby="drag-instructions"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Source Badge */}
      <div className="absolute top-2 right-2 z-10">
        <Badge variant={image.source === 'evidence' ? 'default' : 'secondary'}>
          {image.source === 'evidence' ? 'Evidence' : 'Custom'}
        </Badge>
      </div>

      {/* Image */}
      <img
        src={image.url}
        alt={image.altText || 'Case study image'}
        className="w-full h-48 object-cover"
      />

      {/* Info & Actions */}
      <div className="p-3 space-y-2">
        {image.caption && (
          <p className="text-sm line-clamp-2">{image.caption}</p>
        )}
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onRemove}
          data-testid={`button-remove-image-${index}`}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Remove
        </Button>
      </div>
    </div>
  );
}
