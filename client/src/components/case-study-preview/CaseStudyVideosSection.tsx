import { VideoEmbed } from "./utils";
import type { VideoItem } from "./types";
import { Star } from "lucide-react";

interface CaseStudyVideosSectionProps {
  videos: VideoItem[];
}

interface VideoItemWithFeatured extends VideoItem {
  featured?: boolean;
}

export function CaseStudyVideosSection({ videos }: CaseStudyVideosSectionProps) {
  if (!videos || videos.length === 0) return null;

  const videosWithFeatured = videos as VideoItemWithFeatured[];
  const featuredVideo = videosWithFeatured.find(v => v.featured);
  const otherVideos = videosWithFeatured.filter(v => !v.featured);

  // If we have a featured video, show it first and larger
  if (featuredVideo) {
    return (
      <div className="mb-16 scroll-reveal">
        <h2 className="text-3xl font-bold text-navy mb-8">Video Stories</h2>
        
        {/* Featured Video - Large */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            {featuredVideo.title && (
              <h3 className="text-xl font-semibold text-navy">{featuredVideo.title}</h3>
            )}
            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
          </div>
          <div className="w-full">
            <VideoEmbed video={featuredVideo} />
          </div>
        </div>

        {/* Other Videos - Horizontal Scroll */}
        {otherVideos.length > 0 && (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4" style={{ minWidth: 'min-content' }}>
              {otherVideos.map((video, idx) => (
                <div key={idx} className="flex-none w-80">
                  {video.title && (
                    <h4 className="text-sm font-semibold text-navy mb-2">{video.title}</h4>
                  )}
                  <VideoEmbed video={video} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // No featured video - show all in horizontal scroll
  return (
    <div className="mb-16 scroll-reveal">
      <h2 className="text-3xl font-bold text-navy mb-8">Video Stories</h2>
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-6" style={{ minWidth: 'min-content' }}>
          {videos.map((video, idx) => (
            <div key={idx} className="flex-none w-96">
              {video.title && (
                <h3 className="text-lg font-semibold text-navy mb-3">{video.title}</h3>
              )}
              <VideoEmbed video={video} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
