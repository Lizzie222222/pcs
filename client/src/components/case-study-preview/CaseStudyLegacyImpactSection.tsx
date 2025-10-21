import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface CaseStudyLegacyImpactSectionProps {
  impact: string;
  showIfMetricsExist?: boolean;
}

export function CaseStudyLegacyImpactSection({ 
  impact, 
  showIfMetricsExist = false 
}: CaseStudyLegacyImpactSectionProps) {
  if (!impact || showIfMetricsExist) return null;

  return (
    <Card className="mb-16 bg-gradient-to-br from-ocean-blue/5 to-teal/5 border-ocean-blue/20 scroll-reveal">
      <CardContent className="p-8">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-6 h-6 text-ocean-blue" />
          <h2 className="text-2xl font-semibold text-navy">Impact Achieved</h2>
        </div>
        <div 
          className="prose prose-lg max-w-none prose-headings:text-navy prose-p:text-gray-700 prose-a:text-ocean-blue"
          dangerouslySetInnerHTML={{ __html: impact }}
          data-testid="text-impact"
        />
      </CardContent>
    </Card>
  );
}
