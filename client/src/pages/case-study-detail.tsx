import { useParams, useLocation } from "wouter";
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
} from "lucide-react";
import { OptimizedImage } from "@/components/ui/OptimizedImage";

interface CaseStudy {
  id: string;
  title: string;
  description: string;
  stage: 'inspire' | 'investigate' | 'act';
  impact: string;
  imageUrl: string;
  featured: boolean;
  evidenceLink: string | null;
  schoolId: string;
  schoolName: string;
  schoolCountry: string;
  location: string;
  createdAt: string;
  createdByName: string;
}

export default function CaseStudyDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const caseStudyId = params.id;

  const { data: caseStudy, isLoading, error } = useQuery<CaseStudy>({
    queryKey: ['/api/case-studies', caseStudyId],
    enabled: !!caseStudyId,
  });

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'inspire': return 'bg-pcs_blue text-white';
      case 'investigate': return 'bg-teal text-white';
      case 'act': return 'bg-coral text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: caseStudy?.title,
          text: caseStudy?.description,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
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

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setLocation('/inspiration')}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Success Stories
        </Button>

        {/* Hero Image */}
        {caseStudy.imageUrl && (
          <div className="w-full h-64 md:h-96 rounded-lg overflow-hidden mb-8">
            <OptimizedImage
              src={caseStudy.imageUrl}
              alt={caseStudy.title}
              width={800}
              height={400}
              className="w-full h-full object-cover"
              quality={90}
              sizes="(max-width: 768px) 100vw, 800px"
            />
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Badge className={getStageColor(caseStudy.stage)} data-testid="badge-stage">
              {caseStudy.stage.charAt(0).toUpperCase() + caseStudy.stage.slice(1)}
            </Badge>
            {caseStudy.featured && (
              <Badge variant="outline" className="border-yellow text-yellow" data-testid="badge-featured">
                <Award className="w-3 h-3 mr-1" />
                Featured
              </Badge>
            )}
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-navy mb-4" data-testid="text-case-study-title">
            {caseStudy.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-gray-600">
            <div className="flex items-center gap-2">
              <School className="w-4 h-4" />
              <span data-testid="text-school-name">{caseStudy.schoolName}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span data-testid="text-location">{caseStudy.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span data-testid="text-date">
                {new Date(caseStudy.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-navy mb-4">About This Initiative</h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap" data-testid="text-description">
              {caseStudy.description}
            </p>
          </CardContent>
        </Card>

        {/* Impact Section */}
        {caseStudy.impact && (
          <Card className="mb-8 bg-gradient-to-br from-ocean-blue/5 to-teal/5 border-ocean-blue/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-ocean-blue" />
                <h2 className="text-xl font-semibold text-navy">Impact Achieved</h2>
              </div>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap" data-testid="text-impact">
                {caseStudy.impact}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Original Evidence Link */}
        {caseStudy.evidenceLink && (
          <Card className="mb-8">
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
        <div className="flex flex-wrap gap-4 mb-8">
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

        {/* Related Info */}
        <Card className="bg-gradient-to-r from-ocean-blue to-teal text-white">
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-3">Want to Create Your Own Success Story?</h3>
            <p className="mb-4 opacity-90">
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
    </div>
  );
}
