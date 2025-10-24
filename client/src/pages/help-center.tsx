import { useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import whiteLogoUrl from "@assets/PCSWhite_1761216344335.png";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Search,
  HelpCircle,
  BookOpen,
  Layers,
  Upload,
  Target,
  Award,
  Wrench,
  Mail,
  ChevronRight,
  Sparkles,
} from "lucide-react";

interface FAQ {
  question: string;
  answer: string;
}

interface Category {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
  faqs: FAQ[];
}

const categories: Category[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: BookOpen,
    description: "Learn how to join and get started with Plastic Clever Schools",
    color: "bg-pcs_blue",
    faqs: [
      {
        question: "How do I register my school for the Plastic Clever Schools program?",
        answer: "To register your school, click on the 'Register' button in the navigation menu. You'll need to provide your school details, contact information, and select your country. Once registered, you'll receive a confirmation email with next steps to complete your profile and start the program."
      },
      {
        question: "Who can participate in the Plastic Clever Schools program?",
        answer: "The program is open to all schools worldwide - primary, secondary, and higher education institutions. Teachers, administrators, and school staff can register their school and create teams. Students participate through their teachers' accounts and can contribute to evidence submission and action plans."
      },
      {
        question: "Is there a cost to join the program?",
        answer: "No! The Plastic Clever Schools program is completely free for all participating schools. We believe that environmental education should be accessible to everyone. All resources, tools, certificates, and support are provided at no cost."
      },
      {
        question: "Can multiple teachers from the same school participate?",
        answer: "Absolutely! We encourage multiple teachers to join from the same school. The first teacher creates the school account, and then they can invite other teachers to join the team through the Team Management section in the dashboard. This allows for collaborative efforts across different classes and year groups."
      },
      {
        question: "What age groups is the program suitable for?",
        answer: "The Plastic Clever Schools program is designed for students aged 5-18 years. Resources and activities are available for different age ranges (5-7 years, 8-11 years, 12-16 years, and 17+ years), so you can choose materials appropriate for your students' level."
      },
    ]
  },
  {
    id: "program-stages",
    title: "Program Stages",
    icon: Layers,
    description: "Understanding the Inspire, Investigate, and Act stages",
    color: "bg-teal",
    faqs: [
      {
        question: "What are the three stages of the program?",
        answer: "The program consists of three progressive stages: 1) INSPIRE - Learn about plastic pollution and its impact through educational resources and activities. 2) INVESTIGATE - Conduct a plastic waste audit at your school to understand your current plastic usage. 3) ACT - Create and implement an action plan to reduce plastic waste at your school."
      },
      {
        question: "Can we start at any stage or must we complete them in order?",
        answer: "We strongly recommend completing the stages in order (Inspire → Investigate → Act) as each stage builds upon the previous one. The Inspire stage provides essential knowledge, the Investigate stage helps you understand your specific situation, and the Act stage enables you to make informed changes. However, schools with existing plastic reduction initiatives may request to skip directly to later stages."
      },
      {
        question: "How long does each stage take to complete?",
        answer: "The timeline varies by school. Typically: INSPIRE (2-4 weeks) - Time to explore resources and engage students with the topic. INVESTIGATE (3-6 weeks) - Conducting the waste audit and analyzing results. ACT (Ongoing) - Implementing your action plan is a continuous journey. Most schools complete all three stages within one academic term (12-16 weeks)."
      },
      {
        question: "What happens after we complete all three stages?",
        answer: "After completing all three stages, your school receives a Plastic Clever Schools certificate! You can continue tracking your impact, update your action plan, submit new evidence of your initiatives, and share your success story to inspire other schools. Many schools also progress to more advanced sustainability projects."
      },
    ]
  },
  {
    id: "evidence-submission",
    title: "Evidence Submission",
    icon: Upload,
    description: "Guidelines for submitting photos, videos, and documentation",
    color: "bg-coral",
    faqs: [
      {
        question: "What evidence do I need to submit for each stage?",
        answer: "INSPIRE: Submit photos or videos of classroom activities, student projects, or presentations about plastic pollution. INVESTIGATE: Upload your completed waste audit form with photos of the audit process and data collected. ACT: Provide evidence of your action plan implementation - before/after photos, videos of initiatives, student testimonials, and impact measurements."
      },
      {
        question: "What file formats are accepted for evidence?",
        answer: "We accept the following formats: Images (JPEG, PNG, GIF up to 10MB each), Videos (MP4, MOV up to 100MB, or YouTube/Vimeo links), Documents (PDF up to 10MB). For large video files, we recommend uploading to YouTube or Vimeo and sharing the link instead."
      },
      {
        question: "How long does evidence approval take?",
        answer: "Our team reviews all submitted evidence within 3-5 business days. You'll receive an email notification once your evidence is reviewed. If approved, you can proceed to the next stage. If revisions are needed, we'll provide clear feedback on what to improve and you can resubmit."
      },
      {
        question: "Can we submit evidence in languages other than English?",
        answer: "Yes! We welcome evidence submissions in any language. While our platform interface is available in multiple languages, evidence can be submitted in your school's primary language. If needed, our review team can use translation tools to assess the content."
      },
      {
        question: "What makes good quality evidence?",
        answer: "Good evidence is clear, authentic, and demonstrates genuine student engagement. Include: Clear photos showing activities or results, Student involvement visible in images/videos, Brief captions explaining what's shown, Authentic work (not staged photos), and Measurement data where applicable (e.g., kilograms of plastic reduced)."
      },
    ]
  },
  {
    id: "action-plans",
    title: "Action Plans",
    icon: Target,
    description: "Creating and tracking your plastic reduction initiatives",
    color: "bg-purple-600",
    faqs: [
      {
        question: "What is an action plan and how do I create one?",
        answer: "An action plan is your school's commitment to reducing plastic waste. To create one, go to the 'Act' stage in your dashboard and click 'Create Action Plan'. You'll define specific, measurable goals (e.g., 'Eliminate single-use plastic bottles from the cafeteria'), set timelines, assign responsibilities, and outline the steps to achieve your goals. Include how you'll measure success and involve students in the planning process."
      },
      {
        question: "How do we track our plastic reduction impact?",
        answer: "Track impact through the dashboard's tracking tools: Log baseline measurements from your audit, record weekly or monthly progress updates, upload photos of implemented changes, input quantitative data (items reduced, weight of plastic saved), and document student participation numbers. The system generates charts and reports showing your progress over time."
      },
      {
        question: "How should students be involved in the action plan?",
        answer: "Student involvement is crucial! Engage students by: Including them in planning discussions and decisions, Assigning student roles (waste monitors, awareness ambassadors), Having students lead awareness campaigns, Encouraging student-designed solutions and initiatives, and Letting students track and report progress. Student ownership makes initiatives more successful and educational."
      },
      {
        question: "Can we modify our action plan after submission?",
        answer: "Yes, action plans are living documents! You can update your action plan at any time through your dashboard. We encourage schools to refine their plans based on what works, add new initiatives, adjust timelines, and update goals as you progress. Each update is saved in your version history."
      },
    ]
  },
  {
    id: "awards-certificates",
    title: "Awards & Certificates",
    icon: Award,
    description: "Earning recognition and downloading certificates",
    color: "bg-amber-500",
    faqs: [
      {
        question: "How do we earn our Plastic Clever Schools certificate?",
        answer: "To earn your certificate, complete all three program stages: 1) Submit and get approval for INSPIRE stage evidence, 2) Complete and submit your plastic waste audit (INVESTIGATE stage), 3) Create an action plan and submit evidence of implementation (ACT stage). Once all stages are approved, you can download your certificate from the dashboard."
      },
      {
        question: "When will we receive our certificate?",
        answer: "Your certificate is available for immediate download once you complete all three stages and receive approval for your final evidence submission. You'll receive an email notification when your certificate is ready. The certificate includes your school name, completion date, and a unique verification code."
      },
      {
        question: "Can we download multiple copies of our certificate?",
        answer: "Yes! Once earned, you can download your certificate as many times as needed from your dashboard. The certificate is provided as a high-resolution PDF suitable for printing and display. You can print copies for your school reception, classrooms, or to share with stakeholders."
      },
      {
        question: "Are there different levels of achievement or awards?",
        answer: "Currently, all schools that complete the three stages earn the Plastic Clever Schools certificate. However, we showcase outstanding initiatives in our 'Inspiration' section where schools can share detailed case studies. Schools with exceptional impact or innovative solutions may be featured as spotlight schools on our website and social media."
      },
    ]
  },
  {
    id: "technical-support",
    title: "Technical Support",
    icon: Wrench,
    description: "Troubleshooting login issues and platform features",
    color: "bg-gray-700",
    faqs: [
      {
        question: "I'm having trouble logging in. What should I do?",
        answer: "First, ensure you're using the correct email address registered with your account. Click 'Forgot Password?' to reset your password. If you registered using Google, click 'Sign in with Google' instead of using email/password. Clear your browser cache and cookies if issues persist. If you still can't access your account, contact us through the Contact page with your school name and registered email."
      },
      {
        question: "How do I invite other teachers to join my school's team?",
        answer: "Go to your Dashboard → Team Management → Invite Teachers. Enter the teacher's email address and click 'Send Invitation'. They'll receive an email with a unique invitation link to join your school's team. You can track pending invitations and manage team members from the Team Management page."
      },
      {
        question: "Can I change my school's information after registration?",
        answer: "Yes, you can update most school information from your dashboard. Go to Settings or School Profile to edit details like school address, contact information, and description. Some core details (like country) may require admin approval to change. Contact support if you need to make significant changes."
      },
      {
        question: "The uploaded image/video isn't displaying correctly. What's wrong?",
        answer: "This usually happens due to file format or size issues. Ensure your files meet requirements: Images - JPEG, PNG, or GIF under 10MB; Videos - MP4 or MOV under 100MB. Try compressing large files or use a different format. For videos, consider uploading to YouTube/Vimeo and sharing the link instead. If problems persist, contact technical support."
      },
      {
        question: "Is my school's data secure and private?",
        answer: "Yes! We take data security seriously. All data is encrypted in transit and at rest. We only collect information necessary for program participation. School information is visible in our school map, but contact details remain private. Student names and personal information are never publicly displayed. Read our Privacy Policy for full details."
      },
    ]
  },
];

