import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoUrl: string;
  title: string;
}

export function VideoLightbox({ open, onOpenChange, videoUrl, title }: VideoLightboxProps) {
  const getYouTubeEmbedUrl = (url: string) => {
    const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([\w-]{11})/);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : null;
  };

  const embedUrl = getYouTubeEmbedUrl(videoUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] p-0 overflow-hidden bg-black border-0" data-testid="dialog-video-lightbox">
        <div className="relative">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <Button
            onClick={() => onOpenChange(false)}
            className="absolute top-2 right-2 z-50 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 h-auto"
            data-testid="button-close-lightbox"
          >
            <X className="w-5 h-5" />
          </Button>
          {embedUrl ? (
            <div className="w-full aspect-video">
              <iframe
                src={embedUrl}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
                data-testid="iframe-lightbox-video"
              />
            </div>
          ) : (
            <div className="w-full aspect-video bg-gray-900 flex items-center justify-center">
              <p className="text-white">Invalid YouTube URL</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
