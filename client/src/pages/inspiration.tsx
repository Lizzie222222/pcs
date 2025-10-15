import { useState, useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Search, 
  Star, 
  MapPin, 
  Users, 
  ChevronRight, 
  Award, 
  Quote,
  TrendingUp,
  X,
  Filter,
  ChevronLeft,
  Sparkles
} from "lucide-react";
import { useCountries } from "@/hooks/useCountries";
import useEmblaCarousel from "embla-carousel-react";
import { stripHtmlTags } from "@/lib/utils";

interface CaseStudy {
  id: string;
  title: string;
  description: string;
  stage: 'inspire' | 'investigate' | 'act';
  status: string;
  impact?: string;
  imageUrl?: string;
  featured: boolean;
  schoolName: string;
  schoolCountry: string;
  createdAt: string;
  images: { url: string; caption?: string }[];
  videos: { url: string; title?: string; platform?: string }[];
  studentQuotes: { name: string; quote: string; photoUrl?: string; age?: number }[];
  impactMetrics: { label: string; value: string; icon?: string; color?: string }[];
  categories: string[];
  tags: string[];
  beforeImage?: string;
  afterImage?: string;
}

function ImageCarousel({ images, title }: { images: { url: string; caption?: string }[]; title: string }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    
    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };
    
    emblaApi.on('select', onSelect);
    onSelect(); // Set initial index
    
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi]);

  if (!images || images.length === 0) return null;

  const displayImages = images.slice(0, 4);

  if (displayImages.length === 1) {
    return (
      <div className="relative overflow-hidden group">
        <img 
          src={displayImages[0].url} 
          alt={title}
          className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden group" ref={emblaRef}>
      <div className="flex">
        {displayImages.map((image, index) => (
          <div key={index} className="relative flex-[0_0_100%] min-w-0">
            <img 
              src={image.url} 
              alt={image.caption || title}
              className="w-full h-64 object-cover transition-transform duration-500 hover:scale-110"
              loading="lazy"
            />
          </div>
        ))}
      </div>
      
      {displayImages.length > 1 && (
        <>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {displayImages.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === selectedIndex 
                    ? 'bg-white w-6' 
                    : 'bg-white/60 hover:bg-white/80'
                }`}
                onClick={() => emblaApi?.scrollTo(index)}
                data-testid={`carousel-dot-${index}`}
              />
            ))}
          </div>
          
          <button
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-all opacity-0 group-hover:opacity-100"
            onClick={() => emblaApi?.scrollPrev()}
            data-testid="carousel-prev"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-all opacity-0 group-hover:opacity-100"
            onClick={() => emblaApi?.scrollNext()}
            data-testid="carousel-next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
}

function CaseStudyCard({ caseStudy }: { caseStudy: CaseStudy }) {
  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'inspire': return 'bg-pcs_blue text-white';
      case 'investigate': return 'bg-teal text-white';
      case 'act': return 'bg-coral text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getMetricColor = (color?: string) => {
    switch (color) {
      case 'blue': return 'text-pcs_blue bg-blue-50';
      case 'teal': return 'text-teal bg-teal-50';
      case 'coral': return 'text-coral bg-coral-50';
      case 'green': return 'text-green-600 bg-green-50';
      default: return 'text-gray-700 bg-gray-50';
    }
  };

  const firstQuote = caseStudy.studentQuotes?.[0];
  const displayMetrics = caseStudy.impactMetrics?.slice(0, 2) || [];
  const hasBeforeAfter = caseStudy.beforeImage && caseStudy.afterImage;

  return (
    <Card 
      className="group break-inside-avoid mb-6 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:border-pcs_blue/30 animate-fade-in"
      data-testid={`case-study-${caseStudy.id}`}
    >
      {/* Image Section */}
      {hasBeforeAfter ? (
        <div className="grid grid-cols-2 gap-0.5 bg-gray-200">
          <div className="relative overflow-hidden group/img">
            <img 
              src={caseStudy.beforeImage} 
              alt="Before"
              className="w-full h-48 object-cover transition-transform duration-500 group-hover/img:scale-110"
              loading="lazy"
            />
            <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-xs font-medium">
              Before
            </div>
          </div>
          <div className="relative overflow-hidden group/img">
            <img 
              src={caseStudy.afterImage} 
              alt="After"
              className="w-full h-48 object-cover transition-transform duration-500 group-hover/img:scale-110"
              loading="lazy"
            />
            <div className="absolute top-2 right-2 bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">
              After
            </div>
          </div>
        </div>
      ) : caseStudy.images?.length > 0 ? (
        <ImageCarousel images={caseStudy.images} title={caseStudy.title} />
      ) : caseStudy.imageUrl ? (
        <div className="relative overflow-hidden group">
          <img 
            src={caseStudy.imageUrl} 
            alt={caseStudy.title}
            className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        </div>
      ) : null}

      <CardContent className="p-5">
        {/* Stage Badge & Featured */}
        <div className="flex items-center justify-between mb-3">
          <Badge className={getStageColor(caseStudy.stage)}>
            {caseStudy.stage}
          </Badge>
          {caseStudy.featured && (
            <div className="flex items-center text-yellow-500">
              <Star className="h-4 w-4 mr-1 fill-current" />
              <span className="text-xs font-medium">Featured</span>
            </div>
          )}
        </div>
        
        {/* Title */}
        <h3 className="text-lg font-bold text-navy mb-2 line-clamp-2 group-hover:text-pcs_blue transition-colors">
          {caseStudy.title}
        </h3>
        
        {/* School Info */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
          <MapPin className="h-3.5 w-3.5" />
          <span>{caseStudy.schoolName} • {caseStudy.schoolCountry}</span>
        </div>
        
        {/* Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {stripHtmlTags(caseStudy.description)}
        </p>

        {/* Impact Metrics */}
        {displayMetrics.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {displayMetrics.map((metric, index) => (
              <div 
                key={index} 
                className={`p-3 rounded-lg ${getMetricColor(metric.color)}`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <p className="text-xs font-medium">{metric.label}</p>
                </div>
                <p className="text-lg font-bold">{metric.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Student Quote */}
        {firstQuote && (
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg mb-4 border-l-3 border-pcs_blue">
            <div className="flex gap-3">
              {firstQuote.photoUrl && (
                <img 
                  src={firstQuote.photoUrl} 
                  alt={firstQuote.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              )}
              <div className="flex-1">
                <Quote className="h-4 w-4 text-pcs_blue/40 mb-1" />
                <p className="text-sm text-gray-700 italic line-clamp-2 mb-2">
                  "{firstQuote.quote}"
                </p>
                <p className="text-xs font-medium text-gray-600">
                  — {firstQuote.name}{firstQuote.age ? `, ${firstQuote.age}` : ''}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Categories & Tags */}
        {(caseStudy.categories?.length > 0 || caseStudy.tags?.length > 0) && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {caseStudy.categories?.slice(0, 2).map((category, index) => (
              <Badge 
                key={index} 
                variant="outline" 
                className="text-xs bg-pcs_blue/5 text-pcs_blue border-pcs_blue/20"
              >
                {category}
              </Badge>
            ))}
            {caseStudy.tags?.slice(0, 2).map((tag, index) => (
              <Badge 
                key={index} 
                variant="outline" 
                className="text-xs bg-teal/5 text-teal border-teal/20"
              >
                #{tag}
              </Badge>
            ))}
          </div>
        )}
        
        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t">
          <span className="text-xs text-gray-500">
            {new Date(caseStudy.createdAt).toLocaleDateString()}
          </span>
          <Link href={`/case-study/${caseStudy.id}`}>
            <Button 
              size="sm" 
              variant="ghost" 
              className="text-pcs_blue hover:bg-pcs_blue hover:text-white transition-all group-hover:translate-x-1"
              data-testid={`button-read-more-${caseStudy.id}`}
            >
              Read More
              <ChevronRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function MasonrySkeleton() {
  return (
    <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6">
      {[...Array(8)].map((_, i) => (
        <div 
          key={i} 
          className="break-inside-avoid mb-6 animate-pulse"
          style={{ height: `${200 + Math.random() * 200}px` }}
        >
          <div className="bg-gray-200 rounded-lg h-full" />
        </div>
      ))}
    </div>
  );
}

export default function Inspiration() {
  const [filters, setFilters] = useState({
    search: '',
    country: '',
    stage: '',
    categories: [] as string[],
    tags: [] as string[],
    featuredOnly: false,
  });
  const limit = 12;

  const { data: countryOptions = [], isLoading: isLoadingCountries } = useCountries();

  const { 
    data, 
    isLoading, 
    fetchNextPage, 
    hasNextPage,
    isFetchingNextPage 
  } = useInfiniteQuery({
    queryKey: ['/api/case-studies', filters],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const params = new URLSearchParams({
        search: filters.search,
        country: filters.country,
        stage: filters.stage,
        limit: limit.toString(),
        offset: (pageParam * limit).toString(),
      });
      
      if (filters.featuredOnly) {
        params.set('featured', 'true');
      }
      
      if (filters.categories.length > 0) {
        params.set('categories', filters.categories.join(','));
      }
      
      if (filters.tags.length > 0) {
        params.set('tags', filters.tags.join(','));
      }
      
      // Remove empty values
      Array.from(params.keys()).forEach(key => {
        if (!params.get(key)) {
          params.delete(key);
        }
      });
      
      const response = await fetch(`/api/case-studies?${params}`);
      if (!response.ok) throw new Error('Failed to fetch case studies');
      const result: CaseStudy[] = await response.json();
      return result;
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === limit ? allPages.length : undefined;
    },
    initialPageParam: 0,
  });

  // Flatten all pages into a single array
  const caseStudies: CaseStudy[] = data?.pages.flatMap(page => page) || [];

  // Extract unique categories and tags from case studies
  const allCategories = Array.from(new Set(
    caseStudies?.flatMap(cs => cs.categories || []) || []
  ));
  
  const allTags = Array.from(new Set(
    caseStudies?.flatMap(cs => cs.tags || []) || []
  ));

  const handleFilterChange = (key: string, value: any) => {
    const actualValue = value === 'all' ? '' : value;
    setFilters(prev => ({ ...prev, [key]: actualValue }));
  };

  const handleCategoryToggle = (category: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const handleTagToggle = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      country: '',
      stage: '',
      categories: [],
      tags: [],
      featuredOnly: false,
    });
  };

  const hasActiveFilters = 
    filters.search || 
    filters.country || 
    filters.stage || 
    filters.categories.length > 0 || 
    filters.tags.length > 0 || 
    filters.featuredOnly;

  const featuredStory = caseStudies?.find(cs => cs.featured);
  const regularStories = caseStudies?.filter(cs => !cs.featured || cs.id !== featuredStory?.id) || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-8 w-8 text-pcs_blue" />
            <h1 className="text-4xl font-bold text-navy" data-testid="text-inspiration-title">
              Inspiring Success Stories
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover amazing initiatives from schools around the world making a real difference in the fight against plastic pollution
          </p>
        </div>

        {/* Enhanced Filters */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter Success Stories
              </CardTitle>
              {hasActiveFilters && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearFilters}
                  data-testid="button-clear-filters"
                  className="text-gray-600 hover:text-gray-900"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Row 1: Search, Country, Stage */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Input
                  placeholder="Search by school name..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  data-testid="input-search-schools"
                  className="w-full"
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

            {/* Row 2: Categories, Tags, Featured Toggle */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Categories Multi-select */}
              {allCategories.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-between"
                      data-testid="button-categories-filter"
                    >
                      <span>
                        {filters.categories.length > 0 
                          ? `${filters.categories.length} Categories` 
                          : 'All Categories'}
                      </span>
                      <ChevronRight className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm mb-3">Select Categories</h4>
                      {allCategories.map((category) => (
                        <div key={category} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`category-${category}`}
                            checked={filters.categories.includes(category)}
                            onCheckedChange={() => handleCategoryToggle(category)}
                            data-testid={`checkbox-category-${category}`}
                          />
                          <Label 
                            htmlFor={`category-${category}`}
                            className="text-sm cursor-pointer flex-1"
                          >
                            {category}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              {/* Tags Multi-select */}
              {allTags.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-between"
                      data-testid="button-tags-filter"
                    >
                      <span>
                        {filters.tags.length > 0 
                          ? `${filters.tags.length} Tags` 
                          : 'All Tags'}
                      </span>
                      <ChevronRight className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm mb-3">Select Tags</h4>
                      {allTags.map((tag) => (
                        <div key={tag} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`tag-${tag}`}
                            checked={filters.tags.includes(tag)}
                            onCheckedChange={() => handleTagToggle(tag)}
                            data-testid={`checkbox-tag-${tag}`}
                          />
                          <Label 
                            htmlFor={`tag-${tag}`}
                            className="text-sm cursor-pointer flex-1"
                          >
                            #{tag}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              {/* Featured Toggle */}
              <div className="flex items-center space-x-2 border rounded-lg px-4 py-2">
                <Switch 
                  id="featured-toggle"
                  checked={filters.featuredOnly}
                  onCheckedChange={(checked) => handleFilterChange('featuredOnly', checked)}
                  data-testid="switch-featured-only"
                />
                <Label htmlFor="featured-toggle" className="cursor-pointer flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  Featured Only
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        {!isLoading && caseStudies && (
          <div className="mb-6 text-sm text-gray-600 flex items-center justify-between">
            <span data-testid="text-results-count">
              Showing {regularStories.length} {regularStories.length === 1 ? 'story' : 'stories'}
              {hasActiveFilters && ' (filtered)'}
            </span>
          </div>
        )}

        {/* Featured Story */}
        {featuredStory && !filters.featuredOnly && (
          <Card className="mb-8 bg-gradient-to-r from-pcs_blue to-teal text-white overflow-hidden animate-fade-in">
            <CardContent className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="h-5 w-5 text-yellow-400 fill-current" />
                    <Badge className="bg-white/20 text-white">Featured Success Story</Badge>
                  </div>
                  <h2 className="text-3xl font-bold mb-4" data-testid="text-featured-title">
                    {featuredStory.title}
                  </h2>
                  <p className="text-lg mb-6 text-white/90">
                    {featuredStory.description}
                  </p>
                  <div className="flex items-center gap-6 mb-6 text-white/90">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{featuredStory.schoolCountry}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{featuredStory.schoolName}</span>
                    </div>
                  </div>
                  <Link href={`/case-study/${featuredStory.id}`}>
                    <Button 
                      className="bg-white text-pcs_blue hover:bg-gray-100 transition-all hover:scale-105"
                      data-testid="button-read-featured"
                    >
                      Read Full Story
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                {(featuredStory.images?.[0]?.url || featuredStory.imageUrl) && (
                  <div className="lg:text-right">
                    <img 
                      src={featuredStory.images?.[0]?.url || featuredStory.imageUrl} 
                      alt={featuredStory.title}
                      className="rounded-xl shadow-2xl w-full max-w-md ml-auto transform hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Masonry Layout */}
        {isLoading ? (
          <MasonrySkeleton />
        ) : regularStories.length > 0 ? (
          <>
            <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6">
              {regularStories.map((caseStudy) => (
                <CaseStudyCard key={caseStudy.id} caseStudy={caseStudy} />
              ))}
            </div>

            {/* Load More */}
            {hasNextPage && (
              <div className="text-center mt-12">
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  data-testid="button-load-more"
                  className="hover:bg-pcs_blue hover:text-white transition-all"
                >
                  {isFetchingNextPage ? 'Loading...' : 'Load More Stories'}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <Award className="h-20 w-20 mx-auto text-gray-300 mb-4" />
            <h3 className="text-2xl font-semibold text-gray-600 mb-2">No Success Stories Found</h3>
            <p className="text-gray-500 mb-6">
              Try adjusting your search criteria or check back later for new inspiring stories.
            </p>
            <Button
              variant="outline"
              onClick={clearFilters}
              data-testid="button-clear-filters-empty"
              className="hover:bg-pcs_blue hover:text-white"
            >
              <X className="mr-2 h-4 w-4" />
              Clear All Filters
            </Button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
        
        .border-l-3 {
          border-left-width: 3px;
        }
      `}</style>
    </div>
  );
}
