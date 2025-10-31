import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MapPin, School, Award, Globe } from "lucide-react";
import { useCountries } from "@/hooks/useCountries";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Footer } from "@/components/Footer";

interface CountryData {
  countryCode: string;
  countryName: string;
  totalSchools: number;
  completedAwards: number;
  featuredSchools: number;
}

interface CountryProperties {
  name: string;
  iso_a2: string;
  [key: string]: any;
}

// Color scale function - navy-tinted sequential scale
function getColorForSchoolCount(count: number, maxCount: number): string {
  if (count === 0 || maxCount === 0) return '#f0f4f8'; // very light gray for no schools
  
  const ratio = count / maxCount;
  
  // Navy-tinted sequential scale (light to dark blue/navy)
  if (ratio < 0.2) return '#DBEAFE'; // very light blue
  if (ratio < 0.4) return '#93C5FD'; // light blue
  if (ratio < 0.6) return '#3B82F6'; // medium blue
  if (ratio < 0.8) return '#1E40AF'; // dark blue
  return '#1E3A8A'; // navy (darkest)
}

export default function SchoolsMap() {
  const [selectedCountry, setSelectedCountry] = useState('');
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [countryDataMap, setCountryDataMap] = useState<Map<string, CountryData>>(new Map());

  // Handle country selection with "all" conversion
  const handleCountryChange = (value: string) => {
    const actualValue = value === 'all' ? '' : value;
    setSelectedCountry(actualValue);
  };


  const { data: countryOptions = [], isLoading: isLoadingCountries } = useCountries();

  // Fetch country summary data
  const { data: countryCounts, isLoading } = useQuery<CountryData[]>({
    queryKey: ['/api/schools/map/summary', selectedCountry],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCountry) {
        params.set('country', selectedCountry);
      }
      
      const response = await fetch(`/api/schools/map/summary?${params}`);
      if (!response.ok) throw new Error('Failed to fetch school counts');
      return response.json();
    },
  });

  // Load GeoJSON country boundaries
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
      .then(res => res.json())
      .then(data => {
        setGeoJsonData(data);
      })
      .catch(err => console.error('Failed to load GeoJSON:', err));
  }, []);

  // Build country data map for quick lookup
  useEffect(() => {
    if (countryCounts) {
      const map = new Map<string, CountryData>();
      countryCounts.forEach(country => {
        map.set(country.countryCode, country);
        map.set(country.countryName, country);
      });
      setCountryDataMap(map);
    }
  }, [countryCounts]);

  // Calculate max count for color scaling
  const maxCount = countryCounts ? Math.max(...countryCounts.map(c => c.totalSchools), 1) : 1;

  // Style function for GeoJSON countries
  const styleCountry = (feature: any) => {
    const countryName = feature.properties.ADMIN || feature.properties.name;
    const iso_a2 = feature.properties.ISO_A2 || feature.properties.iso_a2;
    
    // Try to find country data by ISO code or name
    const countryData = countryDataMap.get(iso_a2) || countryDataMap.get(countryName);
    const schoolCount = countryData?.totalSchools || 0;
    
    return {
      fillColor: getColorForSchoolCount(schoolCount, maxCount),
      weight: 1,
      opacity: 1,
      color: '#cbd5e1',
      fillOpacity: 0.7
    };
  };

  // Highlight country on hover
  const onEachCountry = (feature: any, layer: L.Layer) => {
    const countryName = feature.properties.ADMIN || feature.properties.name;
    const iso_a2 = feature.properties.ISO_A2 || feature.properties.iso_a2;
    const countryData = countryDataMap.get(iso_a2) || countryDataMap.get(countryName);
    
    if (countryData) {
      const popupContent = `
        <div style="font-family: sans-serif;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">${countryData.countryName}</h3>
          <div style="font-size: 14px; color: #4b5563;">
            <div style="margin: 4px 0;"><strong>Total schools:</strong> ${countryData.totalSchools}</div>
            <div style="margin: 4px 0;"><strong>Awards completed:</strong> ${countryData.completedAwards}</div>
            <div style="margin: 4px 0;"><strong>Featured schools:</strong> ${countryData.featuredSchools}</div>
          </div>
        </div>
      `;
      
      layer.bindPopup(popupContent);
      
      layer.on({
        mouseover: (e) => {
          const layer = e.target;
          layer.setStyle({
            weight: 2,
            color: '#1e3a8a',
            fillOpacity: 0.9
          });
        },
        mouseout: (e) => {
          const layer = e.target;
          layer.setStyle({
            weight: 1,
            color: '#cbd5e1',
            fillOpacity: 0.7
          });
        }
      });
    }
  };

  // Calculate total stats
  const totalStats = countryCounts ? {
    total: countryCounts.reduce((sum, c) => sum + c.totalSchools, 0),
    completed: countryCounts.reduce((sum, c) => sum + c.completedAwards, 0),
    countries: countryCounts.length,
    featured: countryCounts.reduce((sum, c) => sum + c.featuredSchools, 0),
  } : { total: 0, completed: 0, countries: 0, featured: 0 };

  return (
    <div className="min-h-screen bg-gray-50 pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-navy mb-4" data-testid="text-map-title">
            Global school network
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Countries colored by number of participating schools in the Plastic Clever Schools program
          </p>
        </div>

        {/* Map Controls */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-6">
                <div className="text-sm text-gray-600 font-medium">School count:</div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#DBEAFE' }}></div>
                  <span className="text-sm text-gray-600">Low</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#3B82F6' }}></div>
                  <span className="text-sm text-gray-600">Medium</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#1E40AF' }}></div>
                  <span className="text-sm text-gray-600">High</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#1E3A8A' }}></div>
                  <span className="text-sm text-gray-600">Very high</span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Select value={selectedCountry || 'all'} onValueChange={handleCountryChange}>
                  <SelectTrigger className="w-48" data-testid="select-country-filter">
                    <SelectValue placeholder="All countries" />
                  </SelectTrigger>
                  <SelectContent>
                    {countryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  .leaflet-popup-content-wrapper {
                    border-radius: 8px;
                  }
                `
              }} />
              {isLoading || !geoJsonData ? (
                <div className="h-full flex items-center justify-center bg-gray-100">
                  <div className="text-center">
                    <Globe className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600">Loading map...</p>
                  </div>
                </div>
              ) : (
                <MapContainer
                  center={[20, 0]}
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
                  
                  {/* Choropleth Layer */}
                  {geoJsonData && (
                    <GeoJSON
                      key={Array.from(countryDataMap.values()).map(c => `${c.countryCode}:${c.totalSchools}`).join('|')}
                      data={geoJsonData}
                      style={styleCountry}
                      onEachFeature={onEachCountry}
                    />
                  )}
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
              <div className="text-gray-600 text-sm">Total schools</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-navy" data-testid="stat-completed-awards">
                {totalStats.completed}
              </div>
              <div className="text-gray-600 text-sm">Awards completed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-navy" data-testid="stat-featured">
                {totalStats.featured}
              </div>
              <div className="text-gray-600 text-sm">Featured schools</div>
            </CardContent>
          </Card>
        </div>

        {/* Regional Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-navy">Country breakdown</CardTitle>
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
                {countryCounts && countryCounts.length > 0 ? (
                  countryCounts
                    .sort((a, b) => b.totalSchools - a.totalSchools)
                    .map((country) => (
                      <div key={country.countryCode} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 rounded-lg gap-3">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: getColorForSchoolCount(country.totalSchools, maxCount) }}
                          />
                          <span className="font-medium text-navy">{country.countryName}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-gray-600 ml-8 sm:ml-0">
                          <div className="flex items-center gap-1.5">
                            <School className="h-4 w-4 sm:h-3 sm:w-3 flex-shrink-0" />
                            <span>{country.totalSchools} schools</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Award className="h-4 w-4 sm:h-3 sm:w-3 flex-shrink-0" />
                            <span>{country.completedAwards} completed</span>
                          </div>
                          {country.featuredSchools > 0 && (
                            <Badge variant="outline" className="text-yellow border-yellow">
                              {country.featuredSchools} featured
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No schools found for the selected filters
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
