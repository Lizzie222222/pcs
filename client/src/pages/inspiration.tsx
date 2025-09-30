import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/ui/states";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Star, MapPin, Users, ChevronRight, Award } from "lucide-react";
import { useCountries } from "@/hooks/useCountries";

interface CaseStudy {
  id: string;
  title: string;
  description: string;
  stage: 'inspire' | 'investigate' | 'act';
  impact: string;
  imageUrl: string;
  featured: boolean;
  schoolName: string;
  schoolCountry: string;
  createdAt: string;
}

export default function Inspiration() {
  const [filters, setFilters] = useState({
    search: '',
    country: '',
    stage: '',
  });
  const [page, setPage] = useState(0);
  const limit = 12;

  const { data: countryOptions = [], isLoading: isLoadingCountries } = useCountries();

  const { data: caseStudies, isLoading } = useQuery<CaseStudy[]>({
    queryKey: ['/api/case-studies', filters, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...filters,
        limit: limit.toString(),
        offset: (page * limit).toString(),
      });
      // Remove empty values
      Object.keys(filters).forEach(key => {
        if (!filters[key as keyof typeof filters]) {
          params.delete(key);
        }
      });
      
      const response = await fetch(`/api/case-studies?${params}`);
      if (!response.ok) throw new Error('Failed to fetch case studies');
      return response.json();
    },
  });

  const handleFilterChange = (key: string, value: string) => {
    // Convert "all" values to empty strings to show all results
    const actualValue = value === 'all' ? '' : value;
    setFilters(prev => ({ ...prev, [key]: actualValue }));
    setPage(0); // Reset to first page when filters change
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'inspire': return 'bg-pcs_blue text-white';
      case 'investigate': return 'bg-teal text-white';
      case 'act': return 'bg-coral text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-navy mb-4" data-testid="text-inspiration-title">
            Inspiring Success Stories
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover amazing initiatives from schools around the world making a real difference in the fight against plastic pollution
          </p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Success Stories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Input
                  placeholder="Search by school name..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  data-testid="input-search-schools"
                />
              </div>
              
              <Select value={filters.country} onValueChange={(value) => handleFilterChange('country', value)}>
                <SelectTrigger data-testid="select-country">
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  {countryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filters.stage} onValueChange={(value) => handleFilterChange('stage', value)}>
                <SelectTrigger data-testid="select-stage">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="inspire">Inspire</SelectItem>
                  <SelectItem value="investigate">Investigate</SelectItem>
                  <SelectItem value="act">Act</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Featured Case Study */}
        {caseStudies && caseStudies.length > 0 && caseStudies[0]?.featured && (
          <Card className="mb-8 bg-gradient-to-r from-pcs_blue to-teal text-white overflow-hidden">
            <CardContent className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="h-5 w-5 text-yellow" />
                    <Badge className="bg-white/20 text-white">Featured Success Story</Badge>
                  </div>
                  <h2 className="text-3xl font-bold mb-4" data-testid="text-featured-title">
                    {caseStudies[0].title}
                  </h2>
                  <p className="text-lg mb-6 text-white/90">
                    {caseStudies[0].description}
                  </p>
                  <div className="flex items-center gap-6 mb-6 text-white/90">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{caseStudies[0].schoolCountry}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{caseStudies[0].schoolName}</span>
                    </div>
                  </div>
                  <Link href={`/case-study/${caseStudies[0].id}`}>
                    <Button 
                      className="bg-white text-pcs_blue hover:bg-gray-100"
                      data-testid="button-read-featured"
                    >
                      Read Full Story
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                {caseStudies[0].imageUrl && (
                  <div className="lg:text-right">
                    <img 
                      src={caseStudies[0].imageUrl} 
                      alt={caseStudies[0].title}
                      className="rounded-xl shadow-lg w-full max-w-md ml-auto"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Case Studies Grid */}
        {isLoading ? (
          <LoadingSkeleton 
            variant="card" 
            count={6} 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {caseStudies?.filter(cs => !cs.featured || caseStudies.indexOf(cs) !== 0).map((caseStudy) => (
                <Card key={caseStudy.id} className="hover:shadow-lg transition-shadow" data-testid={`case-study-${caseStudy.id}`}>
                  {caseStudy.imageUrl && (
                    <div className="h-48 overflow-hidden">
                      <img 
                        src={caseStudy.imageUrl} 
                        alt={caseStudy.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <Badge className={getStageColor(caseStudy.stage)}>
                        {caseStudy.stage}
                      </Badge>
                      {caseStudy.featured && (
                        <div className="flex items-center text-yellow">
                          <Star className="h-4 w-4 mr-1" />
                          <span className="text-sm font-medium">Featured</span>
                        </div>
                      )}
                    </div>
                    
                    <h3 className="text-lg font-bold text-navy mb-2 line-clamp-2">
                      {caseStudy.title}
                    </h3>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      {caseStudy.schoolName} • {caseStudy.schoolCountry}
                    </p>
                    
                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {caseStudy.description}
                    </p>
                    
                    {caseStudy.impact && (
                      <div className="bg-gray-50 p-3 rounded-lg mb-4">
                        <p className="text-sm font-medium text-navy">Impact:</p>
                        <p className="text-sm text-gray-600">{caseStudy.impact}</p>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {new Date(caseStudy.createdAt).toLocaleDateString()}
                      </span>
                      <Link href={`/case-study/${caseStudy.id}`}>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-pcs_blue hover:bg-pcs_blue hover:text-white"
                          data-testid={`button-read-more-${caseStudy.id}`}
                        >
                          Read More
                          <ChevronRight className="ml-1 h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Load More */}
            {caseStudies && caseStudies.length === limit && (
              <div className="text-center mt-12">
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setPage(prev => prev + 1)}
                  data-testid="button-load-more"
                >
                  Load More Stories
                </Button>
              </div>
            )}

            {caseStudies && caseStudies.length === 0 && (
              <div className="text-center py-12">
                <Award className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No Success Stories Found</h3>
                <p className="text-gray-500 mb-4">
                  Try adjusting your search criteria or check back later for new inspiring stories.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilters({
                      search: '',
                      country: '',
                      stage: '',
                    });
                    setPage(0);
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
