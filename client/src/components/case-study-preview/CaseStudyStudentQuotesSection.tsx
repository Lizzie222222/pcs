import { Card, CardContent } from "@/components/ui/card";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { Quote } from "lucide-react";
import type { StudentQuote } from "./types";

interface CaseStudyStudentQuotesSectionProps {
  studentQuotes: StudentQuote[];
}

export function CaseStudyStudentQuotesSection({ studentQuotes }: CaseStudyStudentQuotesSectionProps) {
  if (!studentQuotes || studentQuotes.length === 0) return null;

  return (
    <div className="mb-16 scroll-reveal">
      <h2 className="text-3xl font-bold text-navy mb-8 flex items-center gap-3">
        <Quote className="w-8 h-8 text-teal" />
        Student Voices
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {studentQuotes.map((quote, idx) => (
          <Card 
            key={idx}
            className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-teal/5"
          >
            <CardContent className="p-6">
              <Quote className="w-8 h-8 text-teal/40 mb-4" />
              <p className="text-gray-700 italic mb-6 leading-relaxed">"{quote.text}"</p>
              <div className="flex items-center gap-4">
                {quote.photo ? (
                  <OptimizedImage
                    src={quote.photo}
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
  );
}
