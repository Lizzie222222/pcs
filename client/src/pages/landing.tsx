import { useState, useRef, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useConnectionSpeed } from "@/hooks/useConnectionSpeed";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import SchoolSignUpForm from "@/components/SchoolSignUpForm";
import { OptimizedImage, generateBlurDataURL } from "@/components/ui/OptimizedImage";
import ConnectionSpeedControl from "@/components/ConnectionSpeedControl";

// Lazy load heavy components below the fold
const InstagramCarousel = lazy(() => import("@/components/InstagramCarousel"));

// Generate blur placeholders for large images
const createBlurPlaceholder = (color: string) => generateBlurDataURL(`
  <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${color}"/>
  </svg>
`);
import logoUrl from "@assets/Logo_1757848498470.png";
import inspireIcon from "@assets/Inspire_1757862013793.png";
import investigateIcon from "@assets/Investigate_1757862013794.png";
import actIcon from "@assets/plastic_bottles_and_glass_in_recycling_boxes_static_1757862163412.png";
import inspireVideo from "@assets/inspire_1757867031379.mp4";
import investigateVideo from "@assets/investigate_1757867031380.mp4";
import actVideo from "@assets/ACT_1757867031379.mp4";
import heroImage from "@assets/1W0A3542_1759747398974.jpg";
import { 
  Star,
  ArrowRight,
  Award,
  BookOpen,
  Recycle,
  Heart,
  TrendingUp,
  Instagram
} from "lucide-react";

interface SiteStats {
  totalSchools: number;
  completedAwards: number;
  countries: number;
  studentsImpacted: number;
}

