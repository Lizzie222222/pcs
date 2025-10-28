import { TrendingUp } from "lucide-react";

interface CaseStudyLegacyImpactSectionProps {
  impact: string;
  showIfMetricsExist?: boolean;
}

export function CaseStudyLegacyImpactSection({ 
  impact, 
  showIfMetricsExist = false 
}: CaseStudyLegacyImpactSectionProps) {
  if (!impact) return null;

  return (
    <div className="mb-16 scroll-reveal">
      <div className="flex items-center gap-3 mb-4">
        <TrendingUp className="w-6 h-6 text-ocean-blue" />
        <h2 className="text-2xl font-semibold text-navy">Impact Achieved</h2>
      </div>
      <div 
        className="prose prose-lg max-w-none prose-headings:text-navy prose-p:text-gray-700 prose-a:text-ocean-blue"
        dangerouslySetInnerHTML={{ __html: impact }}
        data-testid="text-impact"
      />
    </div>
  );
}
