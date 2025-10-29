import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Heart, Globe, Users, Target, ArrowRight } from "lucide-react";
import { Footer } from "@/components/Footer";
import commonSeasLogo from "@assets/common-seas_1759934515099.png";
import kidsAgainstPlasticLogo from "@assets/KAP-logo-png-300x300_1759934515099.png";
import riverCleanupLogo from "@assets/RiverCleanup_logo_rgb_pos-WhiteBG-01-2-256x256_1759934515099.png";

export default function Partners() {
  const { t } = useTranslation('landing');

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-gradient-to-br from-navy to-pcs_blue text-white">
        <div className="container-width">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-6">
              <Heart className="w-20 h-20 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6" data-testid="text-page-title">
              Our Partners
            </h1>
            <p className="text-xl md:text-2xl text-white/90 leading-relaxed">
              Working together to create a plastic-free future for our schools and oceans
            </p>
          </div>
        </div>
      </section>

      {/* Introduction */}
      <section className="py-16 bg-gray-50">
        <div className="container-width">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-navy mb-4">
              Stronger Together
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              Plastic Clever Schools is proud to collaborate with leading organizations dedicated to tackling plastic pollution. Together, we're empowering students worldwide to take action for our planet.
            </p>
          </div>
        </div>
      </section>

      {/* Main Partners */}
      <section className="py-16 bg-white">
        <div className="container-width">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-navy text-center mb-12">
              Founding Partners
            </h2>
            
            <div className="space-y-12">
              {/* Common Seas */}
              <Card className="overflow-hidden hover:shadow-xl transition-all duration-300" data-testid="card-partner-common-seas">
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-gray-50 flex items-center justify-center p-8 md:p-12">
                      <img 
                        src={commonSeasLogo}
                        alt="Common Seas"
                        className="w-full max-w-[200px] h-auto object-contain"
                      />
                    </div>
                    <div className="md:col-span-2 p-8">
                      <h3 className="text-2xl font-bold text-navy mb-4">Common Seas</h3>
                      <p className="text-gray-600 leading-relaxed mb-6">
                        Common Seas is a UK charity on a mission to stop plastic pollution at source. They work with businesses, governments, and communities to reduce single-use plastic and protect our oceans. As a founding partner of Plastic Clever Schools, Common Seas provides expertise, resources, and support to help schools make meaningful change.
                      </p>
                      <div className="space-y-3 mb-6">
                        <div className="flex items-start gap-2">
                          <Globe className="w-5 h-5 text-pcs_blue mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Leading the global movement against plastic pollution</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Target className="w-5 h-5 text-pcs_blue mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Working with major brands to eliminate unnecessary plastic</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Users className="w-5 h-5 text-pcs_blue mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Empowering communities to create plastic-free environments</span>
                        </div>
                      </div>
                      <Button 
                        variant="outline"
                        className="group"
                        onClick={() => window.open('https://commonseas.com/', '_blank')}
                        data-testid="button-visit-common-seas"
                      >
                        Visit Website
                        <ExternalLink className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Kids Against Plastic */}
              <Card className="overflow-hidden hover:shadow-xl transition-all duration-300" data-testid="card-partner-kids-against-plastic">
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-gray-50 flex items-center justify-center p-8 md:p-12">
                      <img 
                        src={kidsAgainstPlasticLogo}
                        alt="Kids Against Plastic"
                        className="w-full max-w-[200px] h-auto object-contain"
                      />
                    </div>
                    <div className="md:col-span-2 p-8">
                      <h3 className="text-2xl font-bold text-navy mb-4">Kids Against Plastic</h3>
                      <p className="text-gray-600 leading-relaxed mb-6">
                        Kids Against Plastic is a youth-led organization founded by sisters Amy and Ella Meek when they were just 10 and 12 years old. They inspire and support young people to take action against plastic pollution through education, campaigns, and the Plastic Clever Schools program. Their passion and energy drive real change in schools and communities.
                      </p>
                      <div className="space-y-3 mb-6">
                        <div className="flex items-start gap-2">
                          <Globe className="w-5 h-5 text-teal mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Youth-led movement with global impact</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Target className="w-5 h-5 text-teal mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Created the Plastic Clever Schools award program</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Users className="w-5 h-5 text-teal mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Empowering young environmental leaders worldwide</span>
                        </div>
                      </div>
                      <Button 
                        variant="outline"
                        className="group"
                        onClick={() => window.open('https://kidsagainstplastic.co.uk/', '_blank')}
                        data-testid="button-visit-kids-against-plastic"
                      >
                        Visit Website
                        <ExternalLink className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Supporting Partner */}
      <section className="py-16 bg-gray-50">
        <div className="container-width">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-navy text-center mb-12">
              Supporting Partners
            </h2>
            
            {/* River Cleanup */}
            <Card className="overflow-hidden hover:shadow-xl transition-all duration-300" data-testid="card-partner-river-cleanup">
              <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-gray-50 flex items-center justify-center p-8 md:p-12">
                    <img 
                      src={riverCleanupLogo}
                      alt="River Cleanup"
                      className="w-full max-w-[200px] h-auto object-contain"
                    />
                  </div>
                  <div className="md:col-span-2 p-8">
                    <h3 className="text-2xl font-bold text-navy mb-4">River Cleanup</h3>
                    <p className="text-gray-600 leading-relaxed mb-6">
                      River Cleanup is a Belgian organization working to rid rivers and oceans of plastic waste. Through innovative cleanup technologies and community engagement, they prevent plastic from reaching our seas. Their partnership with Plastic Clever Schools helps students understand the connection between local action and global ocean health.
                    </p>
                    <div className="space-y-3 mb-6">
                      <div className="flex items-start gap-2">
                        <Globe className="w-5 h-5 text-ocean-blue mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">Innovative river cleanup technology and methods</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Target className="w-5 h-5 text-ocean-blue mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">Preventing plastic from reaching our oceans</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Users className="w-5 h-5 text-ocean-blue mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">Engaging communities in river conservation</span>
                      </div>
                    </div>
                    <Button 
                      variant="outline"
                      className="group"
                      onClick={() => window.open('https://www.river-cleanup.org/en', '_blank')}
                      data-testid="button-visit-river-cleanup"
                    >
                      Visit Website
                      <ExternalLink className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Partnership Impact */}
      <section className="py-16 bg-white">
        <div className="container-width">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-navy text-center mb-12">
              Partnership Impact
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="text-center">
                <CardContent className="pt-8 pb-6">
                  <div className="w-16 h-16 bg-pcs_blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Globe className="w-8 h-8 text-pcs_blue" />
                  </div>
                  <h3 className="text-3xl font-bold text-navy mb-2">Global</h3>
                  <p className="text-gray-600">Reach across multiple countries and continents</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-8 pb-6">
                  <div className="w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-teal" />
                  </div>
                  <h3 className="text-3xl font-bold text-navy mb-2">Collaborative</h3>
                  <p className="text-gray-600">Shared expertise and resources</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-8 pb-6">
                  <div className="w-16 h-16 bg-coral/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Target className="w-8 h-8 text-coral" />
                  </div>
                  <h3 className="text-3xl font-bold text-navy mb-2">Impactful</h3>
                  <p className="text-gray-600">Measurable reduction in plastic waste</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-navy to-pcs_blue text-white">
        <div className="container-width text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Join Our Growing Community
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Backed by world-class partners, supported by passionate educators
          </p>
          <Button 
            size="lg"
            className="bg-white text-navy hover:bg-gray-100 px-8 py-4 text-xl font-semibold group transition-all duration-300 hover:scale-105"
            onClick={() => window.location.href = '/register'}
            data-testid="button-register-cta"
          >
            Register Your School
            <ArrowRight className="w-5 h-5 ml-3 transition-transform duration-300 group-hover:translate-x-1" />
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