export default function Landing() {
  const { t } = useTranslation('landing');
  const [showSignUp, setShowSignUp] = useState(false);
  const isMobile = useIsMobile();

  const { data: stats } = useQuery<SiteStats>({
    queryKey: ['/api/stats'],
  });

  // Connection speed detection
  const connectionSpeed = useConnectionSpeed();

  // Safe HoverVideo component to handle play/pause without promise conflicts
  interface HoverVideoProps {
    src: string;
    poster: string;
    alt: string;
    className?: string;
    containerClassName?: string;
  }

  function HoverVideo({ src, poster, alt, className = "", containerClassName = "" }: HoverVideoProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const hoverId = useRef(0);
    const hovered = useRef(false);
    const prefersReducedMotion = useReducedMotion();

    const safePlay = () => {
      if (videoRef.current && !prefersReducedMotion) {
        videoRef.current.play().catch(() => {
          // Silently handle any play interruptions
        });
      }
    };

    const handleMouseEnter = () => {
      if (prefersReducedMotion) return;
      
      // Disable video hover on mobile to save bandwidth
      if (isMobile) return;
      
      // Respect connection speed for hover videos
      if (connectionSpeed.connectionInfo.isSlowConnection && connectionSpeed.userPreference === 'auto') {
        return; // Don't auto-play on slow connections unless user explicitly wants high quality
      }
      
      hovered.current = true;
      const id = ++hoverId.current;
      const video = videoRef.current;
      
      if (!video) return;
      
      video.muted = true;
      video.playsInline = true;
      
      if (video.readyState >= 2) {
        // Video is ready to play
        if (hoverId.current === id && hovered.current) {
          safePlay();
        }
      } else {
        // Wait for video to be ready
        video.load();
        const onCanPlay = () => {
          video.removeEventListener('canplay', onCanPlay);
          if (hoverId.current === id && hovered.current) {
            safePlay();
          }
        };
        video.addEventListener('canplay', onCanPlay);
      }
    };

    const handleMouseLeave = () => {
      hovered.current = false;
      hoverId.current++; // Invalidate any pending play operations
      
      const video = videoRef.current;
      if (video && !video.paused) {
        video.pause();
        video.currentTime = 0;
      }
    };


    return (
      <div 
        ref={containerRef}
        className={`group cursor-pointer relative overflow-hidden ${containerClassName}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <OptimizedImage 
          src={poster}
          alt={alt}
          className={`w-full h-full opacity-100 transition-opacity duration-300 group-hover:opacity-0 ${className}`}
          responsive={true}
          quality={75}
          placeholder="blur"
          blurDataURL={createBlurPlaceholder('#f3f4f6')}
          sizes="(max-width: 640px) 128px, (max-width: 1024px) 160px, 160px"
          priority={false}
          width={160}
          height={160}
        />
        <video 
          ref={videoRef}
          src={src}
          className={`absolute inset-0 m-auto object-contain opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none ${className}`}
          loop
          muted
          playsInline
          preload="none"
          width="160"
          height="160"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-16">

      {/* Clean Hero Section with Student Image */}
      <section className="min-h-screen bg-white relative overflow-hidden flex items-center">
        {/* Optimized Hero Image */}
        <div className="absolute inset-0 w-full h-full z-0">
          <OptimizedImage
            src={heroImage}
            alt="Students holding Plastic Clever Schools reusable water bottles"
            width={1920}
            height={1080}
            className="w-full h-full object-cover object-[center_30%]"
            priority={true}
            responsive={true}
            quality={75}
            sizes="(max-width: 640px) 640px, (max-width: 750px) 750px, (max-width: 828px) 828px, (max-width: 1080px) 1080px, (max-width: 1920px) 1920px, 100vw"
            placeholder="blur"
            blurDataURL={createBlurPlaceholder('#f3f4f6')}
          />
        </div>

        {/* Post-it Note Style News/Events Popup - Hidden on very small screens (< 375px) */}
        <div className="hidden min-[375px]:block absolute top-3 right-3 sm:top-4 sm:right-4 md:top-8 md:right-8 z-30 max-w-[240px] sm:max-w-sm md:max-w-md">
          <div className="bg-yellow-300 border-l-4 border-yellow-500 p-3 sm:p-5 shadow-xl transform rotate-1 hover:rotate-0 transition-transform duration-200" 
               style={{ 
                 boxShadow: '0 10px 20px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.10)',
                 fontFamily: '"Segoe Print", "Comic Sans MS", cursive',
                 backgroundColor: '#ffd966'
               }}
               data-testid="popup-news-event">
            <div className="flex items-start gap-2">
              <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs sm:text-sm font-bold text-gray-900 mb-1">Latest News!</p>
                <p className="text-[10px] sm:text-xs font-medium text-gray-800 leading-tight">Join our growing community</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="container-width relative z-20 py-12 sm:py-16 md:py-20">
          <div className="max-w-4xl mx-auto text-center px-4">
            {/* Hero Text Box with Semi-transparent Background */}
            <div className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-6 sm:px-8 sm:py-10 md:px-12 md:py-12 inline-block">
              {/* Hero Heading - Improved mobile scaling */}
              <h1 
                className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold mb-6 sm:mb-8 text-navy leading-tight"
                data-testid="text-hero-title"
              >
                {t('hero.title')}
              </h1>

              {/* CTA Button with Enhanced Animation - Minimum 44x44px touch target */}
              <Button 
                size="lg"
                className="btn-primary px-6 py-3 sm:px-8 sm:py-4 text-lg sm:text-xl mb-6 sm:mb-8 group min-h-[44px] min-w-[44px]"
                onClick={() => window.location.href = '/register'}
                data-testid="button-register-school"
              >
                {t('hero.cta_primary')}
                <ArrowRight className="w-5 h-5 ml-3 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>

              {/* Simple Trust Indicators - Mobile optimized text size (min 14px) */}
              <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-6 text-sm sm:text-base text-gray-700 font-medium">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-ocean-blue" />
                  <span className="hidden sm:inline">{t('hero.trust_indicators.curriculum_aligned')}</span>
                  <span className="sm:hidden">Curriculum Aligned</span>
                </div>
                <div className="flex items-center gap-2">
                  <Recycle className="w-4 h-4 text-teal" />
                  <span className="hidden sm:inline">{t('hero.trust_indicators.proven_impact')}</span>
                  <span className="sm:hidden">Proven Impact</span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-coral" />
                  <span className="hidden sm:inline">{t('hero.trust_indicators.completely_free')}</span>
                  <span className="sm:hidden">Free</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Ribbon - Database-driven stats */}
      <section className="py-6 bg-navy">
        <div className="container-width">
          <div className="flex flex-wrap justify-center items-center gap-4 md:gap-8 text-white text-center px-4">
            <div className="flex items-center gap-2" data-testid="impact-ribbon-schools">
              <span className="text-xl sm:text-2xl md:text-3xl font-bold">{stats?.totalSchools?.toLocaleString() || '0'}</span>
              <span className="text-sm md:text-base">schools</span>
            </div>
            <div className="hidden md:block text-2xl text-white/50">|</div>
            <div className="flex items-center gap-2" data-testid="impact-ribbon-countries">
              <span className="text-xl sm:text-2xl md:text-3xl font-bold">{stats?.countries?.toLocaleString() || '0'}</span>
              <span className="text-sm md:text-base">countries</span>
            </div>
            <div className="hidden md:block text-2xl text-white/50">|</div>
            <div className="flex items-center gap-2" data-testid="impact-ribbon-actions">
              <span className="text-xl sm:text-2xl md:text-3xl font-bold">{stats?.completedAwards?.toLocaleString() || '0'}</span>
              <span className="text-sm md:text-base">actions taken</span>
            </div>
          </div>
        </div>
      </section>

      {/* Teacher Testimonial & Video Section */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-ocean-blue/5 via-white to-teal/5">
        <div className="container-width">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Teacher Testimonial - Enhanced Card */}
            <div className="relative" data-testid="section-teacher-testimonial">
              {/* Decorative Quote Mark - CSS only, hidden on mobile */}
              <div className="hidden md:block absolute -top-8 -left-6 text-ocean-blue/20 font-serif leading-none select-none pointer-events-none before:content-['\201C'] before:text-8xl lg:before:text-9xl" aria-hidden="true"></div>
              
              {/* Testimonial Card */}
              <div className="relative bg-gradient-to-br from-white to-ocean-blue/5 rounded-3xl p-6 sm:p-8 lg:p-12 shadow-2xl border-2 border-ocean-blue/20 hover:border-ocean-blue/40 hover:shadow-3xl transition-all duration-500 group">
                {/* Decorative Corner Element */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-teal/10 to-ocean-blue/10 rounded-bl-[100px] rounded-tr-3xl -z-0"></div>
                
                {/* Star Rating */}
                <div className="flex items-center gap-1 mb-6 relative z-10">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-7 h-7 text-yellow fill-current drop-shadow-sm transition-transform duration-300 group-hover:scale-110" style={{ transitionDelay: `${i * 50}ms` }} />
                  ))}
                </div>
                
                {/* Quote Text - Mobile optimized */}
                <blockquote className="text-base sm:text-xl lg:text-2xl font-semibold text-navy leading-relaxed mb-8 relative z-10 italic">
                  "Plastic Clever Schools has transformed how we approach sustainability. Our students are now passionate environmental advocates!"
                </blockquote>
                
                {/* Author Info */}
                <div className="flex items-center gap-4 pt-6 border-t-2 border-ocean-blue/20 relative z-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-ocean-blue to-teal rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg ring-4 ring-white group-hover:scale-105 transition-transform duration-300">
                    JS
                  </div>
                  <div>
                    <p className="font-bold text-navy text-lg">Jane Smith</p>
                    <p className="text-ocean-blue text-sm font-medium">Head Teacher, Greenfield Primary</p>
                  </div>
                </div>
              </div>
            </div>

            {/* What is Plastic Clever Schools Video - Enhanced */}
            <div className="space-y-6" data-testid="section-intro-video">
              {/* Heading */}
              <div className="space-y-2">
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-navy leading-tight">
                  What is Plastic Clever Schools?
                </h3>
                <div className="w-20 h-1 bg-ocean-blue rounded-full"></div>
              </div>
              
              {/* Video Container */}
              <div className="group relative">
                <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black border-4 border-white ring-2 ring-ocean-blue/20 hover:ring-ocean-blue/40 transition-all duration-300">
                  <iframe
                    className="w-full h-full"
                    src="https://www.youtube.com/embed/YOUR_VIDEO_ID"
                    title="What is Plastic Clever Schools?"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    data-testid="iframe-intro-video"
                  ></iframe>
                </div>
              </div>
              
              {/* Caption */}
              <p className="text-sm text-gray-500 italic pl-4 border-l-4 border-ocean-blue/30">
                Opening quote from teacher to introduce the video - image as placeholder for lazy loading
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Three-Stage Program - Clean StreetSmart Cards with Fun Accent */}
      <section id="how-it-works" className="py-16 lg:py-24 bg-gradient-to-b from-white to-yellow/10">
        <div className="container-width">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-navy leading-tight mb-4">A Simple <span className="text-ocean-blue">3-Stage Journey</span> to a Plastic Clever School</h2>
            <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto">
              {t('three_stage_program.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Stage 1: Inspire */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 p-6 sm:p-8 text-center -left">
              <div className="w-32 h-32 bg-ocean-blue/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <HoverVideo 
                  src={inspireVideo}
                  poster={inspireIcon}
                  alt={t('accessibility.inspire_stage_alt')}
                  className="w-30 h-30"
                  containerClassName="w-full h-full"
                />
                {/* Stage icon loaded lazily */}
              </div>
              <div className="w-8 h-8 bg-ocean-blue rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-sm">1</span>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-navy mb-4">{t('three_stage_program.stage_1_title')}</h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-6">{t('three_stage_program.stage_1_description')}</p>
            </div>

            {/* Stage 2: Investigate */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 p-6 sm:p-8 text-center ">
              <div className="w-32 h-32 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <HoverVideo 
                  src={investigateVideo}
                  poster={investigateIcon}
                  alt={t('accessibility.investigate_stage_alt')}
                  className="w-30 h-30"
                  containerClassName="w-full h-full"
                />
              </div>
              <div className="w-8 h-8 bg-teal rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-sm">2</span>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-navy mb-4">{t('three_stage_program.stage_2_title')}</h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-6">{t('three_stage_program.stage_2_description')}</p>
            </div>

            {/* Stage 3: Act */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 p-6 sm:p-8 text-center -right">
              <div className="w-32 h-32 bg-navy/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <HoverVideo 
                  src={actVideo}
                  poster={actIcon}
                  alt={t('accessibility.act_stage_alt')}
                  className="w-30 h-30"
                  containerClassName="w-full h-full"
                />
              </div>
              <div className="w-8 h-8 bg-navy rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-sm">3</span>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-navy mb-4">{t('three_stage_program.stage_3_title')}</h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-6">{t('three_stage_program.stage_3_description')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Ready to Make a Difference CTA */}
      <section className="py-16 lg:py-24 bg-pcs_blue">
        <div className="container-width text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-6" data-testid="text-cta-heading">
            Ready to Make a Difference?
          </h2>
          <p className="text-base sm:text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of schools worldwide in creating a plastic-clever future
          </p>
          <Button 
            size="lg"
            className="bg-white text-pcs_blue hover:bg-gray-100 px-6 py-3 sm:px-8 sm:py-4 text-lg sm:text-xl font-semibold group transition-all duration-300 hover:scale-105 min-h-[44px]"
            onClick={() => window.location.href = '/register'}
            data-testid="button-cta-register"
          >
            Register Your School
            <ArrowRight className="w-5 h-5 ml-3 transition-transform duration-300 group-hover:translate-x-1" />
          </Button>
        </div>
      </section>

      {/* Instagram Feed Section */}
      <section className="py-16 lg:py-24 bg-gradient-to-b from-teal/5 to-ocean-blue/5">
        <div className="container-width">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-navy leading-tight mb-4">Follow <span className="text-ocean-blue">Our Journey</span></h2>
            <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto">
              {t('instagram.description')}
            </p>
            <div className="flex justify-center mt-6">
              <a 
                href="https://instagram.com/plasticclever.schools" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 text-white rounded-lg font-semibold hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl min-h-[44px]"
                data-testid="button-follow-instagram"
              >
                <Instagram className="w-5 h-5" />
                <span className="hidden sm:inline">Follow @plasticclever.schools</span>
                <span className="sm:hidden">Follow Us</span>
              </a>
            </div>
          </div>
          
          <div className="">
            <Suspense fallback={
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ocean-blue"></div>
              </div>
            }>
              <InstagramCarousel />
            </Suspense>
          </div>
          
          <div className="text-center mt-12 ">
            <p className="text-base text-gray-600 leading-relaxed text-gray-600 mb-6">
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 ">
            <div>
              <OptimizedImage 
                src={logoUrl} 
                alt={t('accessibility.plastic_clever_schools_logo_alt')} 
                width={120}
                height={40}
                className="h-10 w-auto mb-4 brightness-0 invert" 
                responsive={false}
                quality={90}
                sizes="120px"
                priority={false}
              />
              <p className="text-gray-300 text-sm sm:text-base">
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
          
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-400 ">
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

      {/* Connection Speed Control */}
      <ConnectionSpeedControl />
    </div>
  );
}