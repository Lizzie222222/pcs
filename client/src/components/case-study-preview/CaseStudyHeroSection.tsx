import { Badge } from "@/components/ui/badge";
import { Award, School, MapPin, Calendar, ChevronDown } from "lucide-react";
import type { VideoItem } from "./types";
import { VideoEmbed, getStageColor } from "./utils";
import { useMediaAssetInfo } from "@/lib/media";
import { PDFThumbnail } from "@/components/PDFThumbnail";
import { OptimizedImage } from "@/components/ui/OptimizedImage";

interface CaseStudyHeroSectionProps {
  heroVideo?: VideoItem;
  heroImage?: string;
  title: string;
  stage: 'inspire' | 'investigate' | 'act';
  featured?: boolean;
  categories?: string[];
  tags?: string[];
  schoolName: string;
  location: string;
  createdAt: string;
  onScrollToContent?: () => void;
  showScrollIndicator?: boolean;
}

export function CaseStudyHeroSection({
  heroVideo,
  heroImage,
  title,
  stage,
  featured,
  categories,
  tags,
  schoolName,
  location,
  createdAt,
  onScrollToContent,
  showScrollIndicator = true,
}: CaseStudyHeroSectionProps) {
  const [isPdf, isLoadingMedia] = useMediaAssetInfo(heroImage);

  return (
    <div className="relative h-[500px] max-h-[500px] overflow-hidden">
      {/* Hero Media - Image or PDF thumbnail with parallax effect */}
      {isLoadingMedia ? (
        <div className="absolute inset-0 w-full h-full bg-gray-200 animate-pulse" />
      ) : (
        <div 
          className="absolute inset-0 w-full h-full"
          style={{ 
            transform: 'translateY(calc(var(--scroll) * 0.5px))',
          }}
        >
          {isPdf ? (
            <PDFThumbnail 
              url={heroImage || ''} 
              className="w-full h-full object-cover"
            />
          ) : (
            <OptimizedImage
              src={heroImage || ''}
              alt={title}
              className="w-full h-full object-cover"
            />
          )}
        </div>
      )}
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

      <div className="absolute inset-0 flex items-end">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 w-full">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <Badge className={getStageColor(stage)} data-testid="badge-stage">
                {stage.charAt(0).toUpperCase() + stage.slice(1)}
              </Badge>
              {featured && (
                <Badge variant="outline" className="border-yellow text-yellow bg-yellow/10" data-testid="badge-featured">
                  <Award className="w-3 h-3 mr-1" />
                  Featured
                </Badge>
              )}
              {categories?.map((cat) => (
                <Badge key={cat} variant="outline" className="bg-white/10 text-white border-white/30">
                  {cat}
                </Badge>
              ))}
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 max-w-4xl" data-testid="text-case-study-title">
              {title}
            </h1>

            <div className="flex flex-wrap items-center gap-6 text-white/90 mb-8">
              <div className="flex items-center gap-2">
                <School className="w-5 h-5" />
                <span data-testid="text-school-name">{schoolName}</span>
              </div>
              {location && location.trim() !== '' && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  <span data-testid="text-location">{location}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                <span data-testid="text-date">
                  {new Date(createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>

            {tags && tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {tags.map((tag) => (
                  <span key={tag} className="text-sm px-3 py-1 bg-white/20 text-white rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showScrollIndicator && onScrollToContent && (
        <button 
          onClick={onScrollToContent}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white animate-bounce"
          data-testid="button-scroll-indicator"
        >
          <ChevronDown className="w-8 h-8" />
        </button>
      )}
    </div>
  );
}
