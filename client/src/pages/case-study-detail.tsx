import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/ui/states";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Share2 } from "lucide-react";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { useEffect, useState } from "react";
import { SocialMetaTags } from "@/components/SocialMetaTags";
import { ShareDialog } from "@/components/ShareDialog";
import { useToast } from "@/hooks/use-toast";
import { 
  CaseStudyPreview,
  type CaseStudyData,
  getStageColor 
} from "@/components/case-study-preview";

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
      { threshold: 0.05, rootMargin: '0px 0px 150px 0px' }
    );

    const elements = document.querySelectorAll('.scroll-reveal, .scroll-reveal-left, .scroll-reveal-right, .scroll-reveal-scale');
    
    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const isInViewport = rect.top < window.innerHeight && rect.bottom > 0;
      if (isInViewport) {
        el.classList.add('revealed');
      }
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);
}

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

export default function CaseStudyDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const caseStudyId = params.id;
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  useScrollReveal();

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      document.documentElement.style.setProperty('--scroll', `${scrolled}`);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const { data: caseStudy, isLoading, error } = useQuery<CaseStudyData>({
    queryKey: ['/api/case-studies', caseStudyId],
    enabled: !!caseStudyId,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: true,
  });

  const handleShare = () => {
    setShareDialogOpen(true);
  };

  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);
      const response = await fetch(`/api/case-studies/${caseStudyId}/pdf`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to generate PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${caseStudy?.title || 'case_study'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({ title: 'PDF downloaded successfully' });
    } catch (error) {
      toast({ title: 'Failed to download PDF', variant: 'destructive' });
    } finally {
      setIsDownloading(false);
    }
  };

  const scrollToContent = () => {
    window.scrollTo({ top: window.innerHeight - 100, behavior: 'smooth' });
  };

  const extractTextFromHtml = (html: string | null | undefined, maxLength: number = 150) => {
    if (!html) return '';
    const text = html.replace(/<[^>]*>/g, '');
    return text.length > maxLength ? text.substring(0, maxLength) : text;
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

  const heroImage = caseStudy.images?.[0]?.url || caseStudy.imageUrl;

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

      <CaseStudyPreview 
        caseStudy={caseStudy}
        onScrollToContent={scrollToContent}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <Button
          variant="ghost"
          onClick={() => setLocation('/inspiration')}
          className="mb-8"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Success Stories
        </Button>

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
            onClick={handleDownloadPdf}
            variant="outline"
            disabled={isDownloading}
            data-testid="button-download-pdf"
          >
            <Download className="w-4 h-4 mr-2" />
            {isDownloading ? 'Generating PDF...' : 'Download PDF'}
          </Button>
          <Button
            onClick={() => setLocation('/register')}
            className="bg-pcs_blue hover:bg-pcs_blue/90"
            data-testid="button-get-inspired"
          >
            Get Inspired - Join Us
          </Button>
        </div>

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

      <RelatedCaseStudies caseStudyId={caseStudyId!} currentStage={caseStudy.stage} />

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
  const [, setLocation] = useLocation();
  
  const { data: relatedCaseStudies, isLoading, error } = useQuery<RelatedCaseStudy[]>({
    queryKey: ['/api/case-studies', caseStudyId, 'related'],
    queryFn: async () => {
      const response = await fetch(`/api/case-studies/${caseStudyId}/related?limit=4`);
      if (!response.ok) throw new Error('Failed to fetch related case studies');
      return response.json();
    },
    enabled: !!caseStudyId,
  });

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

  if (error || !relatedCaseStudies || relatedCaseStudies.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-50 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-navy mb-8">Related Success Stories</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {relatedCaseStudies.map((relatedCase) => {
            const displayImage = relatedCase.images?.[0]?.url || relatedCase.imageUrl;
            
            return (
              <Card 
                key={relatedCase.id}
                className="overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group"
                onClick={() => setLocation(`/case-study/${relatedCase.id}`)}
                data-testid={`card-related-${relatedCase.id}`}
              >
                <div className="relative h-48 overflow-hidden">
                  <OptimizedImage
                    src={displayImage}
                    alt={relatedCase.title}
                    width={400}
                    height={300}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="absolute top-3 right-3">
                    <Badge className={getStageColor(relatedCase.stage)}>
                      {relatedCase.stage.charAt(0).toUpperCase() + relatedCase.stage.slice(1)}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-navy mb-2 line-clamp-2">
                    {relatedCase.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {relatedCase.description?.replace(/<[^>]*>/g, '').substring(0, 100)}...
                  </p>
                  <div className="text-xs text-gray-500">
                    {relatedCase.schoolName}, {relatedCase.schoolCountry}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
