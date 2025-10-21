import { VideoEmbed } from "./utils";
import type { VideoItem } from "./types";

interface CaseStudyVideosSectionProps {
  videos: VideoItem[];
}

export function CaseStudyVideosSection({ videos }: CaseStudyVideosSectionProps) {
  if (!videos || videos.length <= 1) return null;

  const additionalVideos = videos.slice(1);

  return (
    <div className="mb-16 scroll-reveal">
      <h2 className="text-3xl font-bold text-navy mb-8">Video Stories</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {additionalVideos.map((video, idx) => (
          <div key={idx}>
            {video.title && (
              <h3 className="text-lg font-semibold text-navy mb-3">{video.title}</h3>
            )}
            <VideoEmbed video={video} />
          </div>
        ))}
      </div>
    </div>
  );
}
