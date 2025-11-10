import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import type { ImageItem } from "./types";
import { isPdfMedia } from "@/lib/media";

interface CaseStudyImageGallerySectionProps {
  images: ImageItem[];
  title: string;
}

export function CaseStudyImageGallerySection({ images, title }: CaseStudyImageGallerySectionProps) {
  // Filter out PDFs from the gallery (PDFs can't be displayed in carousel properly)
  // Only include images with type field not set to PDF, or images without type field
  const imageOnlyItems = images.filter(img => !isPdfMedia(img));
  
  if (!imageOnlyItems || imageOnlyItems.length <= 1) return null;

  return (
    <div className="mb-16 scroll-reveal-scale">
      <h2 className="text-3xl font-bold text-navy mb-8">Photo Gallery</h2>
      <Carousel className="w-full">
        <CarouselContent>
          {imageOnlyItems.map((image, idx) => (
            <CarouselItem key={idx}>
              <Dialog>
                <DialogTrigger asChild>
                  <button 
                    className="cursor-pointer group w-full text-left"
                    data-testid={`button-gallery-image-${idx}`}
                    aria-label={image.caption || `View ${title} gallery image ${idx + 1}`}
                  >
                    <div className="relative h-96 rounded-lg overflow-hidden">
                      <OptimizedImage
                        src={image.url}
                        alt={image.caption || title || 'Case study image'}
                        width={800}
                        height={400}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      {image.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
                          <p className="text-white font-medium">{image.caption}</p>
                        </div>
                      )}
                    </div>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-6xl p-0">
                  <OptimizedImage
                    src={image.url}
                    alt={image.caption || title || 'Case study image'}
                    width={1200}
                    height={800}
                    className="w-full h-auto"
                  />
                </DialogContent>
              </Dialog>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-4" />
        <CarouselNext className="right-4" />
      </Carousel>
    </div>
  );
}
