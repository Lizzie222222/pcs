import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";

interface CaseStudyEvidenceLinkSectionProps {
  evidenceLink: string;
  hasEvidenceFiles?: boolean;
}

export function CaseStudyEvidenceLinkSection({ 
  evidenceLink, 
  hasEvidenceFiles = false 
}: CaseStudyEvidenceLinkSectionProps) {
  if (!evidenceLink || hasEvidenceFiles) return null;

  return (
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
            href={evidenceLink}
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
  );
}
