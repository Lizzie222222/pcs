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

      {/* Caption */}
      {image.caption && (
        <div className="p-3">
          <p className="text-sm line-clamp-2">{image.caption}</p>
        </div>
      )}
    </div>
  );
}
