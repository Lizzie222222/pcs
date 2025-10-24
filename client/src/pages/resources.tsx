import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Download, Filter, BookOpen, FileText, Video, Image, Lock, Sparkles, Star } from "lucide-react";
import { useCountries } from "@/hooks/useCountries";
import { EmptyState } from "@/components/ui/states";
import { LANGUAGE_FLAG_MAP, LANGUAGE_NAME_MAP } from "@/lib/languageUtils";

interface Resource {
  id: string;
  title: string;
  description: string;
  stage: 'inspire' | 'investigate' | 'act';
  ageRange: string;
  language: string;
  languages?: string[];
  country: string;
  resourceType?: string;
  theme?: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  downloadCount: number;
  visibility: 'public' | 'registered';
  createdAt: string;
}

interface DashboardData {
  school: {
    id: string;
    name: string;
    currentStage: string;
  };
}

export default function Resources() {
  const { t, i18n } = useTranslation('resources');
  const { isAuthenticated } = useAuth();
  const [filters, setFilters] = useState({
    search: '',
    country: '',
    language: '',
    ageRange: '',
    resourceType: '',
    theme: '',
    stage: '',
  });
  const [selectedLanguageTab, setSelectedLanguageTab] = useState<string>('');
  const [page, setPage] = useState(0);
  const limit = 12;

  const { data: countryOptions = [], isLoading: isLoadingCountries } = useCountries();

  // Get user's school data for recommendations
  const { data: dashboardData } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard'],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: resources, isLoading } = useQuery<Resource[]>({
    queryKey: ['/api/resources', filters, page],
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
      
      const response = await fetch(`/api/resources?${params}`);
      if (!response.ok) throw new Error('Failed to fetch resources');
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

  const getFileIcon = (fileType: string) => {
    if (fileType?.includes('pdf')) return <FileText className="h-4 w-4" />;
    if (fileType?.includes('video')) return <Video className="h-4 w-4" />;
    if (fileType?.includes('image')) return <Image className="h-4 w-4" />;
    return <BookOpen className="h-4 w-4" />;
  };

  const getAgeRangeLabel = (ageRange: string) => {
    const ageRangeMap: { [key: string]: string } = {
      '5-7 years': t('age_ranges.5_7'),
      '8-11 years': t('age_ranges.8_11'),
      '12-16 years': t('age_ranges.12_16'),
      '17+ years': t('age_ranges.17_plus'),
    };
    return ageRangeMap[ageRange] || ageRange;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return `0 ${t('units.bytes')}`;
    const k = 1024;
    const sizes = ['bytes', 'kb', 'mb', 'gb'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const formattedNumber = new Intl.NumberFormat(i18n.language, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0
    }).format(bytes / Math.pow(k, i));
    return `${formattedNumber} ${t(`units.${sizes[i]}`)}`;
  };

  const handleDownload = async (resourceId: string, fileUrl: string, title: string, visibility: string) => {
    // Require authentication for registered-only resources
    if (visibility === 'registered' && !isAuthenticated) {
      alert(t('register_to_access') || 'Please register or log in to access this resource');
      return;
    }

    try {
      // Track download
      await fetch(`/api/resources/${resourceId}/download`, { method: 'GET' });
      
      // Trigger download - add ?download=true for object storage files
      const downloadUrl = fileUrl.startsWith('/objects/') ? `${fileUrl}?download=true` : fileUrl;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  // Check if resource is new (within last 7 days)
  const isNewResource = (createdAt: string) => {
    const created = new Date(createdAt);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return created > sevenDaysAgo;
  };

  // Check if resource is recommended (matches user's school stage)
  const isRecommendedResource = (resourceStage: string) => {
    return dashboardData?.school?.currentStage === resourceStage;
  };

  // Get available languages from resources
  const availableLanguages = Array.from(new Set(
    resources?.flatMap(r => r.languages || (r.language ? [r.language] : [])) || []
  ));

  // Filter resources by selected language tab
  const getFilteredResourcesByLanguage = (languageFilter: string) => {
    if (!resources) return [];
    if (!languageFilter || languageFilter === 'all' || languageFilter === '') return resources;
    
    return resources.filter(resource => {
      const resourceLanguages = resource.languages || (resource.language ? [resource.language] : []);
      return resourceLanguages.some(lang => 
        lang.toLowerCase() === languageFilter.toLowerCase()
      );
    });
  };

  // Separate recommended and other resources
  const separateResources = (resourcesList: Resource[]) => {
    if (!dashboardData?.school?.currentStage) {
      return { recommended: [], others: resourcesList };
    }

    const recommended = resourcesList.filter(r => isRecommendedResource(r.stage));
    const others = resourcesList.filter(r => !isRecommendedResource(r.stage));
    return { recommended, others };
  };

  const filteredResources = getFilteredResourcesByLanguage(selectedLanguageTab);
  const { recommended, others } = separateResources(filteredResources);

  const ResourceCard = ({ resource }: { resource: Resource }) => {
    const isNew = isNewResource(resource.createdAt);
    const isRecommended = isRecommendedResource(resource.stage);
    const isLocked = resource.visibility === 'registered' && !isAuthenticated;

    return (
      <Card 
        key={resource.id} 
        className={`relative hover:shadow-xl transition-all duration-300 hover:scale-[1.02] ${
          isLocked ? 'opacity-80' : ''
        }`} 
        data-testid={`resource-${resource.id}`}
      >
        <CardHeader className="pb-3 space-y-2">
          {/* Top row: NEW/RECOMMENDED badges (left) and Age range badge (right) */}
          <div className="flex justify-between items-start gap-3">
            <div className="flex flex-wrap gap-2">
              {isNew && (
                <div 
                  className="inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold shadow-lg animate-pulse border-0"
                  style={{ 
                    backgroundImage: 'linear-gradient(to right, #facc15, #f97316)',
                    color: '#ffffff'
                  }}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  NEW
                </div>
              )}
              {isRecommended && (
                <div 
                  className="inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold shadow-lg border-0"
                  style={{ 
                    backgroundImage: 'linear-gradient(to right, #a855f7, #ec4899)',
                    color: '#ffffff'
                  }}
                >
                  <Star className="h-3 w-3 mr-1" />
                  RECOMMENDED
                </div>
              )}
            </div>
            {resource.ageRange && (
              <Badge variant="outline" className="text-xs shrink-0">
                {getAgeRangeLabel(resource.ageRange)}
              </Badge>
            )}
          </div>
          
          {/* Second row: Stage badge */}
          <div className="flex items-center gap-2">
            <Badge className={`${getStageColor(resource.stage)} shadow-sm`}>
              {t(`stages.${resource.stage}`)}
            </Badge>
          </div>

          {/* Title */}
          <CardTitle className="text-xl text-navy line-clamp-2 font-bold pt-1">
            {resource.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600 line-clamp-3 text-sm leading-relaxed">
            {resource.description}
          </p>
          <div className="flex items-center justify-between text-sm text-gray-500 pt-2 border-t">
            <div className="flex items-center gap-2">
              {getFileIcon(resource.fileType)}
              <span className="font-medium">{resource.language}</span>
            </div>
            <span className="text-xs">{formatFileSize(resource.fileSize || 0)}</span>
          </div>
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Download className="h-3 w-3" />
              {resource.downloadCount} {t('resource_card.downloads', { defaultValue: 'downloads' })}
            </span>
            {isLocked ? (
              <Button
                size="sm"
                variant="outline"
                className="relative overflow-hidden bg-gray-100 text-gray-600 hover:bg-gray-200"
                onClick={() => handleDownload(resource.id, resource.fileUrl, resource.title, resource.visibility)}
                data-testid={`button-download-${resource.id}`}
              >
                <Lock className="h-4 w-4 mr-1" />
                {t('register_to_access', { defaultValue: 'Register to Access' })}
              </Button>
            ) : (
              <Button
                size="sm"
                className="bg-gradient-to-r from-coral to-orange-500 hover:from-coral/90 hover:to-orange-600 text-white shadow-md"
                onClick={() => handleDownload(resource.id, resource.fileUrl, resource.title, resource.visibility)}
                data-testid={`button-download-${resource.id}`}
              >
                <Download className="h-4 w-4 mr-1" />
                {t('resource_card.download_resource')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-navy mb-4 tracking-tight" data-testid="text-resources-title">
            {t('page.title')}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t('page.subtitle')}
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-8 shadow-lg border-2">
          <CardHeader className="bg-gradient-to-r from-pcs_blue/5 to-teal/5">
            <CardTitle className="flex items-center gap-2 text-navy">
              <Filter className="h-5 w-5" />
              {t('search.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div className="md:col-span-2 lg:col-span-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={t('search.placeholder')}
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="pl-10"
                    data-testid="input-search-resources"
                  />
                </div>
              </div>
              
              <Select value={filters.country} onValueChange={(value) => handleFilterChange('country', value)}>
                <SelectTrigger data-testid="select-country">
                  <SelectValue placeholder={t('search.all_countries')} />
                </SelectTrigger>
                <SelectContent>
                  {countryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filters.language} onValueChange={(value) => handleFilterChange('language', value)}>
                <SelectTrigger data-testid="select-language">
                  <SelectValue placeholder={t('search.all_languages')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('search.all_languages')}</SelectItem>
                  <SelectItem value="English">{t('languages.english')}</SelectItem>
                  <SelectItem value="Spanish">{t('languages.spanish')}</SelectItem>
                  <SelectItem value="French">{t('languages.french')}</SelectItem>
                  <SelectItem value="German">{t('languages.german')}</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filters.ageRange} onValueChange={(value) => handleFilterChange('ageRange', value)}>
                <SelectTrigger data-testid="select-age-range">
                  <SelectValue placeholder={t('search.all_ages')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('search.all_ages')}</SelectItem>
                  <SelectItem value="5-7 years">{t('age_ranges.5_7')}</SelectItem>
                  <SelectItem value="8-11 years">{t('age_ranges.8_11')}</SelectItem>
                  <SelectItem value="12-16 years">{t('age_ranges.12_16')}</SelectItem>
                  <SelectItem value="17+ years">{t('age_ranges.17_plus')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.resourceType} onValueChange={(value) => handleFilterChange('resourceType', value)}>
                <SelectTrigger data-testid="select-resource-type">
                  <SelectValue placeholder="All Resource Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Resource Types</SelectItem>
                  <SelectItem value="lesson_plan">Lesson Plan</SelectItem>
                  <SelectItem value="assembly">Assembly</SelectItem>
                  <SelectItem value="teacher_toolkit">Teacher Toolkit</SelectItem>
                  <SelectItem value="student_workbook">Student Workbook</SelectItem>
                  <SelectItem value="printable_activities">Printable Activities</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.theme} onValueChange={(value) => handleFilterChange('theme', value)}>
                <SelectTrigger data-testid="select-theme">
                  <SelectValue placeholder="All Themes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Themes</SelectItem>
                  <SelectItem value="ocean_literacy">Ocean Literacy</SelectItem>
                  <SelectItem value="climate_change">Climate Change</SelectItem>
                  <SelectItem value="plastic_pollution">Plastic Pollution</SelectItem>
                  <SelectItem value="science">Science</SelectItem>
                  <SelectItem value="design_technology">Design & Technology</SelectItem>
                  <SelectItem value="geography">Geography</SelectItem>
                  <SelectItem value="cross_curricular">Cross-curricular</SelectItem>
                  <SelectItem value="enrichment">Enrichment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filters.stage === '' ? 'default' : 'outline'}
                onClick={() => handleFilterChange('stage', '')}
                className={filters.stage === '' ? 'bg-gradient-to-r from-pcs_blue to-teal' : ''}
                data-testid="filter-all-stages"
              >
                {t('search.all_stages')}
              </Button>
              <Button
                variant={filters.stage === 'inspire' ? 'default' : 'outline'}
                onClick={() => handleFilterChange('stage', 'inspire')}
                className={filters.stage === 'inspire' ? 'bg-pcs_blue' : ''}
                data-testid="filter-inspire"
              >
                {t('stages.inspire')}
              </Button>
              <Button
                variant={filters.stage === 'investigate' ? 'default' : 'outline'}
                onClick={() => handleFilterChange('stage', 'investigate')}
                className={filters.stage === 'investigate' ? 'bg-teal' : ''}
                data-testid="filter-investigate"
              >
                {t('stages.investigate')}
              </Button>
              <Button
                variant={filters.stage === 'act' ? 'default' : 'outline'}
                onClick={() => handleFilterChange('stage', 'act')}
                className={filters.stage === 'act' ? 'bg-coral' : ''}
                data-testid="filter-act"
              >
                {t('stages.act')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resources Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-gray-200 rounded-t-lg"></div>
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-16 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Recommended Resources Section */}
            {isAuthenticated && recommended.length > 0 && (
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-3 shadow-lg">
                    <Star className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-navy">Recommended for Your School</h2>
                    <p className="text-gray-600">Resources matching your current stage: {dashboardData?.school?.currentStage}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="recommended-resources-section">
                  {recommended.map((resource) => (
                    <ResourceCard key={resource.id} resource={resource} />
                  ))}
                </div>
              </div>
            )}

            {/* All Resources Section */}
            {(others.length > 0 || !isAuthenticated) && (
              <div>
                {isAuthenticated && recommended.length > 0 && (
                  <div className="flex items-center gap-3 mb-6 mt-12">
                    <div className="bg-gradient-to-r from-pcs_blue to-teal rounded-lg p-3 shadow-lg">
                      <BookOpen className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-navy">All Resources</h2>
                      <p className="text-gray-600">Browse all available resources</p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(isAuthenticated ? others : filteredResources).map((resource) => (
                    <ResourceCard key={resource.id} resource={resource} />
                  ))}
                </div>
              </div>
            )}

            {/* Load More */}
            {resources && resources.length === limit && (
              <div className="text-center mt-12">
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setPage(prev => prev + 1)}
                  className="shadow-md hover:shadow-lg transition-shadow"
                  data-testid="button-load-more"
                >
                  {t('load_more_resources')}
                </Button>
              </div>
            )}

            {filteredResources.length === 0 && (
              <EmptyState
                icon={BookOpen}
                title={t('empty_state.title')}
                description={t('empty_state.message')}
                action={{
                  label: t('empty_state.clear_filters'),
                  onClick: () => {
                    setFilters({
                      search: '',
                      country: '',
                      language: '',
                      ageRange: '',
                      resourceType: '',
                      theme: '',
                      stage: '',
                    });
                    setSelectedLanguageTab('');
                    setPage(0);
                  },
                  variant: "outline"
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
