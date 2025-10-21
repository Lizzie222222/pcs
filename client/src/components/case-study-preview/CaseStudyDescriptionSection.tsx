interface CaseStudyDescriptionSectionProps {
  description: string;
}

export function CaseStudyDescriptionSection({ description }: CaseStudyDescriptionSectionProps) {
  if (!description) return null;

  return (
    <div className="mb-16">
      <div 
        className="prose prose-lg max-w-none prose-headings:text-navy prose-p:text-gray-700 prose-a:text-ocean-blue"
        dangerouslySetInnerHTML={{ __html: description || '<p>No description available.</p>' }}
        data-testid="text-description"
      />
    </div>
  );
}
