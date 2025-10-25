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

export default function HelpCenter() {
  const { t } = useTranslation('help');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Build categories from translations
  const getCategoriesFromTranslations = (): Category[] => {
    const categoryKeys = ['getting_started', 'program_stages', 'evidence_submission', 'action_plans', 'awards_certificates', 'technical_support'];
    const icons = [BookOpen, Layers, Upload, Target, Award, Wrench];
    const colors = ['bg-pcs_blue', 'bg-teal', 'bg-coral', 'bg-purple-600', 'bg-amber-500', 'bg-gray-700'];

    return categoryKeys.map((key, index) => {
      const categoryData = t(`categories.${key}`, { returnObjects: true }) as any;
      const faqKeys = Object.keys(categoryData.faqs || {});
      
      return {
        id: key.replace(/_/g, '-'),
        title: categoryData.title,
        icon: icons[index],
        description: categoryData.description,
        color: colors[index],
        faqs: faqKeys.map(faqKey => ({
          question: categoryData.faqs[faqKey].question,
          answer: categoryData.faqs[faqKey].answer
        }))
      };
    });
  };

  const categories = getCategoriesFromTranslations();

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
              {t('page.title')}
            </h1>
          </div>
          <p 
            className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-8"
            data-testid="text-help-center-subtitle"
          >
            {t('page.subtitle')}
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder={t('page.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-6 text-lg bg-white border-0 shadow-lg"
                data-testid="input-search-faqs"
              />
            </div>
            {searchQuery && (
              <p className="text-white/80 text-sm mt-3" data-testid="text-search-results">
                {t('page.search_results', { count: filteredCategories.reduce((sum, cat) => sum + cat.faqs.length, 0) })}
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
              <h2 className="text-xl font-semibold text-navy">{t('page.browse_by_category')}</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                onClick={() => setSelectedCategory(null)}
                className={selectedCategory === null ? "bg-pcs_blue hover:bg-pcs_blue/90" : ""}
                data-testid="filter-all-categories"
              >
                {t('page.all_categories', { count: totalFAQs })}
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
                <h3 className="text-xl font-semibold text-gray-700 mb-2">{t('page.no_results_title')}</h3>
                <p className="text-gray-500 mb-4">
                  {t('page.no_results_message')}
                </p>
                <Button
                  variant="outline"
                  onClick={() => setSearchQuery("")}
                  data-testid="button-clear-search"
                >
                  {t('page.browse_all')}
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
                {t('page.still_need_help_title')}
              </h2>
              <p className="text-lg text-gray-600 mb-6" data-testid="text-still-questions-description">
                {t('page.still_need_help_message')}
              </p>
              <Link href="/contact">
                <Button 
                  size="lg" 
                  className="bg-coral hover:bg-coral/90 text-white text-lg px-8 py-6"
                  data-testid="button-contact-us"
                >
                  <Mail className="h-5 w-5 mr-2" />
                  {t('page.contact_support')}
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
