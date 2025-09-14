import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SchoolSignUpForm from "@/components/SchoolSignUpForm";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import logoUrl from "@assets/Logo_1757848498470.png";
import heroBackgroundUrl from "@assets/generated_images/Kids_recycling_at_school_a7869617.png";
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
    <div className="min-h-screen bg-white pt-16">

      {/* Clean Hero Section - StreetSmart Inspired */}
      <section 
        className="section-padding bg-white relative overflow-hidden"
        style={{
          backgroundImage: `url(${heroBackgroundUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="absolute inset-0 bg-white/90"></div>
        <div className="container-width relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Hero Heading */}
            <h1 className="heading-1 mb-6" data-testid="text-hero-title">
              Empower Your School to Lead the Way in Reducing Plastic Waste
            </h1>
            
            {/* Hero Description */}
            <p className="body-large mb-10 max-w-3xl mx-auto" data-testid="text-hero-description">
              Join Plastic Clever Schools, the award-winning program that puts students at the heart of meaningful environmental action. Gain access to free resources and a clear path to make a real difference.
            </p>

            {/* CTA Button */}
            <Button 
              size="lg"
              className="bg-coral hover:bg-coral/90 text-white px-10 py-4 text-xl font-semibold mb-8"
              onClick={() => setShowSignUp(true)}
              data-testid="button-register-school"
            >
              Register Your School Now
              <ArrowRight className="icon-md ml-3" />
            </Button>

            {/* Simple Trust Indicators */}
            <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Shield className="icon-sm text-teal" />
                100% Free
              </div>
              <div className="flex items-center gap-2">
                <Award className="icon-sm text-teal" />
                Award-Winning
              </div>
              <div className="flex items-center gap-2">
                <Users className="icon-sm text-teal" />
                Expert Support
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What is a Plastic Clever School Section - Fun Yellow */}
      <section className="section-padding bg-yellow/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow/10 to-yellow/30"></div>
        <div className="container-width relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="heading-2 mb-8">What is a Plastic Clever School?</h2>
            <p className="body-large mb-12 max-w-3xl mx-auto">
              Plastic Clever Schools is an awards program designed to help schools reduce their single-use plastic consumption. We provide you with the tools and a simple 3-step framework to inspire change, investigate your school's plastic use, and act on solutions—all while empowering your students to become the next generation of environmental leaders.
            </p>
            
            {/* Key Callouts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-ocean-blue rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="icon-lg text-white" />
                </div>
                <h3 className="heading-4 mb-3">Award-Winning Program</h3>
                <p className="body-text">Recognized for our effective approach to reducing waste.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-teal rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="icon-lg text-white" />
                </div>
                <h3 className="heading-4 mb-3">Student-Led Action</h3>
                <p className="body-text">Kids are at the heart of every step, fostering a sense of ownership and responsibility.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-navy rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="icon-lg text-white" />
                </div>
                <h3 className="heading-4 mb-3">Free Resources</h3>
                <p className="body-text">Access a full toolkit of guides, worksheets, and activities to make your journey simple and effective.</p>
              </div>
            </div>
            
            <Button 
              size="lg"
              className="btn-secondary px-8 py-3 text-lg font-semibold"
              data-testid="button-download-sample"
            >
              Download a Sample Resource
            </Button>
          </div>
        </div>
      </section>

      {/* Social Proof & Impact Section - Fun Coral */}
      <section className="section-padding bg-coral/15 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-coral/10 to-coral/20"></div>
        <div className="container-width relative z-10">
          <div className="text-center mb-16">
            <h2 className="heading-2 mb-4">Join a Growing Movement</h2>
            <p className="body-large max-w-3xl mx-auto">
              More than {stats?.totalSchools?.toLocaleString() || '1,542'} schools have already registered for the Plastic Clever Schools program, making a collective impact on waste reduction and environmental education.
            </p>
          </div>
          
          <div className="max-w-2xl mx-auto text-center mb-12">
            <div className="text-6xl lg:text-8xl font-bold text-navy mb-4" data-testid="stat-registered-schools">
              {stats?.totalSchools?.toLocaleString() || '1542'}+
            </div>
            <div className="text-xl lg:text-2xl text-gray-600 mb-8">Registered Schools So Far</div>
            <Button 
              size="lg"
              className="btn-secondary px-8 py-3 text-lg font-semibold"
              data-testid="button-view-schools"
            >
              View All Registered Schools
            </Button>
          </div>
        </div>
      </section>

      {/* Three-Stage Program - Clean StreetSmart Cards with Fun Accent */}
      <section id="how-it-works" className="section-padding bg-gradient-to-b from-white to-yellow/10">
        <div className="container-width">
          <div className="text-center mb-16">
            <h2 className="heading-2 mb-4">A Simple 3-Stage Journey to a Plastic Clever School</h2>
            <p className="body-large max-w-3xl mx-auto">
              Our proven framework breaks down your school's transformation into three straightforward stages.
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
              <h3 className="heading-4 mb-4">INSPIRE</h3>
              <p className="body-text mb-6">Engage and educate your school community about the impact of plastic pollution. Use our resources to inspire students, teachers, and staff to take part in this vital mission.</p>
            </div>

            {/* Stage 2: Investigate */}
            <div className="card-clean card-hover p-8 text-center">
              <div className="w-20 h-20 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-teal" />
              </div>
              <div className="w-8 h-8 bg-teal rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-sm">2</span>
              </div>
              <h3 className="heading-4 mb-4">INVESTIGATE</h3>
              <p className="body-text mb-6">Work together to identify the key single-use plastics in your school. Our tools will help you pinpoint problem areas and prepare a clear plan for effective action.</p>
            </div>

            {/* Stage 3: Act */}
            <div className="card-clean card-hover p-8 text-center">
              <div className="w-20 h-20 bg-navy/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Target className="w-10 h-10 text-navy" />
              </div>
              <div className="w-8 h-8 bg-navy rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-sm">3</span>
              </div>
              <h3 className="heading-4 mb-4">ACT</h3>
              <p className="body-text mb-6">Implement sustainable 'swaps' and strategies to remove single-use plastics from your school environment. Celebrate your progress as you create lasting change.</p>
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

      {/* Partnership & Endorsement Section - Clean White */}
      <section className="section-padding bg-white border-t-4 border-teal">
        <div className="container-width">
          <div className="text-center mb-16">
            <h2 className="heading-2 mb-4">Built on Strong Partnerships</h2>
            <p className="body-large max-w-3xl mx-auto">
              Plastic Clever Schools is a collaboration between leading environmental organizations, working together to create meaningful change in education.
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-60">
            <div className="flex items-center gap-3 text-gray-500 font-medium text-lg">
              <Globe className="w-8 h-8" />
              Partner Organization 1
            </div>
            <div className="flex items-center gap-3 text-gray-500 font-medium text-lg">
              <Leaf className="w-8 h-8" />
              Partner Organization 2
            </div>
            <div className="flex items-center gap-3 text-gray-500 font-medium text-lg">
              <Recycle className="w-8 h-8" />
              Partner Organization 3
            </div>
          </div>
        </div>
      </section>
      
      {/* Why Schools Love Us - Testimonial Style - Fun Coral Background */}
      <section className="section-padding bg-gradient-to-r from-coral/5 to-yellow/5">
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
              Ready to Make Your School Plastic Clever?
            </h2>
            <p className="text-xl lg:text-2xl opacity-90 mb-10 max-w-3xl mx-auto">
              Join hundreds of other schools making a positive, tangible impact. Get started on your journey today and access all the free resources you need.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button 
                size="lg" 
                className="bg-teal hover:bg-teal/90 text-white px-10 py-4 text-xl font-semibold"
                onClick={() => setShowSignUp(true)}
                data-testid="button-start-free"
              >
                Register Your School Now
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

      {/* Newsletter - Stay Connected with Fun Styling */}
      <section className="section-padding bg-gradient-to-r from-yellow/20 via-coral/10 to-teal/15 relative">
        <div className="absolute inset-0 bg-white/60"></div>
        <div className="container-width relative z-10">
          <div className="max-w-2xl mx-auto text-center bg-white/80 backdrop-blur-sm rounded-2xl p-12 shadow-lg border border-white/50">
            <h2 className="heading-2 mb-4 text-navy">Stay Connected</h2>
            <p className="body-large mb-8 text-gray-700">
              Get the latest updates, success stories, and resources delivered to your inbox.
            </p>
            <NewsletterSignup 
              variant="hero" 
              className="max-w-md mx-auto"
            />
            <div className="mt-6 flex justify-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="icon-sm text-teal" />
                No spam, ever
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="icon-sm text-teal" />
                Unsubscribe anytime
              </div>
            </div>
          </div>
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