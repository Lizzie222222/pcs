import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Download, Filter, BookOpen, FileText, Video, Image } from "lucide-react";
import { useCountries } from "@/hooks/useCountries";
import { EmptyState } from "@/components/ui/states";

interface Resource {
  id: string;
  title: string;
  description: string;
  stage: 'inspire' | 'investigate' | 'act';
  ageRange: string;
  language: string;
  country: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  downloadCount: number;
}

export default function Resources() {
  const { t, i18n } = useTranslation('resources');
  const [filters, setFilters] = useState({
    search: '',
    country: '',
    language: '',
    ageRange: '',
    stage: '',
  });
  const [page, setPage] = useState(0);
  const limit = 12;

  const { data: countryOptions = [], isLoading: isLoadingCountries } = useCountries();

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
    return `${formattedNumber} ${t(`units.${sizes[i]}`)}`;  };

  const handleDownload = async (resourceId: string, fileUrl: string, title: string) => {
    try {
      // Track download
      await fetch(`/api/resources/${resourceId}/download`, { method: 'GET' });
      
      // Trigger download
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-navy mb-4" data-testid="text-resources-title">
            {t('page.title')}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t('page.subtitle')}
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {t('search.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
              <div className="md:col-span-2">
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
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filters.stage === '' ? 'default' : 'outline'}
                onClick={() => handleFilterChange('stage', '')}
                data-testid="filter-all-stages"
              >
                {t('search.all_stages')}
              </Button>
              <Button
                variant={filters.stage === 'inspire' ? 'default' : 'outline'}
                onClick={() => handleFilterChange('stage', 'inspire')}
                data-testid="filter-inspire"
              >
                {t('stages.inspire')}
              </Button>
              <Button
                variant={filters.stage === 'investigate' ? 'default' : 'outline'}
                onClick={() => handleFilterChange('stage', 'investigate')}
                data-testid="filter-investigate"
              >
                {t('stages.investigate')}
              </Button>
              <Button
                variant={filters.stage === 'act' ? 'default' : 'outline'}
                onClick={() => handleFilterChange('stage', 'act')}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resources?.map((resource) => (
                <Card key={resource.id} className="card-interactive" data-testid={`resource-${resource.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={getStageColor(resource.stage)}>
                        {t(`stages.${resource.stage}`)}
                      </Badge>
                      <Badge variant="outline">
                        {getAgeRangeLabel(resource.ageRange)}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg text-navy line-clamp-2">
                      {resource.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {resource.description}
                    </p>
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <div className="flex items-center gap-1">
                        {getFileIcon(resource.fileType)}
                        <span>{resource.language}</span>
                      </div>
                      <span>{formatFileSize(resource.fileSize || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        {t('resource_card.download_count', { count: resource.downloadCount })}
                      </span>
                      <Button
                        size="sm"
                        className="bg-coral hover:bg-coral/90 btn-animate"
                        onClick={() => handleDownload(resource.id, resource.fileUrl, resource.title)}
                        data-testid={`button-download-${resource.id}`}
                      >
                        <Download className="h-4 w-4 mr-1 icon-interactive" />
                        {t('resource_card.download_resource')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Load More */}
            {resources && resources.length === limit && (
              <div className="text-center mt-12">
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setPage(prev => prev + 1)}
                  data-testid="button-load-more"
                >
                  {t('load_more_resources')}
                </Button>
              </div>
            )}

            {resources && resources.length === 0 && (
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
                      stage: '',
                    });
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
