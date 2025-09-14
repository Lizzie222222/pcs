import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SchoolSignUpForm from "@/components/SchoolSignUpForm";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import logoUrl from "@assets/Logo_1757848498470.png";
import { 
  School, 
  Trophy, 
  Globe, 
  Users, 
  Lightbulb, 
  Search, 
  Target,
  ChevronRight,
  Star,
  ArrowRight,
  CheckCircle,
  Award,
  BookOpen,
  Play,
  Recycle,
  Leaf,
  Heart,
  MapPin,
  Clock,
  TrendingUp,
  Shield,
  Zap
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
      {/* Clean Professional Header */}
      <header className="py-4 px-4 sm:px-6 lg:px-8">
        <div className="container-width flex items-center justify-between">
          <img 
            src={logoUrl} 
            alt="Plastic Clever Schools" 
            className="h-12 w-auto" 
            data-testid="logo"
          />
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              className="text-navy hover:text-ocean-blue"
              onClick={() => scrollToSection('how-it-works')}
              data-testid="link-how-it-works"
            >
              How It Works
            </Button>
            <Button 
              className="btn-primary px-6 py-2"
              onClick={() => setShowSignUp(true)}
              data-testid="button-header-join"
            >
              Join Free
            </Button>
          </div>
        </div>
      </header>

      {/* Clean Hero Section - StreetSmart Inspired */}
      <section className="section-padding bg-white">
        <div className="container-width">
          <div className="max-w-3xl mx-auto text-center">
            {/* Trust Badge */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <Badge variant="outline" className="border-teal text-teal bg-teal/5 px-4 py-2">
                <Award className="icon-sm mr-2" />
                Award-Winning Environmental Program
              </Badge>
            </div>

            {/* Hero Heading */}
            <h1 className="heading-1 mb-6" data-testid="text-hero-title">
              Transform Your School Into a 
              <span className="text-ocean-blue"> Plastic-Free</span> Leader
            </h1>
            
            {/* Hero Description */}
            <p className="body-large mb-8 max-w-2xl mx-auto" data-testid="text-hero-description">
              Join <strong className="text-navy">{stats?.totalSchools?.toLocaleString() || '1,200+'} schools</strong> across <strong className="text-navy">{stats?.countries || '32'} countries</strong> creating lasting environmental change through our proven 3-stage educational program.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button 
                size="lg"
                className="btn-primary px-8 py-3 text-lg font-semibold"
                onClick={() => setShowSignUp(true)}
                data-testid="button-start-journey"
              >
                Start Your Journey
                <ArrowRight className="icon-md ml-2" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="btn-secondary px-8 py-3 text-lg font-semibold"
                onClick={() => scrollToSection('how-it-works')}
                data-testid="button-explore-program"
              >
                <Play className="icon-md mr-2" />
                Explore Program
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Shield className="icon-sm text-teal" />
                100% Free Program
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="icon-sm text-teal" />
                Curriculum Aligned
              </div>
              <div className="flex items-center gap-2">
                <Users className="icon-sm text-teal" />
                Expert Support Included
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Statistics - Clean StreetSmart Style */}
      <section className="section-padding-sm bg-navy-light/10">
        <div className="container-width">
          <div className="text-center mb-16">
            <p className="caption text-gray-600 mb-4">Trusted by educators worldwide</p>
            <h2 className="heading-2 mb-4">Global Impact</h2>
            <p className="body-text max-w-2xl mx-auto">
              Real numbers from our growing community of environmentally conscious schools
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-ocean-blue rounded-full flex items-center justify-center mx-auto mb-4">
                <School className="icon-lg text-white" />
              </div>
              <div className="text-3xl lg:text-4xl font-bold text-navy mb-2" data-testid="stat-schools">
                {stats?.totalSchools?.toLocaleString() || '1,200+'}
              </div>
              <div className="body-text text-gray-600">Schools Enrolled</div>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-teal rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="icon-lg text-white" />
              </div>
              <div className="text-3xl lg:text-4xl font-bold text-navy mb-2" data-testid="stat-awards">
                {stats?.completedAwards || '450+'}
              </div>
              <div className="body-text text-gray-600">Awards Earned</div>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-navy rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="icon-lg text-white" />
              </div>
              <div className="text-3xl lg:text-4xl font-bold text-navy mb-2" data-testid="stat-countries">
                {stats?.countries || '32'}+
              </div>
              <div className="body-text text-gray-600">Countries</div>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-ocean-blue/80 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="icon-lg text-white" />
              </div>
              <div className="text-3xl lg:text-4xl font-bold text-navy mb-2" data-testid="stat-students">
                {stats?.studentsImpacted?.toLocaleString() || '75K+'}
              </div>
              <div className="body-text text-gray-600">Students Impacted</div>
            </div>
          </div>
        </div>
      </section>

      {/* Three-Stage Program - Clean StreetSmart Cards */}
      <section id="how-it-works" className="section-padding bg-white">
        <div className="container-width">
          <div className="text-center mb-16">
            <h2 className="heading-2 mb-4">Our Three-Stage Program</h2>
            <p className="body-large max-w-3xl mx-auto">
              A proven methodology that transforms schools into environmental champions through structured, engaging activities
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Stage 1: Inspire */}
            <div className="card-clean card-hover p-8 text-center">
              <div className="w-20 h-20 bg-ocean-blue/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lightbulb className="w-10 h-10 text-ocean-blue" />
              </div>
              <div className="w-8 h-8 bg-ocean-blue rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-sm">1</span>
              </div>
              <h3 className="heading-4 mb-4">Inspire</h3>
              <p className="body-text mb-6">Build awareness and motivation through engaging educational content</p>
              <ul className="text-left space-y-3 text-gray-600">
                <li className="flex items-start gap-3">
                  <CheckCircle className="icon-sm text-ocean-blue mt-0.5 flex-shrink-0" />
                  Interactive learning modules
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="icon-sm text-ocean-blue mt-0.5 flex-shrink-0" />
                  Multimedia educational resources
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="icon-sm text-ocean-blue mt-0.5 flex-shrink-0" />
                  School assemblies and workshops
                </li>
              </ul>
            </div>

            {/* Stage 2: Investigate */}
            <div className="card-clean card-hover p-8 text-center">
              <div className="w-20 h-20 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-teal" />
              </div>
              <div className="w-8 h-8 bg-teal rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-sm">2</span>
              </div>
              <h3 className="heading-4 mb-4">Investigate</h3>
              <p className="body-text mb-6">Research and analyze your school's plastic consumption patterns</p>
              <ul className="text-left space-y-3 text-gray-600">
                <li className="flex items-start gap-3">
                  <CheckCircle className="icon-sm text-teal mt-0.5 flex-shrink-0" />
                  Plastic waste audits
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="icon-sm text-teal mt-0.5 flex-shrink-0" />
                  Data collection and analysis
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="icon-sm text-teal mt-0.5 flex-shrink-0" />
                  Solution research projects
                </li>
              </ul>
            </div>

            {/* Stage 3: Act */}
            <div className="card-clean card-hover p-8 text-center">
              <div className="w-20 h-20 bg-navy/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Target className="w-10 h-10 text-navy" />
              </div>
              <div className="w-8 h-8 bg-navy rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-sm">3</span>
              </div>
              <h3 className="heading-4 mb-4">Act</h3>
              <p className="body-text mb-6">Implement lasting solutions and share your success</p>
              <ul className="text-left space-y-3 text-gray-600">
                <li className="flex items-start gap-3">
                  <CheckCircle className="icon-sm text-navy mt-0.5 flex-shrink-0" />
                  Action plan implementation
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="icon-sm text-navy mt-0.5 flex-shrink-0" />
                  Community engagement campaigns
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="icon-sm text-navy mt-0.5 flex-shrink-0" />
                  Impact measurement and sharing
                </li>
              </ul>
            </div>
          </div>

          {/* Recognition Section */}
          <div className="mt-16 text-center bg-gray-50 rounded-xl p-12">
            <h3 className="heading-3 mb-4">Earn Recognition for Your Impact</h3>
            <p className="body-large mb-8 max-w-3xl mx-auto">
              Complete each stage to earn digital badges and certificates that showcase your school's environmental leadership
            </p>
            
            <div className="flex flex-wrap justify-center gap-6">
              <div className="flex items-center gap-3 bg-white rounded-lg px-6 py-3 shadow-sm">
                <div className="w-8 h-8 bg-ocean-blue rounded-full flex items-center justify-center">
                  <Star className="icon-sm text-white" />
                </div>
                <span className="font-semibold text-navy">Digital Badges</span>
              </div>
              <div className="flex items-center gap-3 bg-white rounded-lg px-6 py-3 shadow-sm">
                <div className="w-8 h-8 bg-teal rounded-full flex items-center justify-center">
                  <Award className="icon-sm text-white" />
                </div>
                <span className="font-semibold text-navy">Certificates</span>
              </div>
              <div className="flex items-center gap-3 bg-white rounded-lg px-6 py-3 shadow-sm">
                <div className="w-8 h-8 bg-navy rounded-full flex items-center justify-center">
                  <TrendingUp className="icon-sm text-white" />
                </div>
                <span className="font-semibold text-navy">Progress Tracking</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Schools Love Us - Testimonial Style */}
      <section className="section-padding bg-navy-light/5">
        <div className="container-width">
          <div className="text-center mb-16">
            <h2 className="heading-2 mb-4">Why Schools Choose Us</h2>
            <p className="body-large max-w-3xl mx-auto">
              Hear from educators and students who have transformed their schools through our program
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="card-clean p-6">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="icon-sm text-yellow fill-current" />
                ))}
              </div>
              <p className="body-text italic mb-4">
                "The structured approach made implementation seamless. Our students are now passionate environmental advocates!"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-ocean-blue rounded-full flex items-center justify-center text-white font-bold">
                  SJ
                </div>
                <div>
                  <div className="font-semibold text-navy">Sarah Johnson</div>
                  <div className="caption">Green Valley Primary, UK</div>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="card-clean p-6">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="icon-sm text-yellow fill-current" />
                ))}
              </div>
              <p className="body-text italic mb-4">
                "We've reduced plastic waste by 60%! The whole school community is involved and excited about sustainability."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal rounded-full flex items-center justify-center text-white font-bold">
                  MR
                </div>
                <div>
                  <div className="font-semibold text-navy">Maria Rodriguez</div>
                  <div className="caption">Sunshine Elementary, Australia</div>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="card-clean p-6">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="icon-sm text-yellow fill-current" />
                ))}
              </div>
              <p className="body-text italic mb-4">
                "Perfect for cross-curricular learning! We integrated it across science, geography, and citizenship classes."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-navy rounded-full flex items-center justify-center text-white font-bold">
                  DK
                </div>
                <div>
                  <div className="font-semibold text-navy">David Kim</div>
                  <div className="caption">Future Leaders High, Canada</div>
                </div>
              </div>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="mt-16 text-center">
            <p className="caption mb-8">Trusted by educational organizations worldwide</p>
            <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
              <div className="flex items-center gap-2 text-gray-500 font-medium">
                <Globe className="icon-md" />
                UNESCO Partner
              </div>
              <div className="flex items-center gap-2 text-gray-500 font-medium">
                <Recycle className="icon-md" />
                WWF Supporter
              </div>
              <div className="flex items-center gap-2 text-gray-500 font-medium">
                <Leaf className="icon-md" />
                Green Schools Alliance
              </div>
              <div className="flex items-center gap-2 text-gray-500 font-medium">
                <BookOpen className="icon-md" />
                Education Excellence Network
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA - Professional and Clean */}
      <section className="section-padding bg-white">
        <div className="container-width">
          <div className="max-w-4xl mx-auto text-center bg-navy text-white rounded-xl p-12 lg:p-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-white" data-testid="text-final-cta-title">
              Ready to Transform Your School?
            </h2>
            <p className="text-xl lg:text-2xl opacity-90 mb-10 max-w-3xl mx-auto">
              Join <strong>{stats?.totalSchools?.toLocaleString() || '1,200+'}</strong> schools creating lasting environmental change. Start your journey today - it's completely free!
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button 
                size="lg" 
                className="bg-teal hover:bg-teal/90 text-white px-10 py-4 text-xl font-semibold"
                onClick={() => setShowSignUp(true)}
                data-testid="button-start-free"
              >
                Start Free Today
                <ArrowRight className="icon-md ml-3" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-2 border-white text-white hover:bg-white hover:text-navy px-10 py-4 text-xl font-semibold"
                onClick={() => scrollToSection('how-it-works')}
                data-testid="button-learn-more-final"
              >
                <BookOpen className="icon-md mr-3" />
                Learn More
              </Button>
            </div>

            <div className="flex flex-wrap justify-center gap-8 text-white/80 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="icon-sm text-teal" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="icon-sm text-teal" />
                Setup in under 10 minutes
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="icon-sm text-teal" />
                Expert support included
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="section-padding-sm bg-gray-50">
        <div className="container-width">
          <NewsletterSignup 
            variant="hero" 
            className="max-w-md mx-auto"
          />
        </div>
      </section>

      {/* Clean Professional Footer */}
      <footer className="bg-navy text-white py-12">
        <div className="container-width">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <img 
                src={logoUrl} 
                alt="Plastic Clever Schools" 
                className="h-10 w-auto mb-4 brightness-0 invert" 
              />
              <p className="text-gray-300 text-sm">
                Empowering schools worldwide to create plastic-free environments through education, investigation, and action.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Program</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><a href="#" className="hover:text-teal transition-colors">How It Works</a></li>
                <li><a href="#" className="hover:text-teal transition-colors">Resources</a></li>
                <li><a href="#" className="hover:text-teal transition-colors">Success Stories</a></li>
                <li><a href="#" className="hover:text-teal transition-colors">Award Criteria</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><a href="#" className="hover:text-teal transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-teal transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-teal transition-colors">Community</a></li>
                <li><a href="#" className="hover:text-teal transition-colors">Training</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><a href="#" className="hover:text-teal transition-colors">Newsletter</a></li>
                <li><a href="#" className="hover:text-teal transition-colors">Social Media</a></li>
                <li><a href="#" className="hover:text-teal transition-colors">Events</a></li>
                <li><a href="#" className="hover:text-teal transition-colors">Partners</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>
              &copy; 2024 Plastic Clever Schools. All rights reserved. | 
              <a href="#" className="hover:text-teal transition-colors ml-1">Privacy</a> | 
              <a href="#" className="hover:text-teal transition-colors ml-1">Terms</a>
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