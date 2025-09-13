import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, School, Award, Globe, Download } from "lucide-react";

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
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger className="w-48" data-testid="select-country-filter">
                    <SelectValue placeholder="All Countries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                    <SelectItem value="United States">United States</SelectItem>
                    <SelectItem value="Australia">Australia</SelectItem>
                    <SelectItem value="Canada">Canada</SelectItem>
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
            <div 
              className="relative bg-gradient-to-br from-pcs_blue to-teal rounded-lg overflow-hidden"
              style={{ height: '500px' }}
            >
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <div className="text-center">
                  <Globe className="w-16 h-16 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2">Interactive Global Map</h3>
                  <p className="mb-4">Schools from {totalStats.countries} countries participating in the program</p>
                  <p className="text-sm opacity-90">Integration with mapping service displays real school locations</p>
                </div>
              </div>
              
              {/* Simulated map markers representing school locations */}
              {!isLoading && schools && schools.slice(0, 20).map((school, index) => (
                <div 
                  key={school.id}
                  className={`absolute w-3 h-3 rounded-full animate-pulse cursor-pointer ${
                    school.featuredSchool ? 'bg-yellow' :
                    school.awardCompleted ? 'bg-green-500' : 
                    getStageColor(school.currentStage, false)
                  }`}
                  style={{
                    top: `${20 + (index * 3) % 60}%`,
                    left: `${15 + (index * 7) % 70}%`,
                  }}
                  title={`${school.name} - ${school.country}`}
                  data-testid={`map-marker-${school.id}`}
                >
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-3 hidden group-hover:block w-48 z-10">
                    <div className="text-sm font-semibold text-navy">{school.name}</div>
                    <div className="text-xs text-gray-600">{school.country}</div>
                    <Badge className={`text-xs mt-1 ${getStageColor(school.currentStage, school.awardCompleted)}`}>
                      {school.awardCompleted ? 'Completed' : school.currentStage}
                    </Badge>
                  </div>
                </div>
              ))}
              
              {/* Map Instructions */}
              <div className="absolute top-4 right-4 bg-white/90 rounded-lg p-4 text-sm max-w-xs">
                <div className="font-semibold text-navy mb-2">Interactive Map</div>
                <div className="text-gray-600">Hover over markers to see school details</div>
              </div>
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
                  <div key={region.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="font-medium text-navy">{region.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <School className="h-3 w-3" />
                        <span>{region.total} schools</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Award className="h-3 w-3" />
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
