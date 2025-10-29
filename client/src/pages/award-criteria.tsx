import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, FileText, ClipboardCheck, Target, Award, Star } from "lucide-react";
import { Footer } from "@/components/Footer";

export default function AwardCriteria() {
  const { t } = useTranslation('landing');

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-gradient-to-br from-teal to-ocean-blue text-white">
        <div className="container-width">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-6">
              <Award className="w-20 h-20 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6" data-testid="text-page-title">
              Award Criteria
            </h1>
            <p className="text-xl md:text-2xl text-white/90 leading-relaxed">
              Clear, achievable goals for each stage of your plastic reduction journey
            </p>
          </div>
        </div>
      </section>

      {/* Introduction */}
      <section className="py-16 bg-gray-50">
        <div className="container-width">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-navy mb-4">
              Earning Your Award
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed mb-8">
              The Plastic Clever Schools Award recognizes your commitment to reducing plastic waste. Complete all three stages to earn your official certification and join schools worldwide making a difference.
            </p>
            <div className="inline-flex items-center gap-4 bg-white p-6 rounded-lg shadow-md">
              <Star className="w-12 h-12 text-yellow fill-current" />
              <div className="text-left">
                <p className="font-bold text-navy text-lg">Complete Recognition</p>
                <p className="text-gray-600">Digital certificate + Physical award badge</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stage Requirements */}
      <section className="py-16 bg-white">
        <div className="container-width">
          <div className="max-w-5xl mx-auto space-y-12">
            
            {/* Stage 1: Inspire */}
            <Card className="border-2 border-pcs_blue/20 hover:border-pcs_blue/40 transition-all duration-300" data-testid="card-inspire-criteria">
              <CardHeader className="bg-pcs_blue/5">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-pcs_blue rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-2xl">1</span>
                  </div>
                  <div>
                    <CardTitle className="text-2xl text-navy">Stage 1: Inspire</CardTitle>
                    <p className="text-gray-600 mt-1">Build awareness and understanding</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="font-bold text-lg text-navy mb-3 flex items-center gap-2">
                      <Target className="w-5 h-5 text-pcs_blue" />
                      Completion Requirements
                    </h3>
                    <div className="bg-pcs_blue/5 p-4 rounded-lg border-l-4 border-pcs_blue">
                      <p className="font-semibold text-navy mb-2">
                        Submit 3 approved pieces of evidence showing student learning about plastic pollution
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-lg text-navy mb-3">Evidence Examples</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-pcs_blue mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Photos of classroom discussions</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-pcs_blue mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Student artwork or posters</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-pcs_blue mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Written reflections or essays</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-pcs_blue mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Videos of presentations</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-pcs_blue mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Assembly or event photos</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-pcs_blue mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Research projects</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stage 2: Investigate */}
            <Card className="border-2 border-teal/20 hover:border-teal/40 transition-all duration-300" data-testid="card-investigate-criteria">
              <CardHeader className="bg-teal/5">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-teal rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-2xl">2</span>
                  </div>
                  <div>
                    <CardTitle className="text-2xl text-navy">Stage 2: Investigate</CardTitle>
                    <p className="text-gray-600 mt-1">Understand your plastic footprint</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="font-bold text-lg text-navy mb-3 flex items-center gap-2">
                      <Target className="w-5 h-5 text-teal" />
                      Completion Requirements
                    </h3>
                    <div className="bg-teal/5 p-4 rounded-lg border-l-4 border-teal space-y-3">
                      <div className="flex items-start gap-2">
                        <Badge className="bg-teal text-white mt-0.5">Required</Badge>
                        <p className="font-semibold text-navy">
                          Complete plastic waste audit quiz
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge className="bg-teal text-white mt-0.5">Required</Badge>
                        <p className="font-semibold text-navy">
                          Create an action plan (reduction promises)
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="border-teal text-teal mt-0.5">Optional</Badge>
                        <p className="font-semibold text-navy">
                          Submit 2 additional pieces of evidence
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 pt-2 border-t">
                        <strong>Note:</strong> Complete at least 2 items from the above to progress
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-lg text-navy mb-3">Evidence Examples</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-teal mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Completed audit forms</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-teal mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Data collection photos</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-teal mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Charts and graphs</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-teal mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Survey results</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-teal mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Action plan documents</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-teal mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Team meeting photos</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stage 3: Act */}
            <Card className="border-2 border-coral/20 hover:border-coral/40 transition-all duration-300" data-testid="card-act-criteria">
              <CardHeader className="bg-coral/5">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-coral rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-2xl">3</span>
                  </div>
                  <div>
                    <CardTitle className="text-2xl text-navy">Stage 3: Act</CardTitle>
                    <p className="text-gray-600 mt-1">Make real change happen</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="font-bold text-lg text-navy mb-3 flex items-center gap-2">
                      <Target className="w-5 h-5 text-coral" />
                      Completion Requirements
                    </h3>
                    <div className="bg-coral/5 p-4 rounded-lg border-l-4 border-coral">
                      <p className="font-semibold text-navy mb-2">
                        Submit 3 approved pieces of evidence showing plastic reduction initiatives in action
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-lg text-navy mb-3">Evidence Examples</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-coral mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Before and after photos</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-coral mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Campaign materials</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-coral mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Implementation photos</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-coral mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Impact measurements</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-coral mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Community engagement events</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-coral mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Student testimonials</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </section>

      {/* Evidence Guidelines */}
      <section className="py-16 bg-gray-50">
        <div className="container-width">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-navy text-center mb-8">
              Evidence Submission Guidelines
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <FileText className="w-10 h-10 text-pcs_blue mb-4" />
                  <h3 className="font-bold text-lg text-navy mb-2">Accepted Formats</h3>
                  <p className="text-gray-600 text-sm">
                    Photos, videos, documents, and links to online content
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <ClipboardCheck className="w-10 h-10 text-teal mb-4" />
                  <h3 className="font-bold text-lg text-navy mb-2">Quality Standards</h3>
                  <p className="text-gray-600 text-sm">
                    Clear, relevant evidence that demonstrates student involvement
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <Award className="w-10 h-10 text-coral mb-4" />
                  <h3 className="font-bold text-lg text-navy mb-2">Approval Process</h3>
                  <p className="text-gray-600 text-sm">
                    Our team reviews submissions within 5 working days
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-teal to-ocean-blue text-white">
        <div className="container-width text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Start Your Award Journey Today
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join schools worldwide earning recognition for their environmental action
          </p>
          <Button 
            size="lg"
            className="bg-white text-teal hover:bg-gray-100 px-8 py-4 text-xl font-semibold group transition-all duration-300 hover:scale-105"
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
