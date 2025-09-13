import { AdvancedSearch } from "@/components/AdvancedSearch";

export default function Search() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="max-w-4xl mx-auto text-center mb-8">
          <h1 className="text-4xl font-bold text-navy mb-4" data-testid="text-search-title">
            Search Platform
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Find resources, schools, evidence, and case studies using our advanced search capabilities
          </p>
        </div>

        {/* Advanced Search Component */}
        <AdvancedSearch />
      </div>
    </div>
  );
}