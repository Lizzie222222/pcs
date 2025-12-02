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
}

interface CountryProperties {
  name: string;
  iso_a2: string;
  [key: string]: any;
}

// Color scale function - uses absolute thresholds to prevent countries with few schools from washing out
// Uses a stepped scale based on actual school counts rather than ratio to max
function getColorForSchoolCount(count: number, maxCount: number): string {
  if (count === 0) return '#f0f4f8'; // very light gray for no schools
  
  // Use absolute thresholds so countries with fewer schools still show visible colors
  // This prevents one country with many schools from washing out all others
  if (count === 1) return '#BAE6FD'; // sky blue for 1 school
  if (count <= 3) return '#7DD3FC'; // light sky blue for 2-3 schools
  if (count <= 10) return '#38BDF8'; // sky-400 for 4-10 schools
  if (count <= 25) return '#0EA5E9'; // sky-500 for 11-25 schools
  if (count <= 50) return '#0284C7'; // sky-600 for 26-50 schools
  if (count <= 100) return '#0369A1'; // sky-700 for 51-100 schools
  if (count <= 200) return '#1E40AF'; // dark blue for 101-200 schools
  return '#1E3A8A'; // navy (darkest) for 200+ schools
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
            <div style="margin: 4px 0;"><strong>Schools with awards:</strong> ${countryData.completedAwards}</div>
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
  } : { total: 0, completed: 0, countries: 0 };

  return (
    <div className="min-h-screen bg-gray-50 pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-navy mb-4" data-testid="text-map-title">
            Global school network
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Countries colored by number of participating schools in the Plastic Clever Schools programme
          </p>
        </div>

        {/* Map Controls */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center flex-wrap gap-x-4 gap-y-2">
                <div className="text-sm text-gray-600 font-medium">Schools:</div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#BAE6FD' }}></div>
                  <span className="text-xs text-gray-600">1</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#7DD3FC' }}></div>
                  <span className="text-xs text-gray-600">2-3</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#38BDF8' }}></div>
                  <span className="text-xs text-gray-600">4-10</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#0EA5E9' }}></div>
                  <span className="text-xs text-gray-600">11-25</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#0284C7' }}></div>
                  <span className="text-xs text-gray-600">26-50</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#0369A1' }}></div>
                  <span className="text-xs text-gray-600">51-100</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#1E40AF' }}></div>
                  <span className="text-xs text-gray-600">101-200</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#1E3A8A' }}></div>
                  <span className="text-xs text-gray-600">200+</span>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
              <div className="text-gray-600 text-sm">Schools with awards</div>
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
                            <span>{country.completedAwards} with awards</span>
                          </div>
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
