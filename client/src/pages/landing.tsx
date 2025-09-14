import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SchoolSignUpForm from "@/components/SchoolSignUpForm";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import InstagramCarousel from "@/components/InstagramCarousel";
import logoUrl from "@assets/Logo_1757848498470.png";
import emojiImage from "@assets/emoji-038d00f1-9ce3-40c1-be35-0fa13277e57a_1757854869723.png";
import inspireIcon from "@assets/Inspire_1757862013793.png";
import investigateIcon from "@assets/Investigate_1757862013794.png";
import actIcon from "@assets/plastic_bottles_and_glass_in_recycling_boxes_static_1757862163412.png";
import commonSeasLogo from "@assets/common-seas_1757862244194.png";
import kidsAgainstPlasticLogo from "@assets/KAP-logo-png-300x300_1757862244194.png";
import riverCleanupLogo from "@assets/RiverCleanup_logo_rgb_pos-WhiteBG-01-2-256x256_1757862244194.png";
import animationVideo from "@assets/animation-0b930b2b-aef0-4731-b7e3-320580204295_1757854892203.mp4";
import studentImage from "@assets/emoji-a2ce9597-1802-41f9-90ac-02c0f6bc39c4_1757856002008.png";
import studentVideo from "@assets/a2ce9597-1802-41f9-90ac-02c0f6bc39c4_3511011f-41fb-4a9f-9a85-e3a6d7a6a50d_1757856002007.mp4";
import booksImage from "@assets/emoji-87fc1963-3634-4869-8114-9e623ac4ab1b_1757856145814.png";
import booksVideo from "@assets/animation-674499de-46d3-4335-b88b-1e2c39496eca_1757856145814.mp4";
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
  Zap,
  Instagram
} from "lucide-react";

interface SiteStats {
  totalSchools: number;
  completedAwards: number;
  countries: number;
  studentsImpacted: number;
}

