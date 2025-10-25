import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Mail, MapPin, Phone, Send, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Footer } from "@/components/Footer";

type ContactForm = {
  fullName: string;
  email: string;
  subject: string;
  message: string;
};

export default function Contact() {
  const { toast } = useToast();
  const { t } = useTranslation('common');
  const [submitted, setSubmitted] = useState(false);

  const contactSchema = z.object({
    fullName: z.string().min(1, t('contact.validation.full_name_required')),
    email: z.string().email(t('contact.validation.email_invalid')),
    subject: z.string().min(1, t('contact.validation.subject_required')),
    message: z.string().min(10, t('contact.validation.message_min_length')),
  });

  const form = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      fullName: "",
      email: "",
      subject: "",
      message: "",
    },
  });

  const contactMutation = useMutation({
    mutationFn: async (data: ContactForm) => {
      const response = await apiRequest('POST', '/api/contact', data);
      return response;
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: t('contact.toast.success_title'),
        description: t('contact.toast.success_description'),
      });
      form.reset();
      setTimeout(() => setSubmitted(false), 5000);
    },
    onError: (error: any) => {
      toast({
        title: t('contact.toast.error_title'),
        description: error?.message || t('contact.toast.error_description'),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ContactForm) => {
    contactMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-ocean-light/20 to-navy-light/30 pt-20">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-pcs_blue via-ocean-blue to-navy py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 
            className="text-4xl md:text-5xl font-bold text-white mb-4"
            data-testid="text-contact-title"
          >
            {t('contact.title')}
          </h1>
          <p 
            className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto"
            data-testid="text-contact-subtitle"
          >
            {t('contact.subtitle')}
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">
          {/* Contact Form */}
          <Card className="bg-white border border-gray-200 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-navy" data-testid="text-form-title">
                {t('contact.form_title')}
              </CardTitle>
              <CardDescription data-testid="text-form-description">
                {t('contact.form_description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submitted && (
                <div 
                  className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3"
                  data-testid="message-success"
                >
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" aria-label={t('accessibility.user_check_icon')} />
                  <div>
                    <p className="font-medium text-green-800">{t('contact.success_title')}</p>
                    <p className="text-sm text-green-700">{t('contact.success_message')}</p>
                  </div>
                </div>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Full Name */}
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('contact.full_name_label')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('contact.full_name_placeholder')}
                            {...field}
                            data-testid="input-fullname"
                            disabled={contactMutation.isPending}
                          />
                        </FormControl>
                        <FormMessage data-testid="error-fullname" />
                      </FormItem>
                    )}
                  />

                  {/* Email */}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('contact.email_label')}</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder={t('contact.email_placeholder')}
                            {...field}
                            data-testid="input-email"
                            disabled={contactMutation.isPending}
                          />
                        </FormControl>
                        <FormMessage data-testid="error-email" />
                      </FormItem>
                    )}
                  />

                  {/* Subject */}
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('contact.subject_label')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('contact.subject_placeholder')}
                            {...field}
                            data-testid="input-subject"
                            disabled={contactMutation.isPending}
                          />
                        </FormControl>
                        <FormMessage data-testid="error-subject" />
                      </FormItem>
                    )}
                  />

                  {/* Message */}
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('contact.message_label')}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t('contact.message_placeholder')}
                            rows={6}
                            {...field}
                            data-testid="textarea-message"
                            disabled={contactMutation.isPending}
                          />
                        </FormControl>
                        <FormMessage data-testid="error-message" />
                      </FormItem>
                    )}
                  />

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full bg-coral hover:bg-coral/90 text-white"
                    disabled={contactMutation.isPending}
                    data-testid="button-submit"
                  >
                    {contactMutation.isPending ? (
                      <>{t('contact.sending')}</>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" aria-label={t('accessibility.mail_icon')} />
                        {t('contact.send_message')}
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <div className="space-y-8">
            <Card className="bg-gradient-to-br from-pcs_blue to-ocean-blue text-white border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl" data-testid="text-info-title">
                  {t('contact.get_in_touch')}
                </CardTitle>
                <CardDescription className="text-white/80" data-testid="text-info-description">
                  {t('contact.info_description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Email */}
                <div className="flex items-start gap-4" data-testid="contact-email">
                  <div className="bg-white/10 p-3 rounded-lg">
                    <Mail className="h-6 w-6" aria-label={t('accessibility.mail_icon')} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{t('contact.email_heading')}</h3>
                    <a 
                      href="mailto:info@plasticcleverschools.org"
                      className="text-white/90 hover:text-white underline"
                      data-testid="link-email"
                    >
                      {t('contact.email_address')}
                    </a>
                  </div>
                </div>

                {/* Office Hours */}
                <div className="flex items-start gap-4" data-testid="contact-hours">
                  <div className="bg-white/10 p-3 rounded-lg">
                    <Phone className="h-6 w-6" aria-label={t('accessibility.phone_icon')} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{t('contact.office_hours')}</h3>
                    <p className="text-white/90">{t('contact.monday_friday')}</p>
                    <p className="text-white/90">{t('contact.working_hours')}</p>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start gap-4" data-testid="contact-location">
                  <div className="bg-white/10 p-3 rounded-lg">
                    <MapPin className="h-6 w-6" aria-label={t('accessibility.location_icon')} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{t('contact.location')}</h3>
                    <p className="text-white/90">
                      {t('contact.location_description')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* FAQ Card */}
            <Card className="bg-white border border-gray-200 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl text-navy" data-testid="text-faq-title">
                  {t('contact.faq_title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-navy mb-2">{t('contact.faq_response_time')}</h4>
                  <p className="text-sm text-gray-600">
                    {t('contact.faq_response_answer')}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-navy mb-2">{t('contact.faq_demo')}</h4>
                  <p className="text-sm text-gray-600">
                    {t('contact.faq_demo_answer')}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-navy mb-2">{t('contact.faq_support')}</h4>
                  <p className="text-sm text-gray-600">
                    {t('contact.faq_support_answer')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
