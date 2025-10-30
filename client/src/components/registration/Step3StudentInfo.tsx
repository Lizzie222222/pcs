import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Toggle } from "@/components/ui/toggle";
import { getCountryConfig } from "@/lib/countryConfig";
import { Loader2 } from "lucide-react";
import { InfoTooltip } from "@/components/ui/info-tooltip";

export interface Step3Data {
  studentCount: number;
  ageRanges: string[];
  showOnMap: boolean;
  gdprConsent: boolean;
  acceptTerms: boolean;
}

interface Step3StudentInfoProps {
  initialData?: Partial<Step3Data>;
  country: string;
  onSubmit: (data: Step3Data) => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

export default function Step3StudentInfo({ 
  initialData, 
  country, 
  onSubmit, 
  onBack,
  isSubmitting = false 
}: Step3StudentInfoProps) {
  const { t } = useTranslation(['forms', 'common']);
  const countryConfig = getCountryConfig(country);

  const schema = z.object({
    studentCount: z.number()
      .min(1, t('forms:student_info.student_count_min'))
      .max(10000, t('forms:student_info.student_count_max')),
    ageRanges: z.array(z.string()).min(1, t('forms:student_info.age_ranges_min')),
    showOnMap: z.boolean().default(false),
    gdprConsent: z.boolean().refine(val => val === true, {
      message: t('forms:school_registration.gdpr_consent_required'),
    }),
    acceptTerms: z.boolean().refine(val => val === true, {
      message: t('forms:school_registration.accept_terms_required'),
    }),
  });

  const form = useForm<Step3Data>({
    resolver: zodResolver(schema),
    defaultValues: {
      studentCount: initialData?.studentCount || undefined,
      ageRanges: initialData?.ageRanges || [],
      showOnMap: initialData?.showOnMap || false,
      gdprConsent: initialData?.gdprConsent || false,
      acceptTerms: initialData?.acceptTerms || false,
    },
  });

  const handleSubmit = (data: Step3Data) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6" data-testid="form-step3-student-info">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-navy" data-testid="text-step3-title">
            {t('forms:student_info.section_title')}
          </h3>

          {/* Number of Students */}
          <FormField
            control={form.control}
            name="studentCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('forms:student_info.student_count_label')}
                  <InfoTooltip 
                    content={t('forms:student_info.student_count_tooltip')}
                    dataTestId="tooltip-student-count"
                  />
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    max="10000"
                    placeholder={t('forms:student_info.student_count_placeholder')}
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    data-testid="input-student-count"
                  />
                </FormControl>
                <FormDescription>
                  {t('forms:student_info.student_count_description')}
                </FormDescription>
                <FormMessage data-testid="error-student-count" />
              </FormItem>
            )}
          />

          {/* Age Ranges/Year Groups */}
          <FormField
            control={form.control}
            name="ageRanges"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('forms:student_info.age_ranges_label')}</FormLabel>
                <FormDescription>
                  {t('forms:student_info.age_ranges_description')}
                </FormDescription>
                <div className="flex flex-wrap gap-2 mt-3">
                  {countryConfig.ageRangeOptions.map((option) => (
                    <Toggle
                      key={option.value}
                      pressed={field.value?.includes(option.value)}
                      onPressedChange={(pressed) => {
                        const newValue = pressed
                          ? [...field.value, option.value]
                          : field.value?.filter((value) => value !== option.value);
                        field.onChange(newValue);
                      }}
                      className="h-9 px-4 rounded-full text-sm font-medium transition-all data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm hover:bg-muted"
                      data-testid={`toggle-age-${option.value}`}
                    >
                      {option.translationKey ? t(option.translationKey) : option.label}
                    </Toggle>
                  ))}
                </div>
                <FormMessage data-testid="error-age-ranges" />
              </FormItem>
            )}
          />

          {/* Show on Map */}
          <FormField
            control={form.control}
            name="showOnMap"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="checkbox-show-on-map"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="cursor-pointer">
                    {t('forms:school_registration.show_on_map')}
                  </FormLabel>
                  <FormDescription>
                    {t('forms:school_registration.show_on_map_description')}
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          {/* GDPR Consent */}
          <FormField
            control={form.control}
            name="gdprConsent"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="checkbox-gdpr-consent"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="cursor-pointer text-sm">
                    {t('forms:school_registration.gdpr_consent_description_start')}{' '}
                    <a 
                      href="/privacy" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-pcs_blue hover:underline font-medium"
                      data-testid="link-privacy-policy"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {t('forms:school_registration.privacy_policy_link')}
                    </a>
                    {' '}{t('forms:school_registration.gdpr_consent_description_end')} *
                  </FormLabel>
                  <FormMessage data-testid="error-gdpr-consent" />
                </div>
              </FormItem>
            )}
          />

          {/* Accept Terms */}
          <FormField
            control={form.control}
            name="acceptTerms"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="checkbox-accept-terms"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="cursor-pointer text-sm">
                    {t('forms:school_registration.accept_terms_description_start')}{' '}
                    <a 
                      href="/terms" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-pcs_blue hover:underline font-medium"
                      data-testid="link-terms-of-service"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {t('forms:school_registration.terms_of_service_link')}
                    </a>
                    {' '}{t('forms:school_registration.accept_terms_description_and')}{' '}
                    <a 
                      href="/privacy" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-pcs_blue hover:underline font-medium"
                      data-testid="link-privacy-policy-terms"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {t('forms:school_registration.privacy_policy_link')}
                    </a>
                    {' '}*
                  </FormLabel>
                  <FormMessage data-testid="error-accept-terms" />
                </div>
              </FormItem>
            )}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isSubmitting}
            data-testid="button-back-step3"
            className="flex-1"
          >
            {t('forms:student_info.button_back')}
          </Button>
          <Button
            type="submit"
            className="btn-primary flex-1 inline-flex items-center justify-center"
            disabled={isSubmitting}
            data-testid="button-submit-registration"
          >
            {isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isSubmitting ? t('forms:student_info.button_submitting') : t('forms:student_info.button_submit')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
