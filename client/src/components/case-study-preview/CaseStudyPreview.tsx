import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { CaseStudyHeroSection } from "./CaseStudyHeroSection";
import { CaseStudyDescriptionSection } from "./CaseStudyDescriptionSection";
import { CaseStudyImpactMetricsSection } from "./CaseStudyImpactMetricsSection";
import { CaseStudyLegacyImpactSection } from "./CaseStudyLegacyImpactSection";
import { CaseStudyTimelineSection } from "./CaseStudyTimelineSection";
import { CaseStudyStudentQuotesSection } from "./CaseStudyStudentQuotesSection";
import { CaseStudyImageGallerySection } from "./CaseStudyImageGallerySection";
import { CaseStudyVideosSection } from "./CaseStudyVideosSection";
import { CaseStudyEvidenceFilesSection } from "./CaseStudyEvidenceFilesSection";
import { CaseStudyEvidenceLinkSection } from "./CaseStudyEvidenceLinkSection";
import type { CaseStudyData } from "./types";

interface CaseStudyPreviewProps {
  caseStudy: CaseStudyData;
  showHero?: boolean;
  animate?: boolean;
  onScrollToContent?: () => void;
  className?: string;
}

export function CaseStudyPreview({ 
  caseStudy, 
  showHero = true,
  animate = true,
  onScrollToContent,
  className = ""
}: CaseStudyPreviewProps) {
  const heroVideo = caseStudy.videos?.[0];
  const heroImage = caseStudy.images?.[0]?.url || caseStudy.imageUrl;

  return (
    <div className={className}>
      {showHero && (
        <CaseStudyHeroSection
          heroVideo={heroVideo}
          heroImage={heroImage}
          title={caseStudy.title}
          stage={caseStudy.stage}
          featured={caseStudy.featured}
          categories={caseStudy.categories}
          tags={caseStudy.tags}
          schoolName={caseStudy.schoolName}
          location={caseStudy.location}
          createdAt={caseStudy.createdAt}
          onScrollToContent={onScrollToContent}
          showScrollIndicator={!!onScrollToContent}
        />
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {caseStudy.beforeImage && caseStudy.afterImage && (
          <div className="mb-16 scroll-reveal-scale">
            <h2 className="text-3xl font-bold text-navy mb-8">The Transformation</h2>
            <BeforeAfterSlider
              beforeImage={caseStudy.beforeImage}
              afterImage={caseStudy.afterImage}
              beforeAlt={`Before plastic reduction transformation at ${caseStudy.schoolName}`}
              afterAlt={`After plastic reduction transformation at ${caseStudy.schoolName}`}
            />
          </div>
        )}

        <CaseStudyDescriptionSection description={caseStudy.description} />

        <CaseStudyImpactMetricsSection 
          impactMetrics={caseStudy.impactMetrics || []} 
          animate={animate}
        />

        <CaseStudyLegacyImpactSection 
          impact={caseStudy.impact}
          showIfMetricsExist={!!(caseStudy.impactMetrics && caseStudy.impactMetrics.length > 0)}
        />

        <CaseStudyTimelineSection timelineSections={caseStudy.timelineSections || []} />

        <CaseStudyStudentQuotesSection studentQuotes={caseStudy.studentQuotes || []} />

        <CaseStudyImageGallerySection 
          images={caseStudy.images || []} 
          title={caseStudy.title}
        />

        <CaseStudyVideosSection videos={caseStudy.videos || []} />

        <CaseStudyEvidenceFilesSection evidenceFiles={caseStudy.evidenceFiles || []} />

        <CaseStudyEvidenceLinkSection 
          evidenceLink={caseStudy.evidenceLink || ''}
          hasEvidenceFiles={!!(caseStudy.evidenceFiles && caseStudy.evidenceFiles.length > 0)}
        />
      </div>
    </div>
  );
}
