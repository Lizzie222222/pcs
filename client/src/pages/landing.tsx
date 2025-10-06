import { useState, useRef, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useConnectionSpeed } from "@/hooks/useConnectionSpeed";
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
          quality={80}
          placeholder="blur"
          blurDataURL={createBlurPlaceholder('#f3f4f6')}
          sizes="(max-width: 640px) 128px, (max-width: 1024px) 160px, 160px"
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
            className="w-full h-full object-cover"
            priority={true}
            responsive={true}
            quality={85}
            sizes="100vw"
            placeholder="blur"
            blurDataURL={createBlurPlaceholder('#f3f4f6')}
          />
        </div>

        {/* Post-it Note Style News/Events Popup */}
        <div className="absolute top-4 right-4 md:top-8 md:right-8 z-30 max-w-xs">
          <div className="bg-yellow-100 border-l-4 border-yellow-400 p-4 shadow-lg transform rotate-1 hover:rotate-0 transition-transform duration-200" 
               style={{ 
                 boxShadow: '0 10px 20px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.10)',
                 fontFamily: '"Segoe Print", "Comic Sans MS", cursive'
               }}
               data-testid="popup-news-event">
            <div className="flex items-start gap-2">
              <Star className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-1">Latest News!</p>
                <p className="text-xs text-gray-700">Join our growing community of Plastic Clever Schools</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="container-width relative z-20 py-20">
          <div className="max-w-4xl mx-auto text-center">
            {/* Hero Text Box with Semi-transparent Background */}
            <div className="bg-white/90 backdrop-blur-sm rounded-lg px-8 py-10 md:px-12 md:py-12 inline-block">
              {/* Hero Heading */}
              <h1 
                className="text-4xl lg:text-5xl xl:text-6xl font-bold mb-8 text-navy leading-tight"
                data-testid="text-hero-title"
              >
                {t('hero.title')}
              </h1>

              {/* CTA Button with Enhanced Animation */}
              <Button 
                size="lg"
                className="btn-primary px-8 py-4 text-xl mb-8 group"
                onClick={() => window.location.href = '/register'}
                data-testid="button-register-school"
              >
                {t('hero.cta_primary')}
                <ArrowRight className="w-5 h-5 ml-3 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>

              {/* Simple Trust Indicators */}
              <div className="flex flex-wrap justify-center items-center gap-6 text-base text-gray-700 font-medium">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-ocean-blue" />
                  {t('hero.trust_indicators.curriculum_aligned')}
                </div>
                <div className="flex items-center gap-2">
                  <Recycle className="w-4 h-4 text-teal" />
                  {t('hero.trust_indicators.proven_impact')}
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-coral" />
                  {t('hero.trust_indicators.completely_free')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Ribbon - Database-driven stats */}
      <section className="py-6 bg-navy">
        <div className="container-width">
          <div className="flex flex-wrap justify-center items-center gap-4 md:gap-8 text-white text-center">
            <div className="flex items-center gap-2" data-testid="impact-ribbon-schools">
              <span className="text-2xl md:text-3xl font-bold">{stats?.totalSchools?.toLocaleString() || '0'}</span>
              <span className="text-sm md:text-base">schools</span>
            </div>
            <div className="hidden md:block text-2xl text-white/50">|</div>
            <div className="flex items-center gap-2" data-testid="impact-ribbon-countries">
              <span className="text-2xl md:text-3xl font-bold">{stats?.countries?.toLocaleString() || '0'}</span>
              <span className="text-sm md:text-base">countries</span>
            </div>
            <div className="hidden md:block text-2xl text-white/50">|</div>
            <div className="flex items-center gap-2" data-testid="impact-ribbon-actions">
              <span className="text-2xl md:text-3xl font-bold">{stats?.completedAwards?.toLocaleString() || '0'}</span>
              <span className="text-sm md:text-base">actions taken</span>
            </div>
          </div>
        </div>
      </section>

      {/* Three-Stage Program - Clean StreetSmart Cards with Fun Accent */}
      <section id="how-it-works" className="py-16 lg:py-24 bg-gradient-to-b from-white to-yellow/10">
        <div className="container-width">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-navy leading-tight mb-4 ">A Simple <span className="text-ocean-blue">3-Stage Journey</span> to a Plastic Clever School</h2>
            <p className="text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto ">
              {t('three_stage_program.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Stage 1: Inspire */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 p-8 text-center -left">
              <div className="w-32 h-32 bg-ocean-blue/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <HoverVideo 
                  src={inspireVideo}
                  poster={inspireIcon}
                  alt={t('accessibility.inspire_stage_alt')}
                  className="w-30 h-30"
                  containerClassName="w-full h-full"
                />
              </div>
              <div className="w-8 h-8 bg-ocean-blue rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-sm">1</span>
              </div>
              <h3 className="text-xl font-semibold text-navy mb-4">{t('three_stage_program.stage_1_title')}</h3>
              <p className="text-base text-gray-600 leading-relaxed mb-6">{t('three_stage_program.stage_1_description')}</p>
            </div>

            {/* Stage 2: Investigate */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 p-8 text-center ">
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
              <h3 className="text-xl font-semibold text-navy mb-4">{t('three_stage_program.stage_2_title')}</h3>
              <p className="text-base text-gray-600 leading-relaxed mb-6">{t('three_stage_program.stage_2_description')}</p>
            </div>

            {/* Stage 3: Act */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 p-8 text-center -right">
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
              <h3 className="text-xl font-semibold text-navy mb-4">{t('three_stage_program.stage_3_title')}</h3>
              <p className="text-base text-gray-600 leading-relaxed mb-6">{t('three_stage_program.stage_3_description')}</p>
            </div>
          </div>

          {/* Recognition Section */}
          <div className="mt-16 text-center bg-gray-50 rounded-xl p-12 -scale">
            <h3 className="text-2xl font-bold mb-4">{t('three_stage_program.recognition_title')}</h3>
            <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-3xl mx-auto">
              {t('three_stage_program.recognition_description')}
            </p>
            
            <div className="flex flex-wrap justify-center gap-6">
              <div className="flex items-center gap-3 bg-white rounded-lg px-6 py-3 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 group cursor-pointer stagger-delay-1">
                <div className="w-8 h-8 bg-ocean-blue rounded-full flex items-center justify-center transition-all duration-300 group-hover:rotate-12">
                  <Star className="w-4 h-4 text-white transition-transform duration-300 group-hover:scale-110" />
                </div>
                <span className="font-semibold text-navy transition-colors duration-300 group-hover:text-ocean-blue">{t('three_stage_program.digital_badges')}</span>
              </div>
              <div className="flex items-center gap-3 bg-white rounded-lg px-6 py-3 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 group cursor-pointer stagger-delay-2">
                <div className="w-8 h-8 bg-teal rounded-full flex items-center justify-center transition-all duration-300 group-hover:rotate-12">
                  <Award className="w-4 h-4 text-white transition-transform duration-300 group-hover:scale-110" />
                </div>
                <span className="font-semibold text-navy transition-colors duration-300 group-hover:text-teal">{t('three_stage_program.certificates')}</span>
              </div>
              <div className="flex items-center gap-3 bg-white rounded-lg px-6 py-3 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 group cursor-pointer stagger-delay-3">
                <div className="w-8 h-8 bg-navy rounded-full flex items-center justify-center transition-all duration-300 group-hover:rotate-12">
                  <TrendingUp className="w-4 h-4 text-white transition-transform duration-300 group-hover:scale-110" />
                </div>
                <span className="font-semibold text-navy transition-colors duration-300 group-hover:text-navy">{t('three_stage_program.progress_tracking')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Instagram Feed Section */}
      <section className="py-16 lg:py-24 bg-gradient-to-b from-teal/5 to-ocean-blue/5">
        <div className="container-width">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-navy leading-tight mb-4 ">Follow <span className="text-ocean-blue">Our Journey</span></h2>
            <p className="text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto ">
              {t('instagram.description')}
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