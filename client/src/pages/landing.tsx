import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import SchoolSignUpForm from "@/components/SchoolSignUpForm";
import { 
  School, 
  Trophy, 
  Globe, 
  Users, 
  Lightbulb, 
  Search, 
  Hand,
  ChevronRight,
  Star
} from "lucide-react";

interface SiteStats {
  totalSchools: number;
  completedAwards: number;
  countries: number;
  studentsImpacted: number;
}

export default function Landing() {
  const [showSignUp, setShowSignUp] = useState(false);

  const { data: stats } = useQuery<SiteStats>({
    queryKey: ['/api/stats'],
  });

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-pcs_blue via-navy to-teal text-white py-20 overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-yellow/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-coral/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6" data-testid="text-hero-title">
              Inspiring Schools to Go
              <span className="block text-yellow">Plastic-Free</span>
            </h1>
            <p className="text-xl md:text-2xl max-w-3xl mx-auto mb-8 opacity-90" data-testid="text-hero-subtitle">
              Join thousands of schools worldwide on a journey to reduce plastic waste through our comprehensive 3-stage program: Inspire, Investigate, and Act.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-coral hover:bg-coral/90 text-white px-8 py-4 text-lg font-semibold"
                onClick={() => setShowSignUp(true)}
                data-testid="button-join-program"
              >
                Join the Program
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white text-white hover:bg-white hover:text-navy px-8 py-4 text-lg font-semibold"
                onClick={() => scrollToSection('how-it-works')}
                data-testid="button-learn-more"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4" data-testid="text-stats-title">
              Our Global Impact
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Real-time statistics from our growing community of environmentally conscious schools
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="bg-pcs_blue text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <School className="h-8 w-8" />
                </div>
                <div className="text-3xl font-bold text-navy mb-2" data-testid="stat-total-schools">
                  {stats?.totalSchools?.toLocaleString() || '0'}
                </div>
                <div className="text-gray-600">Schools Enrolled</div>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="bg-teal text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="h-8 w-8" />
                </div>
                <div className="text-3xl font-bold text-navy mb-2" data-testid="stat-completed-awards">
                  {stats?.completedAwards?.toLocaleString() || '0'}
                </div>
                <div className="text-gray-600">Awards Completed</div>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="bg-yellow text-black w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="h-8 w-8" />
                </div>
                <div className="text-3xl font-bold text-navy mb-2" data-testid="stat-countries">
                  {stats?.countries?.toLocaleString() || '0'}
                </div>
                <div className="text-gray-600">Countries</div>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="bg-coral text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8" />
                </div>
                <div className="text-3xl font-bold text-navy mb-2" data-testid="stat-students">
                  {stats?.studentsImpacted?.toLocaleString() || '0'}
                </div>
                <div className="text-gray-600">Students Engaged</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4" data-testid="text-how-it-works-title">
              Three Stages to Environmental Action
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Our comprehensive program guides schools through a transformative journey
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Stage 1: Inspire */}
            <Card className="bg-gradient-to-br from-pcs_blue to-teal text-white p-8 hover:shadow-xl transition-shadow">
              <CardContent className="p-0">
                <div className="text-center mb-6">
                  <div className="bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lightbulb className="h-10 w-10" />
                  </div>
                  <h3 className="text-2xl font-bold">Stage 1: Inspire</h3>
                  <p className="text-white/90 mt-2">Build awareness and motivation</p>
                </div>
                <ul className="space-y-3 text-white/90">
                  <li className="flex items-center">
                    <Star className="h-4 w-4 mr-3 flex-shrink-0" />
                    Learn about plastic pollution impact
                  </li>
                  <li className="flex items-center">
                    <Star className="h-4 w-4 mr-3 flex-shrink-0" />
                    Engage with multimedia resources
                  </li>
                  <li className="flex items-center">
                    <Star className="h-4 w-4 mr-3 flex-shrink-0" />
                    Host awareness assemblies
                  </li>
                  <li className="flex items-center">
                    <Star className="h-4 w-4 mr-3 flex-shrink-0" />
                    Submit evidence of engagement
                  </li>
                </ul>
              </CardContent>
            </Card>
            
            {/* Stage 2: Investigate */}
            <Card className="bg-gradient-to-br from-yellow to-coral text-black p-8 hover:shadow-xl transition-shadow">
              <CardContent className="p-0">
                <div className="text-center mb-6">
                  <div className="bg-black/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="h-10 w-10" />
                  </div>
                  <h3 className="text-2xl font-bold">Stage 2: Investigate</h3>
                  <p className="text-black/80 mt-2">Research and analyze</p>
                </div>
                <ul className="space-y-3 text-black/80">
                  <li className="flex items-center">
                    <Star className="h-4 w-4 mr-3 flex-shrink-0" />
                    Conduct plastic waste audits
                  </li>
                  <li className="flex items-center">
                    <Star className="h-4 w-4 mr-3 flex-shrink-0" />
                    Analyze consumption patterns
                  </li>
                  <li className="flex items-center">
                    <Star className="h-4 w-4 mr-3 flex-shrink-0" />
                    Research local solutions
                  </li>
                  <li className="flex items-center">
                    <Star className="h-4 w-4 mr-3 flex-shrink-0" />
                    Document findings and insights
                  </li>
                </ul>
              </CardContent>
            </Card>
            
            {/* Stage 3: Act */}
            <Card className="bg-gradient-to-br from-navy to-pcs_blue text-white p-8 hover:shadow-xl transition-shadow">
              <CardContent className="p-0">
                <div className="text-center mb-6">
                  <div className="bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Hand className="h-10 w-10" />
                  </div>
                  <h3 className="text-2xl font-bold">Stage 3: Act</h3>
                  <p className="text-white/90 mt-2">Create lasting change</p>
                </div>
                <ul className="space-y-3 text-white/90">
                  <li className="flex items-center">
                    <Star className="h-4 w-4 mr-3 flex-shrink-0" />
                    Implement reduction strategies
                  </li>
                  <li className="flex items-center">
                    <Star className="h-4 w-4 mr-3 flex-shrink-0" />
                    Launch awareness campaigns
                  </li>
                  <li className="flex items-center">
                    <Star className="h-4 w-4 mr-3 flex-shrink-0" />
                    Engage the community
                  </li>
                  <li className="flex items-center">
                    <Star className="h-4 w-4 mr-3 flex-shrink-0" />
                    Share success stories
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-16 bg-gradient-to-r from-navy to-pcs_blue text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6" data-testid="text-cta-title">
            Ready to Make a Difference?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join the global movement of schools creating positive environmental change
          </p>
          <Button 
            size="lg" 
            className="bg-coral hover:bg-coral/90 text-white px-8 py-4 text-lg font-semibold"
            onClick={() => setShowSignUp(true)}
            data-testid="button-get-started"
          >
            Get Started Today
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy text-white py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="text-2xl font-bold text-white mb-4">
                🌱 Plastic Clever Schools
              </div>
              <p className="text-gray-300 text-sm">
                Empowering schools worldwide to create plastic-free environments through education, investigation, and action.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Program</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><a href="#" className="hover:text-yellow transition-colors">How It Works</a></li>
                <li><a href="#" className="hover:text-yellow transition-colors">Resources</a></li>
                <li><a href="#" className="hover:text-yellow transition-colors">Success Stories</a></li>
                <li><a href="#" className="hover:text-yellow transition-colors">Award Criteria</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><a href="#" className="hover:text-yellow transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-yellow transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-yellow transition-colors">Community Forum</a></li>
                <li><a href="#" className="hover:text-yellow transition-colors">Training Webinars</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><a href="#" className="hover:text-yellow transition-colors">Newsletter</a></li>
                <li><a href="#" className="hover:text-yellow transition-colors">Social Media</a></li>
                <li><a href="#" className="hover:text-yellow transition-colors">Partner Schools</a></li>
                <li><a href="#" className="hover:text-yellow transition-colors">Events</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>
              &copy; 2024 Plastic Clever Schools. All rights reserved. | 
              <a href="#" className="hover:text-yellow transition-colors ml-1">Privacy Policy</a> | 
              <a href="#" className="hover:text-yellow transition-colors ml-1">Terms of Service</a>
            </p>
          </div>
        </div>
      </footer>

      {/* Sign Up Modal */}
      {showSignUp && (
        <SchoolSignUpForm onClose={() => setShowSignUp(false)} />
      )}
    </div>
  );
}
