import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/ui/states";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Share2, MapPin, School } from "lucide-react";
import { useState } from "react";
import { ShareDialog } from "@/components/ShareDialog";
import { EvidenceFilesGallery } from "@/components/EvidenceFilesGallery";
import { EvidenceVideoLinks } from "@/components/EvidenceVideoLinks";

interface EvidenceData {
  id: string;
  title: string;
  description: string | null;
  stage: 'inspire' | 'investigate' | 'act';
  status: string;
  files: { url: string; caption?: string; name?: string; type?: string; size?: number }[];
  videoLinks: string | null;
  schoolName: string;
  schoolCountry: string;
  schoolLanguage: string | null;
  submittedAt: string;
}

const getStageColor = (stage: string) => {
  switch (stage) {
    case 'inspire': return 'bg-pcs_blue text-white';
    case 'investigate': return 'bg-teal text-white';
    case 'act': return 'bg-coral text-white';
    default: return 'bg-gray-500 text-white';
  }
};

export default function EvidenceDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const evidenceId = params.id;
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  const { data: evidence, isLoading, error } = useQuery<EvidenceData>({
    queryKey: ['/api/evidence', evidenceId],
    enabled: !!evidenceId,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: true,
  });

  const handleShare = () => {
    setShareDialogOpen(true);
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

  if (error || !evidence) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-navy mb-4">Evidence Not Found</h1>
            <p className="text-gray-600 mb-8">
              The evidence you're looking for doesn't exist or has been removed.
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
        <Button
          variant="ghost"
          onClick={() => setLocation('/inspiration')}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Inspiration
        </Button>

        <Card className="overflow-hidden">
          <CardContent className="p-6 md:p-8">
            {/* Header Section */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <Badge className={getStageColor(evidence.stage)}>
                  {evidence.stage}
                </Badge>
                {evidence.status === 'approved' && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Approved
                  </Badge>
                )}
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold text-navy mb-4" data-testid="text-evidence-title">
                {evidence.title}
              </h1>

              {/* School Info */}
              <div className="flex flex-wrap gap-4 text-gray-600 mb-6">
                <div className="flex items-center gap-2">
                  <School className="w-4 h-4" />
                  <span data-testid="text-school-name">{evidence.schoolName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span data-testid="text-school-country">{evidence.schoolCountry}</span>
                </div>
                {evidence.schoolLanguage && (
                  <div className="text-sm text-gray-500">
                    Language: {evidence.schoolLanguage}
                  </div>
                )}
              </div>

              {/* Date */}
              <p className="text-sm text-gray-500">
                Submitted: {new Date(evidence.submittedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>

            {/* Description */}
            {evidence.description && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-navy mb-3">Description</h2>
                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap" data-testid="text-description">
                    {evidence.description}
                  </p>
                </div>
              </div>
            )}

            {/* Images Gallery */}
            {evidence.files && evidence.files.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-navy mb-4">Evidence Files</h2>
                <EvidenceFilesGallery 
                  files={evidence.files.map(file => ({
                    name: file.name || 'Evidence file',
                    url: file.url,
                    size: file.size || 0,
                    type: file.type || 'image/*'
                  }))} 
                />
              </div>
            )}

            {/* Video Links */}
            {evidence.videoLinks && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-navy mb-4">Video Links</h2>
                <EvidenceVideoLinks videoLinks={evidence.videoLinks} />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 pt-6 border-t">
              <Button
                onClick={handleShare}
                variant="outline"
                data-testid="button-share"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button
                onClick={() => setLocation('/register')}
                className="bg-pcs_blue hover:bg-pcs_blue/90"
                data-testid="button-get-inspired"
              >
                Get Inspired - Join Us
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Share Dialog */}
        <ShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          title={evidence.title}
          description={evidence.description || ''}
          url={typeof window !== 'undefined' ? window.location.href : ''}
        />
      </div>
    </div>
  );
}
