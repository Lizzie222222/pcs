import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, AlertCircle, Loader2 } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { X, School, Mail, MapPin, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCountriesForRegistration } from "@/hooks/useCountries";

// Types for domain check response
interface DomainCheckResponse {
  matchingSchools: Array<{
    school: {
      id: number;
      name: string;
      country: string;
      type: string;
    };
    matchCount: number;
  }>;
}

// Factory function for translated schema
const createRegistrationSchema = (t: (key: string, options?: any) => string) => z.object({
  school: z.object({
    name: z.string().min(1, t('forms:validation.required')).max(200, t('forms:validation.name_too_long', { max: 200 })),
    type: z.enum(['primary', 'secondary', 'high_school', 'international', 'other'], {
      required_error: t('forms:validation.invalid_selection'),
    }),
    country: z.string().min(1, t('forms:validation.required')),
    address: z.string().optional(),
    studentCount: z.number().min(1, t('forms:school_registration.student_count_min')).max(10000, t('forms:school_registration.student_count_max')),
  }),
  user: z.object({
    firstName: z.string().min(1, t('forms:validation.first_name_required')).max(50, t('forms:validation.name_too_long', { max: 50 })),
    lastName: z.string().min(1, t('forms:validation.last_name_required')).max(50, t('forms:validation.name_too_long', { max: 50 })),
    email: z.string().email(t('forms:validation.email_invalid')),
  }),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: t('forms:school_registration.accept_terms_required'),
  }),
  showOnMap: z.boolean().default(false),
  gdprConsent: z.boolean().refine(val => val === true, {
    message: t('forms:school_registration.gdpr_consent_required'),
  }),
});

interface SchoolSignUpFormProps {
  onClose: () => void;
  inline?: boolean;
  onRequestJoinInstead?: () => void;
}

