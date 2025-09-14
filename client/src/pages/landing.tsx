import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import SchoolSignUpForm from "@/components/SchoolSignUpForm";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { 
  School, 
  Trophy, 
  Globe, 
  Users, 
  Lightbulb, 
  Search, 
  Hand,
  ChevronRight,
  Star,
  ArrowRight,
  CheckCircle,
  Award,
  Heart,
  Leaf,
  Recycle,
  Target,
  BookOpen,
  Play
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
    <div className="min-h-screen bg-white">
      {/* Modern Split Hero Section */}
      <section className="relative bg-white py-24 lg:py-32 overflow-hidden">
        {/* Subtle background accent */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-gray-50 to-transparent opacity-60"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="text-left">
              {/* Trust badge */}
              <div className="flex items-center gap-3 mb-6">
                <Badge variant="outline" className="px-4 py-2 border-pcs_blue text-pcs_blue bg-pcs_blue/5">
                  <Award className="h-4 w-4 mr-2" />
                  Award-Winning Program
                </Badge>
                <div className="flex items-center gap-1 text-yellow">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
              </div>

              <h1 className="text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.1] text-navy mb-8" data-testid="text-hero-title">
                Transform Your School Into a 
                <span className="text-transparent bg-gradient-to-r from-pcs_blue to-teal bg-clip-text"> Plastic-Free</span> 
                <span className="block">Champion</span>
              </h1>
              
              <p className="text-xl lg:text-2xl text-gray-600 mb-8 leading-relaxed max-w-xl" data-testid="text-hero-subtitle">
                Join <strong className="text-navy">{stats?.totalSchools?.toLocaleString() || '1,000+'}</strong> schools worldwide creating lasting environmental change through our proven 3-stage program.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-10">
                <Button 
                  size="lg" 
                  className="bg-coral hover:bg-coral/90 text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                  onClick={() => setShowSignUp(true)}
                  data-testid="button-join-program"
                >
                  Join Free Today
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-2 border-navy text-navy hover:bg-navy hover:text-white px-8 py-4 text-lg font-semibold transition-all duration-200"
                  onClick={() => scrollToSection('how-it-works')}
                  data-testid="button-learn-more"
                >
                  <Play className="mr-2 h-5 w-5" />
                  Watch Demo
                </Button>
              </div>

              {/* Trust indicators */}
              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-teal" />
                  100% Free Program
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-teal" />
                  Curriculum Aligned
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-teal" />
                  Expert Support
                </div>
              </div>
            </div>

            {/* Right Visual Element */}
            <div className="relative lg:pl-8">
              <div className="relative bg-gradient-to-br from-pcs_blue/5 to-teal/5 rounded-3xl p-8 overflow-hidden">
                {/* Floating elements for visual interest */}
                <div className="absolute top-4 right-4 w-20 h-20 bg-yellow/20 rounded-full blur-xl"></div>
                <div className="absolute bottom-4 left-4 w-32 h-32 bg-coral/10 rounded-full blur-2xl"></div>
                
                {/* Central content */}
                <div className="relative z-10 text-center py-12">
                  <div className="w-24 h-24 bg-gradient-to-br from-pcs_blue to-teal rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <Leaf className="h-12 w-12 text-white" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-navy mb-4">Ready to Start?</h3>
                  <p className="text-gray-600 mb-6">Join our global community making real environmental impact</p>
                  
                  {/* Quick stats */}
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-white/70 rounded-xl p-4 backdrop-blur-sm">
                      <div className="text-2xl font-bold text-pcs_blue">{typeof stats?.countries === 'number' ? `${stats.countries}+` : '30+'}</div>
                      <div className="text-sm text-gray-600">Countries</div>
                    </div>
                    <div className="bg-white/70 rounded-xl p-4 backdrop-blur-sm">
                      <div className="text-2xl font-bold text-teal">{stats?.studentsImpacted?.toLocaleString() || '50K+'}</div>
                      <div className="text-sm text-gray-600">Students</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Clean KPI Strip */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-navy mb-6" data-testid="text-stats-title">
              Trusted by Schools Worldwide
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Join a global movement that's creating measurable environmental impact through education
            </p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-pcs_blue to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-105 transition-transform duration-200">
                <School className="h-10 w-10 text-white" />
              </div>
              <div className="text-4xl lg:text-5xl font-bold text-navy mb-2" data-testid="stat-total-schools">
                {stats?.totalSchools?.toLocaleString() || '1,200+'}
              </div>
              <div className="text-gray-600 font-medium">Schools Enrolled</div>
            </div>
            
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-teal to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-105 transition-transform duration-200">
                <Trophy className="h-10 w-10 text-white" />
              </div>
              <div className="text-4xl lg:text-5xl font-bold text-navy mb-2" data-testid="stat-completed-awards">
                {stats?.completedAwards?.toLocaleString() || '450+'}
              </div>
              <div className="text-gray-600 font-medium">Awards Earned</div>
            </div>
            
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-yellow to-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-105 transition-transform duration-200">
                <Globe className="h-10 w-10 text-white" />
              </div>
              <div className="text-4xl lg:text-5xl font-bold text-navy mb-2" data-testid="stat-countries">
                {typeof stats?.countries === 'number' ? `${stats.countries}+` : '32+'}
              </div>
              <div className="text-gray-600 font-medium">Countries</div>
            </div>
            
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-coral to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-105 transition-transform duration-200">
                <Users className="h-10 w-10 text-white" />
              </div>
              <div className="text-4xl lg:text-5xl font-bold text-navy mb-2" data-testid="stat-students">
                {stats?.studentsImpacted?.toLocaleString() || '75K+'}
              </div>
              <div className="text-gray-600 font-medium">Students Impacted</div>
            </div>
          </div>
        </div>
      </section>

      {/* Modern How It Works Section */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold text-navy mb-6" data-testid="text-how-it-works-title">
              Three Simple Steps to Impact
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our proven methodology transforms schools into environmental champions through structured, engaging activities
            </p>
          </div>
          
          {/* Horizontal Process Flow */}
          <div className="relative">
            {/* Connection line */}
            <div className="hidden lg:block absolute top-24 left-1/2 transform -translate-x-1/2 w-2/3 h-0.5 bg-gradient-to-r from-pcs_blue via-teal to-coral"></div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8">
              {/* Stage 1: Inspire */}
              <div className="relative bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 group">
                {/* Stage number */}
                <div className="absolute -top-6 left-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-pcs_blue to-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    1
                  </div>
                </div>
                
                <div className="pt-8">
                  <div className="w-16 h-16 bg-pcs_blue/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200">
                    <Lightbulb className="h-8 w-8 text-pcs_blue" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-navy mb-3">Inspire</h3>
                  <p className="text-gray-600 mb-6">Build awareness and motivation through engaging educational content</p>
                  
                  <ul className="space-y-3 text-gray-600">
                    <li className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-pcs_blue mr-3 flex-shrink-0" />
                      Interactive learning modules
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-pcs_blue mr-3 flex-shrink-0" />
                      Multimedia resources
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-pcs_blue mr-3 flex-shrink-0" />
                      School assemblies & workshops
                    </li>
                  </ul>
                </div>
              </div>
              
              {/* Stage 2: Investigate */}
              <div className="relative bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 group">
                {/* Stage number */}
                <div className="absolute -top-6 left-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-teal to-cyan-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    2
                  </div>
                </div>
                
                <div className="pt-8">
                  <div className="w-16 h-16 bg-teal/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200">
                    <Search className="h-8 w-8 text-teal" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-navy mb-3">Investigate</h3>
                  <p className="text-gray-600 mb-6">Research and analyze your school's plastic consumption patterns</p>
                  
                  <ul className="space-y-3 text-gray-600">
                    <li className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-teal mr-3 flex-shrink-0" />
                      Plastic waste audits
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-teal mr-3 flex-shrink-0" />
                      Data collection & analysis
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-teal mr-3 flex-shrink-0" />
                      Solution research
                    </li>
                  </ul>
                </div>
              </div>
              
              {/* Stage 3: Act */}
              <div className="relative bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 group">
                {/* Stage number */}
                <div className="absolute -top-6 left-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-coral to-red-500 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    3
                  </div>
                </div>
                
                <div className="pt-8">
                  <div className="w-16 h-16 bg-coral/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200">
                    <Target className="h-8 w-8 text-coral" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-navy mb-3">Act</h3>
                  <p className="text-gray-600 mb-6">Implement lasting solutions and share your success</p>
                  
                  <ul className="space-y-3 text-gray-600">
                    <li className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-coral mr-3 flex-shrink-0" />
                      Action plan implementation
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-coral mr-3 flex-shrink-0" />
                      Community engagement
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-coral mr-3 flex-shrink-0" />
                      Impact measurement & sharing
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Outcomes section */}
          <div className="mt-20 text-center">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-3xl p-12">
              <h3 className="text-3xl font-bold text-navy mb-6">Earn Recognition for Your Impact</h3>
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                Complete each stage to earn digital badges and certificates that showcase your school's environmental leadership
              </p>
              
              <div className="flex flex-wrap justify-center gap-6">
                <div className="flex items-center gap-3 bg-white rounded-full px-6 py-3 shadow-sm">
                  <div className="w-8 h-8 bg-gradient-to-br from-pcs_blue to-teal rounded-full flex items-center justify-center">
                    <Star className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-semibold text-navy">Digital Badges</span>
                </div>
                <div className="flex items-center gap-3 bg-white rounded-full px-6 py-3 shadow-sm">
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow to-amber-500 rounded-full flex items-center justify-center">
                    <Award className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-semibold text-navy">Certificates</span>
                </div>
                <div className="flex items-center gap-3 bg-white rounded-full px-6 py-3 shadow-sm">
                  <div className="w-8 h-8 bg-gradient-to-br from-coral to-red-500 rounded-full flex items-center justify-center">
                    <Heart className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-semibold text-navy">Recognition</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof - Testimonials */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-navy mb-6">
              Loved by Schools Worldwide
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              See what educators and students are saying about their Plastic Clever Schools journey
            </p>
          </div>

          <Carousel className="max-w-5xl mx-auto">
            <CarouselContent>
              <CarouselItem className="md:basis-1/2 lg:basis-1/3">
                <Card className="h-full">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-yellow text-yellow" />
                      ))}
                    </div>
                    <blockquote className="text-gray-700 mb-6 italic">
                      "Our students were completely engaged throughout the program. The structured approach made it easy to implement and the resources were fantastic!"
                    </blockquote>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-pcs_blue to-teal rounded-full flex items-center justify-center text-white font-bold">
                        SJ
                      </div>
                      <div>
                        <div className="font-semibold text-navy">Sarah Johnson</div>
                        <div className="text-gray-600 text-sm">Green Valley Primary School, UK</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>

              <CarouselItem className="md:basis-1/2 lg:basis-1/3">
                <Card className="h-full">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-yellow text-yellow" />
                      ))}
                    </div>
                    <blockquote className="text-gray-700 mb-6 italic">
                      "We've reduced our plastic waste by 60% since completing the program. The impact has been incredible and the whole school community is involved!"
                    </blockquote>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-teal to-cyan-600 rounded-full flex items-center justify-center text-white font-bold">
                        MR
                      </div>
                      <div>
                        <div className="font-semibold text-navy">Maria Rodriguez</div>
                        <div className="text-gray-600 text-sm">Sunshine Elementary, Australia</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>

              <CarouselItem className="md:basis-1/2 lg:basis-1/3">
                <Card className="h-full">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-yellow text-yellow" />
                      ))}
                    </div>
                    <blockquote className="text-gray-700 mb-6 italic">
                      "The program gave our students real agency in making environmental change. They're now passionate advocates for sustainability!"
                    </blockquote>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-yellow to-amber-500 rounded-full flex items-center justify-center text-white font-bold">
                        DK
                      </div>
                      <div>
                        <div className="font-semibold text-navy">David Kim</div>
                        <div className="text-gray-600 text-sm">Future Leaders High School, Canada</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>

              <CarouselItem className="md:basis-1/2 lg:basis-1/3">
                <Card className="h-full">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-yellow text-yellow" />
                      ))}
                    </div>
                    <blockquote className="text-gray-700 mb-6 italic">
                      "Perfect for cross-curricular learning! We integrated it into science, geography, and citizenship classes. Excellent resources and support."
                    </blockquote>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-coral to-red-500 rounded-full flex items-center justify-center text-white font-bold">
                        EP
                      </div>
                      <div>
                        <div className="font-semibold text-navy">Emma Parker</div>
                        <div className="text-gray-600 text-sm">Oakwood Academy, USA</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            </CarouselContent>
            <CarouselPrevious data-testid="button-carousel-prev" />
            <CarouselNext data-testid="button-carousel-next" />
          </Carousel>

          {/* Partner logos */}
          <div className="mt-16 text-center">
            <p className="text-gray-600 mb-8 font-medium">Trusted by educational organizations worldwide</p>
            <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
              <div className="flex items-center gap-2 text-gray-500 font-semibold">
                <Globe className="h-6 w-6" />
                UNESCO Partner
              </div>
              <div className="flex items-center gap-2 text-gray-500 font-semibold">
                <Recycle className="h-6 w-6" />
                WWF Supporter
              </div>
              <div className="flex items-center gap-2 text-gray-500 font-semibold">
                <Leaf className="h-6 w-6" />
                Green Schools Alliance
              </div>
              <div className="flex items-center gap-2 text-gray-500 font-semibold">
                <BookOpen className="h-6 w-6" />
                Education Excellence Network
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Compelling Final CTA */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-navy to-pcs_blue rounded-3xl p-12 lg:p-16 text-white text-center relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-coral/20 rounded-full blur-3xl -translate-y-32 translate-x-32"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-yellow/10 rounded-full blur-3xl translate-y-48 -translate-x-48"></div>
            
            <div className="relative z-10">
              <h2 className="text-4xl lg:text-5xl font-bold mb-6" data-testid="text-cta-title">
                Ready to Transform Your School?
              </h2>
              <p className="text-xl lg:text-2xl opacity-90 mb-10 max-w-3xl mx-auto">
                Join <strong>{stats?.totalSchools?.toLocaleString() || '1,200+'}</strong> schools creating lasting environmental change. Start your journey today - it's completely free!
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Button 
                  size="lg" 
                  className="bg-coral hover:bg-coral/90 text-white px-10 py-5 text-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                  onClick={() => setShowSignUp(true)}
                  data-testid="button-get-started"
                >
                  Start Your Journey Free
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-2 border-white text-white hover:bg-white hover:text-navy px-10 py-5 text-xl font-semibold transition-all duration-200"
                  onClick={() => scrollToSection('how-it-works')}
                  data-testid="button-learn-more-final"
                >
                  <BookOpen className="mr-3 h-6 w-6" />
                  Explore Resources
                </Button>
              </div>

              <div className="flex flex-wrap justify-center gap-8 text-white/80 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-yellow" />
                  No credit card required
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-yellow" />
                  Setup in under 10 minutes
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-yellow" />
                  Expert support included
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <NewsletterSignup 
            variant="hero" 
            className="mx-auto"
          />
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
