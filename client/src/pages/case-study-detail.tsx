import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/ui/states";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  TrendingUp,
  BookOpen,
  Award,
  Share2,
  School,
  ChevronDown,
  Quote,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { EvidenceFilesGallery } from "@/components/EvidenceFilesGallery";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { SocialMetaTags } from "@/components/SocialMetaTags";
import { ShareDialog } from "@/components/ShareDialog";

interface EvidenceFile {
  name: string;
  url: string;
  size: number;
  type: string;
}

interface ImageItem {
  url: string;
  caption?: string;
}

interface VideoItem {
  url: string;
  title?: string;
  platform?: string;
}

interface StudentQuote {
  name: string;
  quote: string;
  photoUrl?: string;
  age?: number;
}

interface ImpactMetric {
  label: string;
  value: string;
  icon?: string;
  color?: string;
}

interface TimelineSection {
  title: string;
  description: string;
  date?: string;
  order: number;
}

interface CaseStudy {
  id: string;
  title: string;
  description: string;
  stage: 'inspire' | 'investigate' | 'act';
  impact: string;
  imageUrl: string;
  featured: boolean;
  evidenceLink: string | null;
  evidenceFiles: EvidenceFile[] | null;
  schoolId: string;
  schoolName: string;
  schoolCountry: string;
  location: string;
  createdAt: string;
  createdByName: string;
  images?: ImageItem[];
  videos?: VideoItem[];
  studentQuotes?: StudentQuote[];
  impactMetrics?: ImpactMetric[];
  timelineSections?: TimelineSection[];
  beforeImage?: string;
  afterImage?: string;
  categories?: string[];
  tags?: string[];
}

// Custom hook for scroll reveal animations
function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const elements = document.querySelectorAll('.scroll-reveal, .scroll-reveal-left, .scroll-reveal-right, .scroll-reveal-scale');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);
}

// Animated counter component
function AnimatedCounter({ value, duration = 2000 }: { value: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  
  // Parse value to extract prefix, number, and suffix
  // Supports formats like: "£5.5k", "95%", "$1000", "500"
  const parseValue = (val: string) => {
    const match = val.match(/^([^\d.-]*)?([\d.]+)(.*)$/);
    if (match) {
      const prefix = match[1] || '';
      const number = parseFloat(match[2]) || 0;
      const suffix = match[3] || '';
      return { prefix, number, suffix };
    }
    return { prefix: '', number: 0, suffix: val };
  };

  const { prefix, number: numericValue, suffix } = parseValue(value);
  const hasDecimals = value.includes('.');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);
            let start = 0;
            const increment = numericValue / (duration / 16);
            
            const timer = setInterval(() => {
              start += increment;
              if (start >= numericValue) {
                setCount(numericValue);
                clearInterval(timer);
              } else {
                setCount(start);
              }
            }, 16);

            return () => clearInterval(timer);
          }
        });
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [numericValue, duration, hasAnimated]);

  const displayValue = hasDecimals ? count.toFixed(1) : Math.floor(count);
  
  return <span ref={ref}>{prefix}{displayValue}{suffix}</span>;
}

// Reading progress indicator
function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollProgress = (scrollTop / docHeight) * 100;
      setProgress(scrollProgress);
    };

    window.addEventListener('scroll', updateProgress);
    return () => window.removeEventListener('scroll', updateProgress);
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full h-1 bg-gray-200 z-50">
      <div 
        className="h-full bg-gradient-to-r from-ocean-blue to-teal transition-all duration-150"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// Video embed component
