import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { AnimatedCounter } from "./utils";
import type { ImpactMetric } from "./types";

interface CaseStudyImpactMetricsSectionProps {
  impactMetrics: ImpactMetric[];
  animate?: boolean;
}

export function CaseStudyImpactMetricsSection({ 
  impactMetrics, 
  animate = true 
}: CaseStudyImpactMetricsSectionProps) {
  if (!impactMetrics || impactMetrics.length === 0) return null;

  return (
    <div className="mb-16 scroll-reveal">
      <h2 className="text-3xl font-bold text-navy mb-8 flex items-center gap-3">
        <TrendingUp className="w-8 h-8 text-ocean-blue" />
        Impact Achieved
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {impactMetrics.map((metric, idx) => (
          <Card 
            key={idx}
            className="overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            style={{ backgroundColor: metric.color || 'white' }}
          >
            <CardContent className="p-6 text-center">
              <div className={`text-5xl font-bold mb-2 ${metric.color ? 'text-white' : 'text-ocean-blue'}`}>
                <AnimatedCounter value={metric.value} animate={animate} />
              </div>
              <div className={`text-lg font-semibold ${metric.color ? 'text-white/90' : 'text-navy'}`}>
                {metric.label}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