export default function SchoolSignUpForm({ onClose, inline = false, onRequestJoinInstead }: SchoolSignUpFormProps) {
  const { t } = useTranslation(['forms', 'common']);
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [emailToCheck, setEmailToCheck] = useState<string>('');
  const [matchingSchools, setMatchingSchools] = useState<any[]>([]);
  const [showMatchingAlert, setShowMatchingAlert] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: countries = [], isLoading: isLoadingCountries } = useCountriesForRegistration();
  const registrationSchema = createRegistrationSchema(t);

  const { data: domainCheckData, isLoading: domainCheckLoading } = useQuery<DomainCheckResponse>({
    queryKey: ['/api/schools/check-domain', emailToCheck],
    queryFn: async () => {
      const response = await fetch(`/api/schools/check-domain?email=${encodeURIComponent(emailToCheck)}`);
      if (!response.ok) throw new Error('Domain check failed');
      return response.json();
    },
    enabled: !!emailToCheck && emailToCheck.includes('@'),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });

  const form = useForm<z.infer<typeof registrationSchema>>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      school: {
        name: '',
        type: undefined,
        country: '',
        address: '',
        studentCount: undefined,
      },
      user: {
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
      },
      acceptTerms: false,
      showOnMap: false,
      gdprConsent: false,
    },
  });

  // Update form when user data loads
  useEffect(() => {
    if (user) {
      form.setValue('user.firstName', user.firstName || '');
      form.setValue('user.lastName', user.lastName || '');
      form.setValue('user.email', user.email || '');
    }
  }, [user, form]);

  // Handle domain check results
  useEffect(() => {
    if (domainCheckData?.matchingSchools && domainCheckData.matchingSchools.length > 0) {
      setMatchingSchools(domainCheckData.matchingSchools);
      setShowMatchingAlert(true);
    } else {
      setMatchingSchools([]);
      setShowMatchingAlert(false);
    }
  }, [domainCheckData]);

  // Debounced email check handler
  const handleEmailBlur = useCallback((email: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const isValidEmail = email && email.includes('@') && email.split('@')[1]?.includes('.');
    
    if (isValidEmail) {
      debounceTimerRef.current = setTimeout(() => {
        setEmailToCheck(email);
      }, 500);
    } else {
      setEmailToCheck('');
      setMatchingSchools([]);
      setShowMatchingAlert(false);
    }
  }, []);

  // Reset email check when email changes
  const handleEmailChange = useCallback((email: string) => {
    if (emailToCheck && email !== emailToCheck) {
      setEmailToCheck('');
      setMatchingSchools([]);
      setShowMatchingAlert(false);
    }
  }, [emailToCheck]);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleRequestJoin = () => {
    if (onRequestJoinInstead) {
      onRequestJoinInstead();
    } else {
      setShowMatchingAlert(false);
      onClose();
    }
  };

  const registrationMutation = useMutation({
    mutationFn: async (data: z.infer<typeof registrationSchema>) => {
      setIsSubmitting(true);
      const { acceptTerms, ...submitData } = data;
      await apiRequest('POST', '/api/schools/register', submitData);
    },
    onSuccess: () => {
      toast({
        title: t('forms:school_registration.success_title'),
        description: t('forms:school_registration.success_message'),
      });
      onClose();
      // Redirect to home (teacher dashboard) after brief delay
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    },
    onError: (error: any) => {
      console.error("Registration error:", error);
      let errorMessage = t('forms:school_registration.error_message');
      
      if (error.message?.includes('email')) {
        errorMessage = t('forms:school_registration.error_email_exists');
      } else if (error.message?.includes('school')) {
        errorMessage = t('forms:school_registration.error_school_exists');
      }
      
      toast({
        title: t('forms:school_registration.error_title'),
        description: errorMessage,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const onSubmit = (data: z.infer<typeof registrationSchema>) => {
    registrationMutation.mutate(data);
  };

  const schoolTypes = [
    { value: 'primary', label: t('forms:school_registration.school_type_primary') },
    { value: 'secondary', label: t('forms:school_registration.school_type_secondary') },
    { value: 'high_school', label: t('forms:school_registration.school_type_high') },
    { value: 'international', label: t('forms:school_registration.school_type_international') },
    { value: 'other', label: t('forms:school_registration.school_type_other') },
  ];

  const formContent = (
    <div className={inline ? "" : "p-6"}>
      {!inline && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-pcs_blue text-white p-2 rounded-lg">
              <School className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-navy" data-testid="text-signup-title">
                {t('forms:school_registration.title')}
              </h2>
              <p className="text-gray-600">{t('forms:school_registration.subtitle')}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onClose}
            data-testid="button-close-signup"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* School Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold text-navy">
                  <School className="h-5 w-5" />
                  {t('forms:school_registration.school_section')}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="school.name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('forms:school_registration.school_name')}</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder={t('forms:school_registration.school_name_placeholder')}
                            {...field}
                            data-testid="input-school-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="school.type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('forms:school_registration.school_type')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-school-type">
                              <SelectValue placeholder={t('forms:school_registration.school_type_placeholder')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {schoolTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="school.country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('forms:school_registration.country')}</FormLabel>
                        <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={countryOpen}
                                className={cn(
                                  "w-full justify-between",
                                  !field.value && "text-muted-foreground"
                                )}
                                data-testid="select-country"
                              >
                                {field.value
                                  ? countries.find((country) => country === field.value)
                                  : t('forms:school_registration.country_placeholder')}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0">
                            <Command>
                              <CommandInput placeholder={t('forms:school_registration.country_search_placeholder')} />
                              <CommandList>
                                <CommandEmpty>{t('forms:school_registration.country_not_found')}</CommandEmpty>
                                <CommandGroup>
                                  {countries.map((country) => (
                                    <CommandItem
                                      key={country}
                                      value={country}
                                      onSelect={(currentValue) => {
                                        const selectedCountry = countries.find(
                                          (c) => c.toLowerCase() === currentValue.toLowerCase()
                                        );
                                        field.onChange(selectedCountry === field.value ? "" : selectedCountry);
                                        setCountryOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          field.value === country ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {country}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="school.studentCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('forms:school_registration.student_count')}</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            placeholder={t('forms:school_registration.student_count_placeholder')}
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            data-testid="input-student-count"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="school.address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('forms:school_registration.address')}</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder={t('forms:school_registration.address_placeholder')}
                          rows={3}
                          {...field}
                          data-testid="textarea-school-address"
                        />
                      </FormControl>
                      <FormDescription>
                        {t('forms:school_registration.address_description')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Contact Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold text-navy">
                  <Users className="h-5 w-5" />
                  {t('forms:school_registration.contact_section')}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="user.firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('forms:school_registration.first_name')}</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder={t('forms:school_registration.first_name_placeholder')}
                            {...field}
                            readOnly={!!user}
                            disabled={!!user}
                            className={user ? "bg-gray-50" : ""}
                            data-testid="input-first-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="user.lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('forms:school_registration.last_name')}</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder={t('forms:school_registration.last_name_placeholder')}
                            {...field}
                            readOnly={!!user}
                            disabled={!!user}
                            className={user ? "bg-gray-50" : ""}
                            data-testid="input-last-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="user.email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('forms:school_registration.email')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input 
                            type="email"
                            placeholder={t('forms:school_registration.email_placeholder')}
                            className={cn("pl-10 pr-10", user && "bg-gray-50")}
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              handleEmailChange(e.target.value);
                            }}
                            onBlur={(e) => {
                              field.onBlur();
                              handleEmailBlur(e.target.value);
                            }}
                            readOnly={!!user}
                            disabled={!!user}
                            data-testid="input-email"
                          />
                          {domainCheckLoading && !user && (
                            <Loader2 className="absolute right-3 top-3 h-4 w-4 text-pcs_blue animate-spin" data-testid="spinner-domain-check" />
                          )}
                        </div>
                      </FormControl>
                      <FormDescription>
                        {user 
                          ? t('forms:school_registration.email_description_readonly')
                          : t('forms:school_registration.email_description')
                        }
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Matching Schools Alert */}
                {showMatchingAlert && matchingSchools.length > 0 && (
                  <Alert 
                    className="border-pcs_blue bg-blue-50/50 mt-4" 
                    data-testid="alert-matching-schools"
                  >
                    <AlertCircle className="h-5 w-5 text-pcs_blue" />
                    <div className="flex-1">
                      <AlertTitle className="text-navy font-semibold mb-2">
                        {t('forms:school_registration.domain_match_title')}
                      </AlertTitle>
                      <AlertDescription className="space-y-3">
                        <p className="text-gray-700">
                          {t('forms:school_registration.domain_match_message', {
                            count: matchingSchools.length,
                            domain: emailToCheck.split('@')[1]
                          })}
                        </p>
                        
                        <div className="space-y-2">
                          {matchingSchools.slice(0, 3).map((match, index) => (
                            <div 
                              key={index} 
                              className="flex items-center gap-2 text-sm text-gray-800 bg-white/70 p-2 rounded"
                            >
                              <School className="h-4 w-4 text-pcs_blue flex-shrink-0" />
                              <span className="font-medium">{match.school.name}</span>
                              <span className="text-gray-500">({match.matchCount} {t('forms:school_registration.domain_match_users')})</span>
                            </div>
                          ))}
                          {matchingSchools.length > 3 && (
                            <p className="text-xs text-gray-600">
                              {t('forms:school_registration.domain_match_more', { count: matchingSchools.length - 3 })}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2 mt-3">
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleRequestJoin}
                            className="bg-pcs_blue hover:bg-pcs_blue/90 text-white"
                            data-testid="button-join-from-alert"
                          >
                            <Users className="h-4 w-4 mr-2" />
                            {t('forms:school_registration.domain_match_join_button')}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setShowMatchingAlert(false)}
                            data-testid="button-dismiss-alert"
                          >
                            {t('forms:school_registration.domain_match_dismiss')}
                          </Button>
                        </div>
                      </AlertDescription>
                    </div>
                  </Alert>
                )}
              </div>

              {/* Terms and Conditions */}
              <FormField
                control={form.control}
                name="acceptTerms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-accept-terms"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        {t('forms:school_registration.accept_terms')}
                      </FormLabel>
                      <FormDescription>
                        {t('forms:school_registration.accept_terms_description_start')}{' '}
                        <a href="#" className="text-pcs_blue hover:underline">{t('forms:school_registration.terms_of_service')}</a>
                        {' '}{t('forms:school_registration.accept_terms_description_and')}{' '}
                        <a href="#" className="text-pcs_blue hover:underline">{t('forms:school_registration.privacy_policy')}</a>
                      </FormDescription>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Show on Map Consent */}
              <FormField
                control={form.control}
                name="showOnMap"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-blue-50/50">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-show-on-map"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        {t('forms:school_registration.show_on_map')}
                      </FormLabel>
                      <FormDescription>
                        {t('forms:school_registration.show_on_map_description')}
                      </FormDescription>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* GDPR Consent */}
              <FormField
                control={form.control}
                name="gdprConsent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-green-50/50">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-gdpr-consent"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        {t('forms:school_registration.gdpr_consent')} <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormDescription>
                        {t('forms:school_registration.gdpr_consent_description')}
                      </FormDescription>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  disabled={isSubmitting}
                  data-testid="button-cancel-signup"
                >
                  {t('common:cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                  data-testid="button-submit-registration"
                >
                  {isSubmitting ? t('forms:school_registration.submitting') : t('forms:school_registration.submit_button')}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      );
      
  if (inline) {
    return formContent;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {formContent}
      </div>
    </div>
  );
}
