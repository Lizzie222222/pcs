import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";
import type { TimelineSection } from "./types";

interface CaseStudyTimelineSectionProps {
  timelineSections: TimelineSection[];
}

export function CaseStudyTimelineSection({ timelineSections }: CaseStudyTimelineSectionProps) {
  if (!timelineSections || timelineSections.length === 0) return null;

  return (
    <div className="mb-16">
      <h2 className="text-3xl font-bold text-navy mb-12 scroll-reveal">Our Journey</h2>
      <div className="relative">
        <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-ocean-blue to-teal" />
        
        {timelineSections
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
                    <p className="text-gray-700 leading-relaxed">{section.content}</p>
                  </CardContent>
                </Card>
              </div>
              
              <div className="absolute left-8 md:left-1/2 top-6 w-4 h-4 bg-ocean-blue rounded-full -translate-x-1/2 border-4 border-white shadow-lg" />
            </div>
          ))}
      </div>
    </div>
  );
}