export default function HelpCenter() {
  const { t } = useTranslation('landing');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filter FAQs based on search query
  const filteredCategories = categories.map(category => ({
    ...category,
    faqs: category.faqs.filter(faq => 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => 
    searchQuery === "" || category.faqs.length > 0
  );

  // If a category is selected, show only that category
  const displayCategories = selectedCategory
    ? filteredCategories.filter(cat => cat.id === selectedCategory)
    : filteredCategories;

  // Count total FAQs
  const totalFAQs = categories.reduce((sum, cat) => sum + cat.faqs.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-pcs_blue via-ocean-blue to-navy py-16 px-4 mt-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <HelpCircle className="h-12 w-12 text-white" />
            <h1 
              className="text-4xl md:text-5xl font-bold text-white"
              data-testid="text-help-center-title"
            >
              Help Center
            </h1>
          </div>
          <p 
            className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-8"
            data-testid="text-help-center-subtitle"
          >
            Find answers to frequently asked questions about the Plastic Clever Schools program
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search for answers... (e.g., 'how to register', 'evidence submission')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-6 text-lg bg-white border-0 shadow-lg"
                data-testid="input-search-faqs"
              />
            </div>
            {searchQuery && (
              <p className="text-white/80 text-sm mt-3" data-testid="text-search-results">
                Found {filteredCategories.reduce((sum, cat) => sum + cat.faqs.length, 0)} matching questions
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Category Filter Pills */}
        {!searchQuery && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-pcs_blue" />
              <h2 className="text-xl font-semibold text-navy">Browse by Category</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                onClick={() => setSelectedCategory(null)}
                className={selectedCategory === null ? "bg-pcs_blue hover:bg-pcs_blue/90" : ""}
                data-testid="filter-all-categories"
              >
                All Categories ({totalFAQs})
              </Button>
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? "default" : "outline"}
                    onClick={() => setSelectedCategory(category.id)}
                    className={selectedCategory === category.id ? `${category.color} hover:opacity-90 text-white` : ""}
                    data-testid={`filter-category-${category.id}`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {category.title} ({category.faqs.length})
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* FAQ Categories */}
        <div className="space-y-8">
          {displayCategories.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No results found</h3>
                <p className="text-gray-500 mb-4">
                  We couldn't find any FAQs matching "{searchQuery}"
                </p>
                <Button
                  variant="outline"
                  onClick={() => setSearchQuery("")}
                  data-testid="button-clear-search"
                >
                  Clear Search
                </Button>
              </CardContent>
            </Card>
          ) : (
            displayCategories.map((category) => {
              const Icon = category.icon;
              return (
                <Card 
                  key={category.id} 
                  className="overflow-hidden border-2 hover:shadow-lg transition-shadow"
                  data-testid={`category-${category.id}`}
                >
                  <CardHeader className={`${category.color} text-white`}>
                    <div className="flex items-center gap-3">
                      <div className="bg-white/20 p-3 rounded-lg">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl" data-testid={`title-${category.id}`}>
                          {category.title}
                        </CardTitle>
                        <CardDescription className="text-white/90 mt-1" data-testid={`description-${category.id}`}>
                          {category.description}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="ml-auto">
                        {category.faqs.length} questions
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Accordion type="multiple" className="w-full">
                      {category.faqs.map((faq, index) => (
                        <AccordionItem 
                          key={index} 
                          value={`${category.id}-${index}`}
                          className="border-b last:border-b-0 px-6"
                        >
                          <AccordionTrigger 
                            className="text-left hover:no-underline py-5"
                            data-testid={`question-${category.id}-${index}`}
                          >
                            <div className="flex items-start gap-3 pr-4">
                              <HelpCircle className="h-5 w-5 text-pcs_blue mt-0.5 flex-shrink-0" />
                              <span className="font-medium text-navy">
                                {faq.question}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent 
                            className="text-gray-600 pb-5 pl-8"
                            data-testid={`answer-${category.id}-${index}`}
                          >
                            {faq.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Still Have Questions Section */}
        <Card className="mt-12 bg-gradient-to-br from-ocean-light/30 to-pcs_blue/10 border-2 border-pcs_blue/20">
          <CardContent className="p-8 md:p-12 text-center">
            <div className="max-w-2xl mx-auto">
              <div className="bg-pcs_blue/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="h-10 w-10 text-pcs_blue" />
              </div>
              <h2 
                className="text-3xl font-bold text-navy mb-4"
                data-testid="text-still-questions-title"
              >
                Still Have Questions?
              </h2>
              <p className="text-lg text-gray-600 mb-6" data-testid="text-still-questions-description">
                Can't find the answer you're looking for? Our friendly support team is here to help you with any questions about the Plastic Clever Schools program.
              </p>
              <Link href="/contact">
                <Button 
                  size="lg" 
                  className="bg-coral hover:bg-coral/90 text-white text-lg px-8 py-6"
                  data-testid="button-contact-us"
                >
                  <Mail className="h-5 w-5 mr-2" />
                  Contact Us
                  <ChevronRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
              <p className="text-sm text-gray-500 mt-4">
                We typically respond within 24-48 hours
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="bg-navy text-white py-12 mt-12">
        <div className="container-width">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="mb-4">
                <img 
                  src={whiteLogoUrl} 
                  alt="Plastic Clever Schools Logo" 
                  className="w-48 h-auto max-w-full object-contain" 
                />
              </div>
              <p className="text-gray-300 text-sm sm:text-base">
                {t('footer.description')}
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">{t('footer.program_title')}</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><a href="/#how-it-works" className="hover:text-teal transition-colors">{t('footer.program_how_it_works')}</a></li>
                <li><a href="/resources" className="hover:text-teal transition-colors">{t('footer.program_resources')}</a></li>
                <li><a href="/inspiration" className="hover:text-teal transition-colors">{t('footer.program_success_stories')}</a></li>
                <li><a href="/#how-it-works" className="hover:text-teal transition-colors">{t('footer.program_award_criteria')}</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">{t('footer.support_title')}</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><a href="/help-center" className="hover:text-teal transition-colors">{t('footer.support_help_center')}</a></li>
                <li><a href="/contact" className="hover:text-teal transition-colors">{t('footer.support_contact_us')}</a></li>
                <li><a href="/schools-map" className="hover:text-teal transition-colors">{t('footer.support_community')}</a></li>
                <li><a href="/resources" className="hover:text-teal transition-colors">{t('footer.support_training')}</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">{t('footer.connect_title')}</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><a href="https://www.instagram.com/plasticcleverschools" target="_blank" rel="noopener noreferrer" className="hover:text-teal transition-colors">{t('footer.connect_instagram')}</a></li>
                <li><a href="https://www.facebook.com/plasticcleverschools" target="_blank" rel="noopener noreferrer" className="hover:text-teal transition-colors">{t('footer.connect_facebook')}</a></li>
                <li><a href="https://www.linkedin.com/company/plastic-clever-schools" target="_blank" rel="noopener noreferrer" className="hover:text-teal transition-colors">{t('footer.connect_linkedin')}</a></li>
                <li><a href="mailto:info@plasticcleverschools.org" className="hover:text-teal transition-colors">{t('footer.connect_email')}</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>
              {t('footer.copyright')} | 
              <a href="https://commonseas.com/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-teal transition-colors ml-1">{t('footer.privacy')}</a> | 
              <a href="/terms" className="hover:text-teal transition-colors ml-1">{t('footer.terms')}</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
