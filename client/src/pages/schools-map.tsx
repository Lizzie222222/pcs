import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, School, Award, Globe, Download } from "lucide-react";
import { useCountries } from "@/hooks/useCountries";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default markers in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons for different school statuses
const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

interface SchoolMapData {
  id: string;
  name: string;
  country: string;
  latitude: string;
  longitude: string;
  currentStage: 'inspire' | 'investigate' | 'act';
  awardCompleted: boolean;
  featuredSchool: boolean;
}

export default function SchoolsMap() {
  const [selectedCountry, setSelectedCountry] = useState('');

  // Handle country selection with "all" conversion
  const handleCountryChange = (value: string) => {
    // Convert "all" to empty string to show all countries
    const actualValue = value === 'all' ? '' : value;
    setSelectedCountry(actualValue);
  };

  const { data: countryOptions = [], isLoading: isLoadingCountries } = useCountries();

  const { data: schools, isLoading } = useQuery<SchoolMapData[]>({
    queryKey: ['/api/schools/map', selectedCountry],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCountry) {
        params.set('country', selectedCountry);
      }
      
      const response = await fetch(`/api/schools/map?${params}`);
      if (!response.ok) throw new Error('Failed to fetch schools');
      return response.json();
    },
  });

  const getStageColor = (stage: string, completed: boolean) => {
    if (completed) return 'bg-green-500';
    switch (stage) {
      case 'inspire': return 'bg-pcs_blue';
      case 'investigate': return 'bg-teal';
      case 'act': return 'bg-coral';
      default: return 'bg-gray-500';
    }
  };

  const getRegionStats = () => {
    if (!schools) return [];
    
    const regionStats = schools.reduce((acc, school) => {
      const region = school.country;
      if (!acc[region]) {
        acc[region] = {
          name: region,
          total: 0,
          completed: 0,
          featured: 0,
        };
      }
      acc[region].total++;
      if (school.awardCompleted) acc[region].completed++;
      if (school.featuredSchool) acc[region].featured++;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(regionStats);
  };

  const totalStats = schools ? {
    total: schools.length,
    completed: schools.filter(s => s.awardCompleted).length,
    countries: new Set(schools.map(s => s.country)).size,
    featured: schools.filter(s => s.featuredSchool).length,
  } : { total: 0, completed: 0, countries: 0, featured: 0 };

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-navy mb-4" data-testid="text-map-title">
            Global School Network
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Explore the worldwide community of schools participating in the Plastic Clever Schools program
          </p>
        </div>

        {/* Map Controls */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-6">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-pcs_blue rounded-full"></div>
                  <span className="text-sm text-gray-600">In Progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Award Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow rounded-full"></div>
                  <span className="text-sm text-gray-600">Featured Schools</span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Select value={selectedCountry} onValueChange={handleCountryChange}>
                  <SelectTrigger className="w-48" data-testid="select-country-filter">
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
                <Button variant="outline" data-testid="button-export-data">
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interactive Map Container */}
        <Card className="mb-8">
          <CardContent className="p-0">
            <div className="h-[500px] rounded-lg overflow-hidden" data-testid="interactive-map-container">
              <style dangerouslySetInnerHTML={{
                __html: `
                  .map-tiles {
                    filter: grayscale(100%) brightness(0.9) contrast(1.2);
                  }
                  .leaflet-container {
                    background-color: #f5f5f5 !important;
                  }
                  .custom-div-icon div {
                    box-shadow: 0 3px 8px rgba(0,0,0,0.4) !important;
                    border: 3px solid white !important;
                    width: 14px !important;
                    height: 14px !important;
                  }
                `
              }} />
              {isLoading ? (
                <div className="h-full flex items-center justify-center bg-gray-100">
                  <div className="text-center">
                    <Globe className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600">Loading map...</p>
                  </div>
                </div>
              ) : (
                <MapContainer
                  center={[20, 0]} // Center on world view
                  zoom={2}
                  style={{ height: '100%', width: '100%' }}
                  data-testid="leaflet-map"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
                    className="map-tiles"
                  />
                  
                  {schools && schools.map((school) => {
                    const lat = parseFloat(school.latitude);
                    const lng = parseFloat(school.longitude);
                    
                    // Skip invalid coordinates
                    if (isNaN(lat) || isNaN(lng)) return null;
                    
                    const markerColor = school.featuredSchool 
                      ? '#f59e0b' // bright amber/yellow
                      : school.awardCompleted 
                      ? '#059669' // vibrant green
                      : school.currentStage === 'inspire' 
                      ? '#1d4ed8' // bright blue
                      : school.currentStage === 'investigate'
                      ? '#0891b2' // bright cyan
                      : '#dc2626'; // bright red for act
                    
                    return (
                      <Marker
                        key={school.id}
                        position={[lat, lng]}
                        icon={createCustomIcon(markerColor)}
                        data-testid={`map-marker-${school.id}`}
                      >
                        <Popup>
                          <div className="min-w-48">
                            <div className="font-semibold text-navy mb-1">{school.name}</div>
                            <div className="text-sm text-gray-600 mb-2">{school.country}</div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                className={`text-xs ${
                                  school.awardCompleted 
                                    ? 'bg-green-100 text-green-800' 
                                    : school.currentStage === 'inspire'
                                    ? 'bg-blue-100 text-blue-800'
                                    : school.currentStage === 'investigate'
                                    ? 'bg-teal-100 text-teal-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {school.awardCompleted ? 'Completed' : school.currentStage}
                              </Badge>
                              {school.featuredSchool && (
                                <Badge className="text-xs bg-yellow-100 text-yellow-800">
                                  Featured
                                </Badge>
                              )}
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-navy" data-testid="stat-countries">
                {totalStats.countries}
              </div>
              <div className="text-gray-600 text-sm">Countries</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-navy" data-testid="stat-total-schools">
                {totalStats.total}
              </div>
              <div className="text-gray-600 text-sm">Total Schools</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-navy" data-testid="stat-completed-awards">
                {totalStats.completed}
              </div>
              <div className="text-gray-600 text-sm">Awards Completed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-navy" data-testid="stat-featured">
                {totalStats.featured}
              </div>
              <div className="text-gray-600 text-sm">Featured Schools</div>
            </CardContent>
          </Card>
        </div>

        {/* Regional Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-navy">Regional Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-gray-100 rounded-lg animate-pulse">
                    <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-300 rounded w-1/6"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {getRegionStats().map((region: any) => (
                  <div key={region.name} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 rounded-lg gap-3">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                      <span className="font-medium text-navy">{region.name}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-gray-600 ml-8 sm:ml-0">
                      <div className="flex items-center gap-1.5">
                        <School className="h-4 w-4 sm:h-3 sm:w-3 flex-shrink-0" />
                        <span>{region.total} schools</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Award className="h-4 w-4 sm:h-3 sm:w-3 flex-shrink-0" />
                        <span>{region.completed} completed</span>
                      </div>
                      {region.featured > 0 && (
                        <Badge variant="outline" className="text-yellow border-yellow">
                          {region.featured} featured
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
