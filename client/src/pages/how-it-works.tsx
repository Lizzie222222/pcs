import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Lightbulb, Search, Rocket, Award, CheckCircle, Users } from "lucide-react";
import { Footer } from "@/components/Footer";
import inspireIcon from "@assets/PSC - Inspire_1760461719847.png";
import investigateIcon from "@assets/PSC - Investigate_1760461719848.png";
import actIcon from "@assets/PSC - Act_1760461719847.png";

export default function HowItWorks() {
  const { t } = useTranslation('landing');

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-gradient-to-br from-pcs_blue to-ocean-blue text-white">
        <div className="container-width">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6" data-testid="text-page-title">
              How it works
            </h1>
            <p className="text-xl md:text-2xl text-white/90 leading-relaxed">
              A simple three-stage journey that empowers students to make a real difference in reducing plastic waste
            </p>
          </div>
        </div>
      </section>

      {/* Overview Section */}
      <section className="py-16 bg-gray-50">
        <div className="container-width">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold text-navy mb-4">
              The Plastic Clever Schools award
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              Our programme is designed to be student-led, engaging, and achievable. Schools progress through three distinct stages, each building on the last to create lasting change.
            </p>
          </div>

          {/* Process Timeline */}
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Stage 1: Inspire */}
              <Card className="relative overflow-hidden hover:shadow-xl transition-all duration-300" data-testid="card-stage-inspire">
                <div className="absolute top-0 right-0 w-24 h-24 bg-pcs_blue/10 rounded-bl-full"></div>
                <CardContent className="pt-8 pb-6 px-6">
                  <div className="w-32 h-32 bg-ocean-blue/10 rounded-full flex items-center justify-center mx-auto mb-6 p-6">
                    <img 
                      src={inspireIcon}
                      alt="Inspire Stage"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="w-12 h-12 bg-pcs_blue rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-xl">1</span>
                  </div>
                  <h3 className="text-2xl font-bold text-navy text-center mb-4">Inspire</h3>
                  <p className="text-gray-600 text-center leading-relaxed mb-6">
                    Students learn about plastic pollution and its impact on our planet through engaging activities and resources.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-pcs_blue mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Watch educational videos</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-pcs_blue mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Discuss plastic pollution</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-pcs_blue mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Share evidence of learning</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stage 2: Investigate */}
              <Card className="relative overflow-hidden hover:shadow-xl transition-all duration-300" data-testid="card-stage-investigate">
                <div className="absolute top-0 right-0 w-24 h-24 bg-teal/10 rounded-bl-full"></div>
                <CardContent className="pt-8 pb-6 px-6">
                  <div className="w-32 h-32 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-6 p-6">
                    <img 
                      src={investigateIcon}
                      alt="Investigate Stage"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="w-12 h-12 bg-teal rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-xl">2</span>
                  </div>
                  <h3 className="text-2xl font-bold text-navy text-center mb-4">Investigate</h3>
                  <p className="text-gray-600 text-center leading-relaxed mb-6">
                    Students conduct a plastic waste audit to understand their school's plastic footprint and identify areas for improvement.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-teal mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Complete plastic waste audit</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-teal mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Create action plan</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-teal mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Submit evidence of research</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stage 3: Act */}
              <Card className="relative overflow-hidden hover:shadow-xl transition-all duration-300" data-testid="card-stage-act">
                <div className="absolute top-0 right-0 w-24 h-24 bg-coral/10 rounded-bl-full"></div>
                <CardContent className="pt-8 pb-6 px-6">
                  <div className="w-32 h-32 bg-navy/10 rounded-full flex items-center justify-center mx-auto mb-6 p-6">
                    <img 
                      src={actIcon}
                      alt="Act Stage"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="w-12 h-12 bg-coral rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-xl">3</span>
                  </div>
                  <h3 className="text-2xl font-bold text-navy text-center mb-4">Act</h3>
                  <p className="text-gray-600 text-center leading-relaxed mb-6">
                    Students implement their action plan, making real changes to reduce plastic waste in their school.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-coral mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Implement reduction initiatives</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-coral mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Engage the school community</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-coral mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Document your impact</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="py-16 bg-white">
        <div className="container-width">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-navy text-center mb-12">
              What makes our programme special
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-pcs_blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-pcs_blue" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-navy mb-2">Student-Led</h3>
                  <p className="text-gray-600">
                    Students take ownership of the journey, developing leadership skills and environmental awareness.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-teal/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Award className="w-6 h-6 text-teal" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-navy mb-2">Achievement Recognition</h3>
                  <p className="text-gray-600">
                    Schools earn official recognition and awards as they progress through each stage.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-coral/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-6 h-6 text-coral" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-navy mb-2">Free Resources</h3>
                  <p className="text-gray-600">
                    Access a comprehensive library of educational materials, templates, and tools.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-navy/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Rocket className="w-6 h-6 text-navy" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-navy mb-2">Measurable Impact</h3>
                  <p className="text-gray-600">
                    Track progress and see the real difference your school is making to the planet.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-pcs_blue to-ocean-blue text-white">
        <div className="container-width text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to start your journey?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of schools worldwide making a difference
          </p>
          <Button 
            size="lg"
            className="bg-white text-pcs_blue hover:bg-gray-100 px-8 py-4 text-xl font-semibold group transition-all duration-300 hover:scale-105"
            onClick={() => window.location.href = '/register'}
            data-testid="button-register-cta"
          >
            Register your school
            <ArrowRight className="w-5 h-5 ml-3 transition-transform duration-300 group-hover:translate-x-1" />
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
