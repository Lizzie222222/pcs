import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Search, 
  Filter, 
  Loader2, 
  FileText, 
  School, 
  ClipboardCheck, 
  BookOpen,
  MapPin,
  Calendar,
  TrendingUp
} from "lucide-react";

interface SearchResult {
  resources: any[];
  schools: any[];
  evidence: any[];
  caseStudies: any[];
  totalResults: number;
}

interface AdvancedSearchProps {
  className?: string;
  defaultQuery?: string;
  onResultsChange?: (results: SearchResult) => void;
}

export function AdvancedSearch({ className = "", defaultQuery = "", onResultsChange }: AdvancedSearchProps) {
  const [query, setQuery] = useState(defaultQuery);
  const [searchQuery, setSearchQuery] = useState("");
  const [contentTypes, setContentTypes] = useState<string[]>(['resources', 'schools', 'evidence', 'caseStudies']);
  const [activeTab, setActiveTab] = useState("all");

  // Global search query
  const { data: searchResults, isLoading, error } = useQuery<SearchResult>({
    queryKey: ['/api/search/global', searchQuery, contentTypes],
    enabled: !!searchQuery && searchQuery.length >= 2,
    queryFn: async () => {
      const params = new URLSearchParams({
        q: searchQuery,
        contentTypes: contentTypes.join(','),
        limit: '50'
      });
      const response = await fetch(`/api/search/global?${params}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    }
  });

  useEffect(() => {
    if (searchResults && onResultsChange) {
      onResultsChange(searchResults);
    }
  }, [searchResults, onResultsChange]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 2) {
      setSearchQuery(query.trim());
    }
  };

  const handleContentTypeChange = (type: string, checked: boolean) => {
    if (checked) {
      setContentTypes(prev => [...prev, type]);
    } else {
      setContentTypes(prev => prev.filter(t => t !== type));
    }
  };

  const contentTypeOptions = [
    { id: 'resources', label: 'Resources', icon: FileText, color: 'bg-blue-500' },
    { id: 'schools', label: 'Schools', icon: School, color: 'bg-green-500' },
    { id: 'evidence', label: 'Evidence', icon: ClipboardCheck, color: 'bg-orange-500' },
    { id: 'caseStudies', label: 'Case Studies', icon: BookOpen, color: 'bg-purple-500' }
  ];

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'resources': return FileText;
      case 'schools': return School;
      case 'evidence': return ClipboardCheck;
      case 'caseStudies': return BookOpen;
      default: return FileText;
    }
  };

  const renderResourceCard = (resource: any) => (
    <Card key={resource.id} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-2">
            <FileText className="w-5 h-5 text-blue-500 mt-1" />
            <div>
              <CardTitle className="text-lg">{resource.title}</CardTitle>
              <CardDescription className="mt-1">
                {resource.description?.substring(0, 120)}...
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary">{resource.stage}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          {resource.country && (
            <span className="flex items-center space-x-1">
              <MapPin className="w-3 h-3" />
              <span>{resource.country}</span>
            </span>
          )}
          {resource.language && <span>{resource.language}</span>}
          {resource.downloadCount && (
            <span className="flex items-center space-x-1">
              <TrendingUp className="w-3 h-3" />
              <span>{resource.downloadCount} downloads</span>
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderSchoolCard = (school: any) => (
    <Card key={school.id} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-2">
            <School className="w-5 h-5 text-green-500 mt-1" />
            <div>
              <CardTitle className="text-lg">{school.name}</CardTitle>
              <CardDescription className="mt-1">
                {school.type} • {school.country}
              </CardDescription>
            </div>
          </div>
          <Badge variant={school.currentStage === 'act' ? 'default' : 'secondary'}>
            {school.currentStage}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          {school.studentCount && (
            <span>{school.studentCount} students</span>
          )}
          <span>{school.progressPercentage}% complete</span>
          {school.featuredSchool && (
            <Badge variant="outline" className="text-xs">Featured</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderEvidenceCard = (evidence: any) => (
    <Card key={evidence.id} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-2">
            <ClipboardCheck className="w-5 h-5 text-orange-500 mt-1" />
            <div>
              <CardTitle className="text-lg">{evidence.title}</CardTitle>
              <CardDescription className="mt-1">
                {evidence.description?.substring(0, 120)}...
              </CardDescription>
            </div>
          </div>
          <Badge variant={evidence.status === 'approved' ? 'default' : 'secondary'}>
            {evidence.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <span className="flex items-center space-x-1">
            <Calendar className="w-3 h-3" />
            <span>{new Date(evidence.submittedAt).toLocaleDateString()}</span>
          </span>
          <Badge variant="outline" className="text-xs">{evidence.stage}</Badge>
        </div>
      </CardContent>
    </Card>
  );

  const renderCaseStudyCard = (caseStudy: any) => (
    <Card key={caseStudy.id} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-2">
            <BookOpen className="w-5 h-5 text-purple-500 mt-1" />
            <div>
              <CardTitle className="text-lg">{caseStudy.title}</CardTitle>
              <CardDescription className="mt-1">
                {caseStudy.description?.substring(0, 120)}...
              </CardDescription>
            </div>
          </div>
          {caseStudy.featured && (
            <Badge variant="default">Featured</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <Badge variant="outline" className="text-xs">{caseStudy.stage}</Badge>
          {caseStudy.impact && (
            <span className="text-green-600 font-medium">High Impact</span>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className={`max-w-6xl mx-auto ${className}`}>
      {/* Search Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="w-5 h-5" />
            <span>Advanced Search</span>
          </CardTitle>
          <CardDescription>
            Search across all content types with advanced filters and relevance ranking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex space-x-2">
              <Input
                placeholder="Enter your search query..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1"
                data-testid="input-advanced-search"
              />
              <Button 
                type="submit" 
                disabled={query.trim().length < 2 || isLoading}
                data-testid="button-search"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                Search
              </Button>
            </div>

            {/* Content Type Filters */}
            <div className="space-y-2">
              <Label className="flex items-center space-x-2">
                <Filter className="w-4 h-4" />
                <span>Content Types</span>
              </Label>
              <div className="flex flex-wrap gap-4">
                {contentTypeOptions.map(option => {
                  const Icon = option.icon;
                  return (
                    <div key={option.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={option.id}
                        checked={contentTypes.includes(option.id)}
                        onCheckedChange={(checked) => handleContentTypeChange(option.id, checked as boolean)}
                        data-testid={`checkbox-${option.id}`}
                      />
                      <Label 
                        htmlFor={option.id} 
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <Icon className={`w-4 h-4 text-white rounded p-0.5 ${option.color}`} />
                        <span>{option.label}</span>
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Search Results */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">Search failed. Please try again.</p>
          </CardContent>
        </Card>
      )}

      {searchResults && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results</CardTitle>
            <CardDescription>
              Found {searchResults.totalResults} results for "{searchQuery}"
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all" data-testid="tab-all-results">
                  All ({searchResults.totalResults})
                </TabsTrigger>
                <TabsTrigger value="resources" data-testid="tab-resources">
                  Resources ({searchResults.resources.length})
                </TabsTrigger>
                <TabsTrigger value="schools" data-testid="tab-schools">
                  Schools ({searchResults.schools.length})
                </TabsTrigger>
                <TabsTrigger value="evidence" data-testid="tab-evidence">
                  Evidence ({searchResults.evidence.length})
                </TabsTrigger>
                <TabsTrigger value="caseStudies" data-testid="tab-case-studies">
                  Case Studies ({searchResults.caseStudies.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4 mt-6">
                {searchResults.resources.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-blue-500" />
                      <span>Resources</span>
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {searchResults.resources.slice(0, 4).map(renderResourceCard)}
                    </div>
                  </div>
                )}

                {searchResults.schools.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                      <School className="w-5 h-5 text-green-500" />
                      <span>Schools</span>
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {searchResults.schools.slice(0, 4).map(renderSchoolCard)}
                    </div>
                  </div>
                )}

                {searchResults.evidence.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                      <ClipboardCheck className="w-5 h-5 text-orange-500" />
                      <span>Evidence</span>
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {searchResults.evidence.slice(0, 4).map(renderEvidenceCard)}
                    </div>
                  </div>
                )}

                {searchResults.caseStudies.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                      <BookOpen className="w-5 h-5 text-purple-500" />
                      <span>Case Studies</span>
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {searchResults.caseStudies.slice(0, 4).map(renderCaseStudyCard)}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="resources" className="space-y-4 mt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  {searchResults.resources.map(renderResourceCard)}
                </div>
              </TabsContent>

              <TabsContent value="schools" className="space-y-4 mt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  {searchResults.schools.map(renderSchoolCard)}
                </div>
              </TabsContent>

              <TabsContent value="evidence" className="space-y-4 mt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  {searchResults.evidence.map(renderEvidenceCard)}
                </div>
              </TabsContent>

              <TabsContent value="caseStudies" className="space-y-4 mt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  {searchResults.caseStudies.map(renderCaseStudyCard)}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {searchQuery && !isLoading && searchResults && searchResults.totalResults === 0 && (
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="pt-6 text-center">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No Results Found</h3>
            <p className="text-gray-500">
              Try different search terms or adjust your content type filters.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}