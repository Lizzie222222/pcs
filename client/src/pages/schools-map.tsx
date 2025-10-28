import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, School, Award, Globe, Download } from "lucide-react";
import { useCountries } from "@/hooks/useCountries";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { Footer } from "@/components/Footer";

// Heat Map Component
function HeatMapLayer({ schools }: { schools: SchoolMapData[] }) {
  const map = useMap();

  useEffect(() => {
    if (!schools || schools.length === 0) return;

    // Convert schools to heat map points with valid coordinates
    const heatPoints: [number, number, number][] = schools
      .filter(school => {
        const lat = parseFloat(school.latitude);
        const lng = parseFloat(school.longitude);
        return !isNaN(lat) && !isNaN(lng);
      })
      .map(school => {
        const lat = parseFloat(school.latitude);
        const lng = parseFloat(school.longitude);
        // Intensity based on school features (higher for featured/completed schools)
        const intensity = school.featuredSchool ? 1.5 : school.awardCompleted ? 1.2 : 1.0;
        return [lat, lng, intensity];
      });

    if (heatPoints.length === 0) return;

    // Create heat layer with Leaflet Heat - privacy-preserving configuration
    const heatLayer = (L as any).heatLayer(heatPoints, {
      radius: 35,
      blur: 45,
      maxZoom: 7,
      max: 1.5,
      gradient: {
        0.0: '#3B82F6',  // blue - low density
        0.4: '#10B981',  // green - medium-low density
        0.6: '#F59E0B',  // amber/yellow - medium-high density
        1.0: '#EF4444',  // red - high density
      }
    });

    heatLayer.addTo(map);

    // Cleanup
    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, schools]);

  return null;
}

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-navy mb-4" data-testid="text-map-title">
            Global School Network
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            View regional activity density of schools participating in the Plastic Clever Schools program
          </p>
        </div>

        {/* Map Controls */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-6">
                <div className="text-sm text-gray-600 font-medium">Activity Density:</div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Low</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Medium</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">High</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Very High</span>
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
                  minZoom={2}
                  maxZoom={7}
                  style={{ height: '100%', width: '100%' }}
                  data-testid="leaflet-map"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
                    className="map-tiles"
                  />
                  
                  {/* Heat Map Layer - Privacy-preserving visualization */}
                  {schools && schools.length > 0 && <HeatMapLayer schools={schools} />}
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

      <Footer />
    </div>
  );
}