function VideoEmbed({ video }: { video: VideoItem }) {
  const getEmbedUrl = (url: string, platform?: string) => {
    if (platform === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('youtu.be') 
        ? url.split('youtu.be/')[1]?.split('?')[0]
        : url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (platform === 'vimeo' || url.includes('vimeo.com')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return url;
  };

  const embedUrl = getEmbedUrl(video.url, video.platform);

  return (
    <div className="relative w-full pt-[56.25%]">
      <iframe
        src={embedUrl}
        className="absolute top-0 left-0 w-full h-full rounded-lg"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

export default function CaseStudyDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const caseStudyId = params.id;
  const [beforeAfterSlider, setBeforeAfterSlider] = useState(50);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  useScrollReveal();

  // Parallax scroll effect for hero section
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      document.documentElement.style.setProperty('--scroll', `${scrolled}`);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const { data: caseStudy, isLoading, error } = useQuery<CaseStudy>({
    queryKey: ['/api/case-studies', caseStudyId],
    enabled: !!caseStudyId,
  });

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'inspire': return 'bg-pcs_blue text-white';
      case 'investigate': return 'bg-yellow text-white';
      case 'act': return 'bg-coral text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const handleShare = () => {
    setShareDialogOpen(true);
  };

  const scrollToContent = () => {
    window.scrollTo({ top: window.innerHeight - 100, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  if (error || !caseStudy) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-navy mb-4">Case Study Not Found</h1>
            <p className="text-gray-600 mb-8">
              The case study you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => setLocation('/inspiration')} data-testid="button-back-inspiration">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Inspiration
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const heroVideo = caseStudy.videos?.[0];
  const heroImage = caseStudy.images?.[0]?.url || caseStudy.imageUrl;

  const extractTextFromHtml = (html: string, maxLength: number = 150) => {
    const text = html.replace(/<[^>]*>/g, '');
    return text.length > maxLength ? text.substring(0, maxLength) : text;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SocialMetaTags
        title={caseStudy.title}
        description={extractTextFromHtml(caseStudy.description)}
        image={heroImage}
        url={typeof window !== 'undefined' ? window.location.href : ''}
        type="article"
        siteName="Plastic Clever Schools"
      />
      <ReadingProgress />

      {/* Full-Screen Hero Section with Parallax */}
      <div className="relative h-screen overflow-hidden">
        {/* Hero Media */}
        {heroVideo ? (
          <div className="absolute inset-0 w-full h-full">
            <VideoEmbed video={heroVideo} />
          </div>
        ) : (
          <div 
            className="absolute inset-0 w-full h-full bg-cover bg-center"
            style={{ 
              backgroundImage: `url(${heroImage})`,
              transform: 'translateY(calc(var(--scroll) * 0.5px))',
            }}
          />
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        {/* Hero Content */}
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 w-full">
            <div className="scroll-reveal">
              {/* Breadcrumb */}
              <nav className="mb-6 flex items-center gap-2 text-white/80 text-sm">
                <button 
                  onClick={() => setLocation('/inspiration')}
                  className="hover:text-white transition-colors"
                  data-testid="breadcrumb-home"
                >
                  Success Stories
                </button>
                <ChevronRight className="w-4 h-4" />
                <span className="text-white" data-testid="breadcrumb-current">{caseStudy.title}</span>
              </nav>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <Badge className={getStageColor(caseStudy.stage)} data-testid="badge-stage">
                  {caseStudy.stage.charAt(0).toUpperCase() + caseStudy.stage.slice(1)}
                </Badge>
                {caseStudy.featured && (
                  <Badge variant="outline" className="border-yellow text-yellow bg-yellow/10" data-testid="badge-featured">
                    <Award className="w-3 h-3 mr-1" />
                    Featured
                  </Badge>
                )}
                {caseStudy.categories?.map((cat) => (
                  <Badge key={cat} variant="outline" className="bg-white/10 text-white border-white/30">
                    {cat}
                  </Badge>
                ))}
              </div>

              {/* Title */}
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 max-w-4xl" data-testid="text-case-study-title">
                {caseStudy.title}
              </h1>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-6 text-white/90 mb-8">
                <div className="flex items-center gap-2">
                  <School className="w-5 h-5" />
                  <span data-testid="text-school-name">{caseStudy.schoolName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  <span data-testid="text-location">{caseStudy.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span data-testid="text-date">
                    {new Date(caseStudy.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              {/* Tags */}
              {caseStudy.tags && caseStudy.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-8">
                  {caseStudy.tags.map((tag) => (
                    <span key={tag} className="text-sm px-3 py-1 bg-white/20 text-white rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <button 
          onClick={scrollToContent}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white animate-bounce"
          data-testid="button-scroll-indicator"
        >
          <ChevronDown className="w-8 h-8" />
        </button>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setLocation('/inspiration')}
          className="mb-8"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Success Stories
        </Button>

        {/* Before/After Comparison */}
        {caseStudy.beforeImage && caseStudy.afterImage && (
          <div className="mb-16 scroll-reveal-scale">
            <h2 className="text-3xl font-bold text-navy mb-8">The Transformation</h2>
            <div className="relative h-96 rounded-xl overflow-hidden group">
              {/* Before Image */}
              <div className="absolute inset-0">
                <OptimizedImage
                  src={caseStudy.beforeImage}
                  alt="Before"
                  width={800}
                  height={400}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 bg-black/60 text-white px-4 py-2 rounded-lg font-semibold">
                  Before
                </div>
              </div>
              
              {/* After Image with Slider */}
              <div 
                className="absolute inset-0 transition-all duration-300"
                style={{ clipPath: `inset(0 ${100 - beforeAfterSlider}% 0 0)` }}
              >
                <OptimizedImage
                  src={caseStudy.afterImage}
                  alt="After"
                  width={800}
                  height={400}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 right-4 bg-ocean-blue text-white px-4 py-2 rounded-lg font-semibold">
                  After
                </div>
              </div>

              {/* Slider */}
              <input
                type="range"
                min="0"
                max="100"
                value={beforeAfterSlider}
                onChange={(e) => setBeforeAfterSlider(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-10"
              />
              
              {/* Slider Line */}
              <div 
                className="absolute top-0 bottom-0 w-1 bg-white shadow-lg pointer-events-none"
                style={{ left: `${beforeAfterSlider}%` }}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
                  <ChevronLeft className="w-4 h-4 -ml-1" />
                  <ChevronRight className="w-4 h-4 -mr-1" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rich Content Description */}
        <div className="mb-16 scroll-reveal">
          <div 
            className="prose prose-lg max-w-none prose-headings:text-navy prose-p:text-gray-700 prose-a:text-ocean-blue"
            dangerouslySetInnerHTML={{ __html: caseStudy.description }}
            data-testid="text-description"
          />
        </div>

        {/* Impact Metrics */}
        {caseStudy.impactMetrics && caseStudy.impactMetrics.length > 0 && (
          <div className="mb-16 scroll-reveal">
            <h2 className="text-3xl font-bold text-navy mb-8 flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-ocean-blue" />
              Impact Achieved
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {caseStudy.impactMetrics.map((metric, idx) => (
                <Card 
                  key={idx}
                  className="overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  style={{ backgroundColor: metric.color || 'white' }}
                >
                  <CardContent className="p-6 text-center">
                    <div className={`text-5xl font-bold mb-2 ${metric.color ? 'text-white' : 'text-ocean-blue'}`}>
                      <AnimatedCounter value={metric.value} />
                    </div>
                    <div className={`text-lg font-semibold ${metric.color ? 'text-white/90' : 'text-navy'}`}>
                      {metric.label}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Impact Section (legacy) */}
        {caseStudy.impact && (!caseStudy.impactMetrics || caseStudy.impactMetrics.length === 0) && (
          <Card className="mb-16 bg-gradient-to-br from-ocean-blue/5 to-teal/5 border-ocean-blue/20 scroll-reveal">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="w-6 h-6 text-ocean-blue" />
                <h2 className="text-2xl font-semibold text-navy">Impact Achieved</h2>
              </div>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap" data-testid="text-impact">
                {caseStudy.impact}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        {caseStudy.timelineSections && caseStudy.timelineSections.length > 0 && (
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-navy mb-12 scroll-reveal">Our Journey</h2>
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-ocean-blue to-teal" />
              
              {caseStudy.timelineSections
                .sort((a, b) => a.order - b.order)
                .map((section, idx) => (
                  <div 
                    key={idx}
                    className={`relative mb-12 ${
                      idx % 2 === 0 ? 'md:pr-1/2 scroll-reveal-left' : 'md:pl-1/2 scroll-reveal-right'
                    }`}
                  >
                    <div className={`md:w-1/2 ${idx % 2 === 0 ? 'md:ml-auto md:pl-12' : 'md:mr-auto md:pr-12'}`}>
                      <Card className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                          {section.date && (
                            <div className="flex items-center gap-2 text-ocean-blue text-sm font-semibold mb-3">
                              <Clock className="w-4 h-4" />
                              {section.date}
                            </div>
                          )}
                          <h3 className="text-xl font-bold text-navy mb-3">{section.title}</h3>
                          <p className="text-gray-700 leading-relaxed">{section.description}</p>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {/* Timeline Dot */}
                    <div className="absolute left-8 md:left-1/2 top-6 w-4 h-4 bg-ocean-blue rounded-full -translate-x-1/2 border-4 border-white shadow-lg" />
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Student Testimonials */}
        {caseStudy.studentQuotes && caseStudy.studentQuotes.length > 0 && (
          <div className="mb-16 scroll-reveal">
            <h2 className="text-3xl font-bold text-navy mb-8 flex items-center gap-3">
              <Quote className="w-8 h-8 text-teal" />
              Student Voices
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {caseStudy.studentQuotes.map((quote, idx) => (
                <Card 
                  key={idx}
                  className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-teal/5"
                >
                  <CardContent className="p-6">
                    <Quote className="w-8 h-8 text-teal/40 mb-4" />
                    <p className="text-gray-700 italic mb-6 leading-relaxed">"{quote.quote}"</p>
                    <div className="flex items-center gap-4">
                      {quote.photoUrl ? (
                        <OptimizedImage
                          src={quote.photoUrl}
                          alt={quote.name}
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-teal/20 flex items-center justify-center text-teal font-bold">
                          {quote.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-navy">{quote.name}</div>
                        {quote.age && (
                          <div className="text-sm text-gray-600">Age {quote.age}</div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Image Gallery/Carousel */}
        {caseStudy.images && caseStudy.images.length > 1 && (
          <div className="mb-16 scroll-reveal-scale">
            <h2 className="text-3xl font-bold text-navy mb-8">Photo Gallery</h2>
            <Carousel className="w-full">
              <CarouselContent>
                {caseStudy.images.map((image, idx) => (
                  <CarouselItem key={idx}>
                    <Dialog>
                      <DialogTrigger asChild>
                        <button 
                          className="cursor-pointer group w-full text-left"
                          data-testid={`button-gallery-image-${idx}`}
                          aria-label={image.caption || `View ${caseStudy.title} gallery image ${idx + 1}`}
                        >
                          <div className="relative h-96 rounded-lg overflow-hidden">
                            <OptimizedImage
                              src={image.url}
                              alt={image.caption || caseStudy.title || 'Case study image'}
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
                          alt={image.caption || caseStudy.title || 'Case study image'}
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
        )}

        {/* Additional Videos */}
        {caseStudy.videos && caseStudy.videos.length > 1 && (
          <div className="mb-16 scroll-reveal">
            <h2 className="text-3xl font-bold text-navy mb-8">Video Stories</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {caseStudy.videos.slice(1).map((video, idx) => (
                <div key={idx}>
                  {video.title && (
                    <h3 className="text-lg font-semibold text-navy mb-3">{video.title}</h3>
                  )}
                  <VideoEmbed video={video} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Original Evidence Files */}
        {caseStudy.evidenceFiles && caseStudy.evidenceFiles.length > 0 && (
          <Card className="mb-8 scroll-reveal">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <BookOpen className="w-5 h-5 text-ocean-blue" />
                <div>
                  <h3 className="font-semibold text-navy">Original Evidence</h3>
                  <p className="text-sm text-gray-600">
                    View the original submission files that inspired this case study
                  </p>
                </div>
              </div>
              <EvidenceFilesGallery 
                files={caseStudy.evidenceFiles} 
              />
            </CardContent>
          </Card>
        )}

        {/* Legacy Evidence Link */}
        {caseStudy.evidenceLink && (!caseStudy.evidenceFiles || caseStudy.evidenceFiles.length === 0) && (
          <Card className="mb-8 scroll-reveal">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-ocean-blue" />
                  <div>
                    <h3 className="font-semibold text-navy">View Original Evidence</h3>
                    <p className="text-sm text-gray-600">
                      See the original submission that inspired this case study
                    </p>
                  </div>
                </div>
                <a
                  href={caseStudy.evidenceLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="link-original-evidence"
                >
                  <Button variant="outline">
                    View Evidence
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-4 mb-12 scroll-reveal">
          <Button
            onClick={handleShare}
            variant="outline"
            data-testid="button-share"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share This Story
          </Button>
          <Button
            onClick={() => setLocation('/register')}
            className="bg-pcs_blue hover:bg-pcs_blue/90"
            data-testid="button-get-inspired"
          >
            Get Inspired - Join Us
          </Button>
        </div>

        {/* CTA Card */}
        <Card className="bg-gradient-to-r from-ocean-blue to-teal text-white scroll-reveal-scale">
          <CardContent className="p-8">
            <h3 className="text-2xl font-semibold mb-3">Want to Create Your Own Success Story?</h3>
            <p className="mb-6 opacity-90 text-lg">
              Join hundreds of schools worldwide making a real difference in the fight against plastic pollution.
              Register your school today and start your journey towards becoming a Plastic Clever School.
            </p>
            <Button
              onClick={() => setLocation('/register')}
              className="bg-white text-ocean-blue hover:bg-gray-100"
              data-testid="button-register-cta"
            >
              Register Your School
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Related Success Stories */}
      <RelatedCaseStudies caseStudyId={caseStudyId!} currentStage={caseStudy.stage} />

      {/* Share Dialog */}
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        url={typeof window !== 'undefined' ? window.location.href : ''}
        title={caseStudy.title}
        description={extractTextFromHtml(caseStudy.description)}
      />
    </div>
  );
}

// Related Case Studies Component
interface RelatedCaseStudiesProps {
  caseStudyId: string;
  currentStage: string;
}

interface RelatedCaseStudy {
  id: string;
  title: string;
  description: string;
  stage: 'inspire' | 'investigate' | 'act';
  imageUrl: string;
  images?: { url: string; caption?: string }[];
  schoolName: string;
  schoolCountry: string;
}

function RelatedCaseStudies({ caseStudyId, currentStage }: RelatedCaseStudiesProps) {
  const { data: relatedCaseStudies, isLoading, error } = useQuery<RelatedCaseStudy[]>({
    queryKey: ['/api/case-studies', caseStudyId, 'related'],
    queryFn: async () => {
      const response = await fetch(`/api/case-studies/${caseStudyId}/related?limit=4`);
      if (!response.ok) throw new Error('Failed to fetch related case studies');
      return response.json();
    },
    enabled: !!caseStudyId,
  });

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'inspire': return 'bg-pcs_blue text-white';
      case 'investigate': return 'bg-yellow text-white';
      case 'act': return 'bg-coral text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-navy mb-8">Related Success Stories</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 h-48 rounded-t-lg" />
                <div className="bg-white p-4 rounded-b-lg space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('Failed to load related case studies:', error);
    return null;
  }

  if (!relatedCaseStudies || relatedCaseStudies.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-50 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-navy mb-2" data-testid="heading-related-stories">
          Related Success Stories
        </h2>
        <p className="text-gray-600 mb-8">
          Discover more inspiring stories from schools making a difference
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {relatedCaseStudies.map((story) => {
            const thumbnailImage = story.images && story.images.length > 0 
              ? story.images[0].url 
              : story.imageUrl;

            return (
              <Link 
                key={story.id} 
                href={`/inspiration/${story.id}`}
                data-testid={`related-case-study-${story.id}`}
              >
                <Card className="h-full overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden bg-gray-200">
                    {thumbnailImage ? (
                      <OptimizedImage
                        src={thumbnailImage}
                        alt={story.title}
                        width={400}
                        height={300}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-ocean-blue/10 to-teal/10">
                        <School className="w-16 h-16 text-ocean-blue/30" />
                      </div>
                    )}
                    
                    {/* Stage Badge */}
                    <div className="absolute top-3 right-3">
                      <Badge 
                        className={`${getStageColor(story.stage)} capitalize shadow-lg`}
                        data-testid={`badge-stage-${story.id}`}
                      >
                        {story.stage}
                      </Badge>
                    </div>
                  </div>

                  {/* Content */}
                  <CardContent className="p-4">
                    <h3 
                      className="font-bold text-navy mb-2 line-clamp-2 group-hover:text-ocean-blue transition-colors"
                      data-testid={`text-title-${story.id}`}
                    >
                      {story.title}
                    </h3>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <School className="w-4 h-4" />
                      <span className="truncate" data-testid={`text-school-${story.id}`}>
                        {story.schoolName}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span data-testid={`text-country-${story.id}`}>
                        {story.schoolCountry}
                      </span>
                    </div>

                    {story.description && (
                      <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                        {story.description.replace(/<[^>]*>/g, '')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
