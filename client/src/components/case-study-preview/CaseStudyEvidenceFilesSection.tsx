import { Card, CardContent } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { EvidenceFilesGallery } from "@/components/EvidenceFilesGallery";
import type { EvidenceFile } from "./types";

interface CaseStudyEvidenceFilesSectionProps {
  evidenceFiles: EvidenceFile[];
}

export function CaseStudyEvidenceFilesSection({ evidenceFiles }: CaseStudyEvidenceFilesSectionProps) {
  if (!evidenceFiles || evidenceFiles.length === 0) return null;

  return (
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
          files={evidenceFiles} 
        />
      </CardContent>
    </Card>
  );
}
