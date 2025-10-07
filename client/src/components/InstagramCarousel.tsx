import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Heart, MessageCircle, Instagram, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OptimizedImage } from "@/components/ui/OptimizedImage";

// Custom hook to determine posts per view based on screen size
function useResponsivePostsPerView() {
  const [postsPerView, setPostsPerView] = useState(() => {
    if (typeof window === 'undefined') return 3;
    const width = window.innerWidth;
    if (width < 640) return 1;
    if (width < 1024) return 2;
    return 3;
  });

  useEffect(() => {
    const updatePostsPerView = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setPostsPerView(1);
      } else if (width < 1024) {
        setPostsPerView(2);
      } else {
        setPostsPerView(3);
      }
    };

    window.addEventListener('resize', updatePostsPerView);
    return () => window.removeEventListener('resize', updatePostsPerView);
  }, []);

  return postsPerView;
}

// Custom hook to detect if we're on mobile
function useIsMobileView() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 640;
  });

  useEffect(() => {
    const updateIsMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    window.addEventListener('resize', updateIsMobile);
    return () => window.removeEventListener('resize', updateIsMobile);
  }, []);

  return isMobile;
}

// Real posts based on Plastic Clever Schools program
const samplePosts = [
  {
    id: "1",
    image: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=400&h=400&fit=crop&crop=center",
    caption: "🎉 What an incredible International Day of Action! Nearly 22,000 children across 27 countries took part in plastic audits, litter picks, and campaigns. Your energy and dedication inspire us every day! 💚🌍 #PlasticCleverSchools #YouthAction",
    likes: 342,
    comments: 58,
    timestamp: "3d",
    username: "plastic_clever_schools"
  },
  {
    id: "2", 
    image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=400&h=400&fit=crop&crop=center",
    caption: "🇬🇷 Big news! Plastic Clever Schools has expanded to Greece with 165 schools now taking action against single-use plastics. Καλή αρχή to all our Greek schools! 🌊 #GlobalImpact #PlasticFree",
    likes: 276,
    comments: 41,
    timestamp: "5d",
    username: "plastic_clever_schools"
  },
  {
    id: "3",
    image: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=400&h=400&fit=crop&crop=center", 
    caption: "🏝️ Welcome to the Caribbean! We're thrilled to announce our debut in Barbados 🇧🇧 More island schools taking the pledge to become Plastic Clever. Together we're making waves across the oceans! 🌊✨",
    likes: 198,
    comments: 33,
    timestamp: "1w",
    username: "plastic_clever_schools"
  },
  {
    id: "4",
    image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=400&fit=crop&crop=center",
    caption: "💰 Action Fund NOW OPEN! Schools can apply for grants up to £500 to fund their plastic reduction projects. Deadline: March 17, 2025. Link in bio to apply! 🚀 #PlasticCleverActionFund",
    likes: 425,
    comments: 74,
    timestamp: "1w",
    username: "plastic_clever_schools"
  },
  {
    id: "5",
    image: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400&h=400&fit=crop&crop=center",
    caption: "🌟 MILESTONE ALERT! 1,265 schools across 38 countries are now part of our Plastic Clever family! From the UK to Greece, Barbados to beyond - you're all making a real difference. Thank you! 🙏💙 #TogetherForOurOceans",
    likes: 512,
    comments: 89,
    timestamp: "2w", 
    username: "plastic_clever_schools"
  },
  {
    id: "6",
    image: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&h=400&fit=crop&crop=center",
    caption: "📋 Students conducting their plastic audits - the investigate stage is where the magic happens! Counting, categorizing, and planning for change. These young changemakers are leading the way 🔍♻️ #InvestigateStage #StudentLed",
    likes: 234,
    comments: 45,
    timestamp: "2w",
    username: "plastic_clever_schools"
  }
];

interface InstagramCarouselProps {
  className?: string;
}