export default function Landing() {
  const [showSignUp, setShowSignUp] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const { data: stats } = useQuery<SiteStats>({
    queryKey: ['/api/stats'],
  });

  // Scroll animation setup
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
        }
      });
    }, observerOptions);

    // Observe all scroll-reveal elements
    const revealElements = document.querySelectorAll('.scroll-reveal, .scroll-reveal-left, .scroll-reveal-right, .scroll-reveal-scale');
    revealElements.forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white pt-16">

      {/* Clean Hero Section - StreetSmart Inspired with Video Background */}
      <section className="min-h-screen bg-white relative overflow-hidden flex items-center">
        {/* YouTube Video Background - Ultra-fast loading */}
        <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
          <iframe 
            src="https://www.youtube.com/embed/jyL1lt-72HQ?autoplay=1&mute=1&loop=1&playlist=jyL1lt-72HQ&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&playsinline=1&start=1&end=29&enablejsapi=0"
            className="absolute inset-0"
            style={{ 
              border: 'none',
              width: '300%',
              height: '300%',
              left: '-100%',
              top: '-100%',
              transform: 'scale(0.5)',
              transformOrigin: 'center center'
            }}
            allow="autoplay; encrypted-media"
            referrerPolicy="strict-origin-when-cross-origin"
            loading="eager"
          />
        </div>
        
        {/* Subtle Black Overlay for Text Contrast */}
        <div className="absolute inset-0 bg-black/25 z-10"></div>
        
        <div className="container-width relative z-20 py-20">
          <div className="max-w-4xl mx-auto text-center">
            {/* Hero Heading with Text Shadow */}
            <h1 
              className="text-4xl lg:text-5xl xl:text-6xl font-bold mb-8 text-white leading-tight"
              style={{ 
                textShadow: '2px 2px 8px rgba(0,0,0,0.8), 0px 0px 16px rgba(0,0,0,0.6)' 
              }}
              data-testid="text-hero-title"
            >
              Empower Your School to Lead the Way in Reducing Plastic Waste
            </h1>

            {/* CTA Button with Enhanced Animation */}
            <Button 
              size="lg"
              className="btn-primary px-8 py-4 text-xl mb-8 group"
              onClick={() => window.location.href = '/register'}
              data-testid="button-register-school"
            >
              Register Your School Now
              <ArrowRight className="icon-md ml-3 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>

            {/* Simple Trust Indicators with Text Shadow */}
            <div 
              className="flex flex-wrap justify-center items-center gap-6 text-base text-white font-medium"
              style={{ 
                textShadow: '1px 1px 4px rgba(0,0,0,0.8)' 
              }}
            >
              <div className="flex items-center gap-2">
                <BookOpen className="icon-sm text-white drop-shadow-lg" />
                Curriculum Aligned
              </div>
              <div className="flex items-center gap-2">
                <Recycle className="icon-sm text-white drop-shadow-lg" />
                Proven Impact
              </div>
              <div className="flex items-center gap-2">
                <Heart className="icon-sm text-white drop-shadow-lg" />
                Completely Free
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What is a Plastic Clever School Section */}
      <section className="section-padding bg-white">
        <div className="container-width relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="heading-2 mb-8 scroll-reveal">What is a Plastic Clever School?</h2>
            <p className="body-large mb-12 max-w-3xl mx-auto scroll-reveal">
              Plastic Clever Schools is an awards program designed to help schools reduce their single-use plastic consumption. We provide you with the tools and a simple 3-step framework to inspire change, investigate your school's plastic use, and act on solutions—all while empowering your students to become the next generation of environmental leaders.
            </p>
            
            {/* Key Callouts with Delightful Animations */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 scroll-reveal">
              <div className="text-center group cursor-pointer">
                <div 
                  className="w-32 h-32 md:w-40 md:h-40 flex items-center justify-center mx-auto mb-4 transition-all duration-200 group-hover:scale-105 relative overflow-hidden"
                  onMouseEnter={(e) => {
                    const video = e.currentTarget.querySelector('video');
                    if (video) video.play();
                  }}
                  onMouseLeave={(e) => {
                    const video = e.currentTarget.querySelector('video');
                    if (video) video.pause();
                  }}
                >
                  <img 
                    src={emojiImage} 
                    alt="Award trophy" 
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-contain opacity-100 transition-opacity duration-300 group-hover:opacity-0"
                  />
                  <video 
                    src={animationVideo}
                    className="absolute inset-0 w-full h-full object-contain opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none"
                    loop
                    muted
                    playsInline
                    preload="none"
                  />
                </div>
                <h3 className="heading-4 mb-3 transition-colors duration-300 group-hover:text-ocean-blue">Award-Winning Program</h3>
                <p className="body-text">Recognized for our effective approach to reducing waste.</p>
              </div>
              <div className="text-center group cursor-pointer">
                <div 
                  className="w-32 h-32 md:w-40 md:h-40 flex items-center justify-center mx-auto mb-4 transition-all duration-200 group-hover:scale-105 relative overflow-hidden"
                  onMouseEnter={(e) => {
                    const video = e.currentTarget.querySelector('video');
                    if (video) video.play();
                  }}
                  onMouseLeave={(e) => {
                    const video = e.currentTarget.querySelector('video');
                    if (video) video.pause();
                  }}
                >
                  <img 
                    src={studentImage} 
                    alt="Student character" 
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-contain opacity-100 transition-opacity duration-300 group-hover:opacity-0"
                  />
                  <video 
                    src={studentVideo}
                    className="absolute inset-0 w-full h-full object-contain opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none"
                    loop
                    muted
                    playsInline
                    preload="none"
                  />
                </div>
                <h3 className="heading-4 mb-3 transition-colors duration-300 group-hover:text-teal">Student-Led Action</h3>
                <p className="body-text">Kids are at the heart of every step, fostering a sense of ownership and responsibility.</p>
              </div>
              <div className="text-center group cursor-pointer">
                <div 
                  className="w-32 h-32 md:w-40 md:h-40 flex items-center justify-center mx-auto mb-4 transition-all duration-200 group-hover:scale-105 relative overflow-hidden"
                  onMouseEnter={(e) => {
                    const video = e.currentTarget.querySelector('video');
                    if (video) video.play();
                  }}
                  onMouseLeave={(e) => {
                    const video = e.currentTarget.querySelector('video');
                    if (video) video.pause();
                  }}
                >
                  <img 
                    src={booksImage} 
                    alt="Books and resources" 
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-contain opacity-100 transition-opacity duration-300 group-hover:opacity-0"
                  />
                  <video 
                    src={booksVideo}
                    className="absolute inset-0 w-full h-full object-contain opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none"
                    loop
                    muted
                    playsInline
                    preload="none"
                  />
                </div>
                <h3 className="heading-4 mb-3 transition-colors duration-300 group-hover:text-navy">Free Resources</h3>
                <p className="body-text">Access a full toolkit of guides, worksheets, and activities to make your journey simple and effective.</p>
              </div>
            </div>
            
            <Button 
              size="lg"
              className="btn-primary px-8 py-3 text-lg font-semibold group hover:scale-105 transition-all duration-300"
              data-testid="button-download-sample"
            >
              <span className="mr-2">📚</span>
              Download a Sample Resource
              <ArrowRight className="icon-md ml-2 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </section>

      {/* Social Proof & Impact Section */}
      <section className="section-padding bg-gray-50">
        <div className="container-width relative z-10">
          <div className="text-center mb-16">
            <h2 className="heading-2 mb-4">Join a Growing Movement</h2>
            <p className="body-large max-w-3xl mx-auto">
              More than {stats?.totalSchools?.toLocaleString() || '1,542'} schools have already registered for the Plastic Clever Schools program, making a collective impact on waste reduction and environmental education.
            </p>
          </div>
          
          <div className="max-w-2xl mx-auto text-center mb-12">
            <div className="text-6xl lg:text-8xl font-bold text-navy mb-4 scroll-reveal-scale" data-testid="stat-registered-schools">
              {stats?.totalSchools?.toLocaleString() || '1542'}+
            </div>
            <div className="text-xl lg:text-2xl text-gray-600 mb-8 scroll-reveal">Registered Schools So Far</div>
            <Button 
              size="lg"
              className="btn-primary px-8 py-3 text-lg font-semibold group hover:scale-105 transition-all duration-300 scroll-reveal"
              data-testid="button-view-schools"
            >
              <MapPin className="icon-md mr-2 transition-transform duration-300 group-hover:rotate-12" />
              View All Registered Schools
              <ArrowRight className="icon-md ml-2 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </section>

      {/* Three-Stage Program - Clean StreetSmart Cards with Fun Accent */}
      <section id="how-it-works" className="section-padding bg-gradient-to-b from-white to-yellow/10">
        <div className="container-width">
          <div className="text-center mb-16">
            <h2 className="heading-2 mb-4 scroll-reveal">A Simple 3-Stage Journey to a Plastic Clever School</h2>
            <p className="body-large max-w-3xl mx-auto scroll-reveal">
              Our proven framework breaks down your school's transformation into three straightforward stages.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Stage 1: Inspire */}
            <div className="card-clean card-hover p-8 text-center scroll-reveal-left">
              <div className="w-32 h-32 bg-ocean-blue/10 rounded-full flex items-center justify-center mx-auto mb-6 group cursor-pointer transition-all duration-200 hover:scale-105 hover:bg-ocean-blue/20">
                <img 
                  src={inspireIcon} 
                  alt="Inspire" 
                  className="w-30 h-30 transition-transform duration-200 group-hover:scale-110" 
                />
              </div>
              <div className="w-8 h-8 bg-ocean-blue rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-sm">1</span>
              </div>
              <h3 className="heading-4 mb-4">INSPIRE</h3>
              <p className="body-text mb-6">Engage and educate your school community about the impact of plastic pollution. Use our resources to inspire students, teachers, and staff to take part in this vital mission.</p>
            </div>

            {/* Stage 2: Investigate */}
            <div className="card-clean card-hover p-8 text-center scroll-reveal">
              <div className="w-32 h-32 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-6 group cursor-pointer transition-all duration-200 hover:scale-105 hover:bg-teal/20">
                <img 
                  src={investigateIcon} 
                  alt="Investigate" 
                  className="w-30 h-30 transition-transform duration-200 group-hover:scale-110" 
                />
              </div>
              <div className="w-8 h-8 bg-teal rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-sm">2</span>
              </div>
              <h3 className="heading-4 mb-4">INVESTIGATE</h3>
              <p className="body-text mb-6">Work together to identify the key single-use plastics in your school. Our tools will help you pinpoint problem areas and prepare a clear plan for effective action.</p>
            </div>

            {/* Stage 3: Act */}
            <div className="card-clean card-hover p-8 text-center scroll-reveal-right">
              <div className="w-32 h-32 bg-navy/10 rounded-full flex items-center justify-center mx-auto mb-6 group cursor-pointer transition-all duration-200 hover:scale-105 hover:bg-navy/20">
                <img 
                  src={actIcon} 
                  alt="Act" 
                  className="w-30 h-30 transition-transform duration-200 group-hover:scale-110" 
                />
              </div>
              <div className="w-8 h-8 bg-navy rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-sm">3</span>
              </div>
              <h3 className="heading-4 mb-4">ACT</h3>
              <p className="body-text mb-6">Implement sustainable 'swaps' and strategies to remove single-use plastics from your school environment. Celebrate your progress as you create lasting change.</p>
            </div>
          </div>

          {/* Recognition Section */}
          <div className="mt-16 text-center bg-gray-50 rounded-xl p-12 scroll-reveal-scale">
            <h3 className="heading-3 mb-4">Earn Recognition for Your Impact</h3>
            <p className="body-large mb-8 max-w-3xl mx-auto">
              Complete each stage to earn digital badges and certificates that showcase your school's environmental leadership
            </p>
            
            <div className="flex flex-wrap justify-center gap-6">
              <div className="flex items-center gap-3 bg-white rounded-lg px-6 py-3 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 group cursor-pointer stagger-delay-1">
                <div className="w-8 h-8 bg-ocean-blue rounded-full flex items-center justify-center transition-all duration-300 group-hover:rotate-12">
                  <Star className="icon-sm text-white transition-transform duration-300 group-hover:scale-110" />
                </div>
                <span className="font-semibold text-navy transition-colors duration-300 group-hover:text-ocean-blue">Digital Badges</span>
              </div>
              <div className="flex items-center gap-3 bg-white rounded-lg px-6 py-3 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 group cursor-pointer stagger-delay-2">
                <div className="w-8 h-8 bg-teal rounded-full flex items-center justify-center transition-all duration-300 group-hover:rotate-12">
                  <Award className="icon-sm text-white transition-transform duration-300 group-hover:scale-110" />
                </div>
                <span className="font-semibold text-navy transition-colors duration-300 group-hover:text-teal">Certificates</span>
              </div>
              <div className="flex items-center gap-3 bg-white rounded-lg px-6 py-3 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 group cursor-pointer stagger-delay-3">
                <div className="w-8 h-8 bg-navy rounded-full flex items-center justify-center transition-all duration-300 group-hover:rotate-12">
                  <TrendingUp className="icon-sm text-white transition-transform duration-300 group-hover:scale-110" />
                </div>
                <span className="font-semibold text-navy transition-colors duration-300 group-hover:text-navy">Progress Tracking</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partnership & Endorsement Section - Clean White */}
      <section className="section-padding bg-white border-t-4 border-teal">
        <div className="container-width">
          <div className="text-center mb-16">
            <h2 className="heading-2 mb-4 scroll-reveal">Built on Strong Partnerships</h2>
            <p className="body-large max-w-3xl mx-auto scroll-reveal">
              Plastic Clever Schools is a collaboration between leading environmental organizations, working together to create meaningful change in education.
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center items-center gap-12 scroll-reveal">
            <div className="flex items-center justify-center">
              <img 
                src={commonSeasLogo} 
                alt="Common Seas" 
                className="h-16 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity duration-300"
              />
            </div>
            <div className="flex items-center justify-center">
              <img 
                src={kidsAgainstPlasticLogo} 
                alt="Kids Against Plastic" 
                className="h-16 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity duration-300"
              />
            </div>
            <div className="flex items-center justify-center">
              <img 
                src={riverCleanupLogo} 
                alt="River Cleanup" 
                className="h-16 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity duration-300"
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* Why Schools Love Us - Testimonial Style - Light Grey Background */}
      <section className="section-padding bg-gray-50">
        <div className="container-width">
          <div className="text-center mb-16">
            <h2 className="heading-2 mb-4 scroll-reveal">Why Schools Choose Us</h2>
            <p className="body-large max-w-3xl mx-auto scroll-reveal">
              Hear from educators and students who have transformed their schools through our program
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="card-clean p-6 scroll-reveal-left">
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
            <div className="card-clean p-6 scroll-reveal">
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
            <div className="card-clean p-6 scroll-reveal-right">
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

        </div>
      </section>

      {/* Instagram Feed Section */}
      <section className="section-padding bg-gradient-to-b from-teal/5 to-ocean-blue/5">
        <div className="container-width">
          <div className="text-center mb-16">
            <h2 className="heading-2 mb-4 scroll-reveal">Follow Our Journey</h2>
            <p className="body-large max-w-3xl mx-auto scroll-reveal">
              See the latest updates from schools around the world making a difference. Real stories, real impact, shared daily on our Instagram.
            </p>
            <div className="flex justify-center mt-6">
              <a 
                href="https://instagram.com/plasticclever.schools" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 text-white rounded-lg font-semibold hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
                data-testid="button-follow-instagram"
              >
                <Instagram className="w-5 h-5" />
                Follow @plasticclever.schools
              </a>
            </div>
          </div>
          
          <div className="scroll-reveal">
            <InstagramCarousel />
          </div>
          
          <div className="text-center mt-12 scroll-reveal">
            <p className="body-text text-gray-600 mb-6">
              Join the conversation and share your school's plastic clever journey with <span className="font-semibold text-teal">#PlasticCleverSchools</span>
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <span className="inline-block bg-white px-4 py-2 rounded-full text-sm font-medium text-gray-700 shadow-sm">#SustainableSchools</span>
              <span className="inline-block bg-white px-4 py-2 rounded-full text-sm font-medium text-gray-700 shadow-sm">#PlasticFree</span>
              <span className="inline-block bg-white px-4 py-2 rounded-full text-sm font-medium text-gray-700 shadow-sm">#EcoEducation</span>
              <span className="inline-block bg-white px-4 py-2 rounded-full text-sm font-medium text-gray-700 shadow-sm">#YoungActivists</span>
            </div>
          </div>
        </div>
      </section>


      {/* Clean Professional Footer */}
      <footer className="bg-navy text-white py-12">
        <div className="container-width">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 scroll-reveal">
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
          
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-400 scroll-reveal">
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