export default function InstagramCarousel({ className = "" }: InstagramCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  
  const postsPerView = useResponsivePostsPerView();
  const isMobile = useIsMobileView();

  // Calculate total pages (slides) - showing postsPerView posts per slide
  // Only create slides that have posts
  const totalSlides = Math.ceil(samplePosts.length / postsPerView);
  const maxIndex = totalSlides - 1;

  // Reset to first slide when postsPerView changes to avoid showing empty slides
  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(0);
    }
  }, [postsPerView, currentIndex, maxIndex]);

  // Auto-scroll functionality
  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        return prev >= maxIndex ? 0 : prev + 1;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, maxIndex]);

  const scrollToIndex = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 8000);
  };

  const nextSlide = () => {
    scrollToIndex(currentIndex >= maxIndex ? 0 : currentIndex + 1);
  };

  const prevSlide = () => {
    scrollToIndex(currentIndex <= 0 ? maxIndex : currentIndex - 1);
  };

  const handleMouseEnter = () => setIsAutoPlaying(false);
  const handleMouseLeave = () => setIsAutoPlaying(true);

  // Touch gesture handlers for mobile swiping
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;
    
    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
    
    setTouchStart(0);
    setTouchEnd(0);
  };

  return (
    <div 
      ref={carouselRef} 
      className={`w-full carousel-container ${className}`} 
      onMouseEnter={handleMouseEnter} 
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative">
        {/* Navigation Buttons - Hidden on mobile */}
        {!isMobile && (
          <>
            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20">
              <Button
                variant="ghost"
                size="sm"
                onClick={prevSlide}
                className="w-12 h-12 rounded-full bg-white/90 hover:bg-white shadow-lg backdrop-blur-sm border-0 transition-all duration-300 hover:scale-110"
                disabled={currentIndex === 0}
                data-testid="button-instagram-prev"
                aria-label="Previous Instagram posts"
              >
                <ChevronLeft className="w-5 h-5 text-navy" aria-hidden="true" />
              </Button>
            </div>
            
            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20">
              <Button
                variant="ghost"
                size="sm"
                onClick={nextSlide}
                className="w-12 h-12 rounded-full bg-white/90 hover:bg-white shadow-lg backdrop-blur-sm border-0 transition-all duration-300 hover:scale-110"
                disabled={currentIndex >= maxIndex}
                data-testid="button-instagram-next"
                aria-label="Next Instagram posts"
              >
                <ChevronRight className="w-5 h-5 text-navy" aria-hidden="true" />
              </Button>
            </div>
          </>
        )}

        {/* Posts Container */}
        <div 
          ref={scrollContainerRef}
          className="overflow-hidden"
          data-testid="instagram-carousel-container"
        >
          <div 
            className={`flex transition-transform duration-500 ease-out ${
              isMobile ? 'gap-4 px-2' : 'gap-6 px-4'
            }`}
            style={{ 
              transform: `translateX(-${currentIndex * 100}%)`,
            }}
          >
            {Array.from({ length: totalSlides }, (_, slideIndex) => {
              const slidePosts = samplePosts.slice(
                slideIndex * postsPerView, 
                (slideIndex + 1) * postsPerView
              );
              
              // Only render slides that have posts
              if (slidePosts.length === 0) return null;
              
              return (
                <div
                  key={slideIndex}
                  className={`flex ${isMobile ? 'gap-4' : 'gap-6'} flex-shrink-0`}
                  style={{ width: '100%' }}
                >
                  {slidePosts.map((post) => (
                    <div
                      key={post.id}
                      className="flex-shrink-0"
                      style={{ width: `${100 / postsPerView}%` }}
                    >
                      <InstagramPost post={post} />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Dots Indicator */}
        <div className="flex justify-center mt-6 gap-2">
          {Array.from({ length: totalSlides }, (_, i) => (
            <button
              key={i}
              onClick={() => scrollToIndex(i)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? "bg-navy scale-125"
                  : "bg-gray-300 hover:bg-gray-400"
              }`}
              data-testid={`button-instagram-dot-${i}`}
              aria-label={`Go to Instagram carousel slide ${i + 1} of ${totalSlides}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface InstagramPostProps {
  post: {
    id: string;
    image: string;
    caption: string;
    likes: number;
    comments: number;
    timestamp: string;
    username: string;
  };
}

function InstagramPost({ post }: InstagramPostProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);

  const truncatedCaption = post.caption.length > 100 
    ? post.caption.substring(0, 100) + "..." 
    : post.caption;

  const handleLike = () => {
    setIsLiked(!isLiked);
  };

  return (
    <Card className="instagram-post overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 bg-white border-0 group h-full">
      <div className="relative overflow-hidden">
        {/* Post Image */}
        <div className="aspect-square overflow-hidden bg-gray-100">
          <OptimizedImage
            src={post.image}
            alt={`Instagram post by ${post.username}: ${post.caption.substring(0, 100)}${post.caption.length > 100 ? '...' : ''}`}
            width={400}
            height={400}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            responsive={true}
            quality={80}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            data-testid={`img-instagram-post-${post.id}`}
          />
        </div>

        {/* Hover Overlay with Instagram-style stats */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="flex items-center gap-6 text-white">
            <div className="flex items-center gap-2">
              <Heart className="w-6 h-6" />
              <span className="font-semibold text-lg">{post.likes}</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-6 h-6" />
              <span className="font-semibold text-lg">{post.comments}</span>
            </div>
          </div>
        </div>
      </div>

      <CardContent className="p-4">
        {/* Post Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 rounded-full flex items-center justify-center">
              <Instagram className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-semibold text-sm text-navy">@{post.username}</div>
            </div>
          </div>
          <div className="text-xs text-gray-500">{post.timestamp}</div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4 mb-3">
          <button
            onClick={handleLike}
            className="transition-all duration-200 hover:scale-110"
            data-testid={`button-like-${post.id}`}
            aria-label={isLiked ? `Unlike ${post.username}'s post` : `Like ${post.username}'s post`}
          >
            <Heart
              className={`w-6 h-6 transition-colors duration-300 ${
                isLiked
                  ? "text-red-500 fill-red-500"
                  : "text-gray-600 hover:text-red-500"
              }`}
              aria-hidden="true"
            />
          </button>
          <button 
            className="transition-all duration-200 hover:scale-110"
            aria-label={`Comment on ${post.username}'s post`}
          >
            <MessageCircle className="w-6 h-6 text-gray-600 hover:text-ocean-blue transition-colors duration-300" />
          </button>
          <button 
            className="transition-all duration-200 hover:scale-110"
            aria-label={`View ${post.username}'s full post on Instagram`}
          >
            <ExternalLink className="w-5 h-5 text-gray-600 hover:text-teal transition-colors duration-300" />
          </button>
        </div>

        {/* Likes Count */}
        <div className="text-sm font-semibold text-navy mb-2">
          {isLiked ? post.likes + 1 : post.likes} likes
        </div>

        {/* Caption */}
        <div className="text-sm text-gray-800 leading-relaxed">
          <span className="font-semibold text-navy">@{post.username} </span>
          <span>
            {showFullCaption ? post.caption : truncatedCaption}
            {post.caption.length > 100 && (
              <button
                onClick={() => setShowFullCaption(!showFullCaption)}
                className="text-gray-500 hover:text-gray-700 ml-1 font-medium transition-colors duration-200"
                aria-label={showFullCaption ? "Show less of caption" : "Show more of caption"}
              >
                {showFullCaption ? " show less" : " more"}
              </button>
            )}
          </span>
        </div>

        {/* Comments Preview */}
        <div className="mt-2 text-sm text-gray-500">
          View all {post.comments} comments
        </div>
      </CardContent>
    </Card>
  );
}
