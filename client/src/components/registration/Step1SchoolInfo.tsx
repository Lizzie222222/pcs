import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useCountriesForRegistration } from "@/hooks/useCountries";
import { getCountryConfig, LANGUAGE_OPTIONS } from "@/lib/countryConfig";
import { LoadingSpinner } from "@/components/ui/states";
import { InfoTooltip } from "@/components/ui/info-tooltip";

export interface Step1Data {
  country: string;
  name: string;
  type?: string | undefined;
  adminEmail: string;
  address: string;
  postcode?: string;
  zipCode?: string;
  primaryLanguage: string;
}

interface Step1SchoolInfoProps {
  initialData?: Partial<Step1Data>;
  onNext: (data: Step1Data) => void;
  onCancel: () => void;
}

export default function Step1SchoolInfo({ initialData, onNext, onCancel }: Step1SchoolInfoProps) {
  const { t } = useTranslation(['forms', 'common']);
  const [countryOpen, setCountryOpen] = useState(false);
  const { data: countries = [], isLoading: isLoadingCountries } = useCountriesForRegistration();
  
  const createSchema = (selectedCountry?: string) => {
    const countryConfig = selectedCountry ? getCountryConfig(selectedCountry) : null;
    
    return z.object({
      country: z.string().min(1, t('forms:validation.required')),
      name: z.string().min(1, t('forms:validation.required')).max(200),
      type: z.enum(['kindergarten', 'primary', 'secondary', 'high_school', 'international', 'other'], {
        required_error: t('forms:validation.required'),
      }),
      adminEmail: z.string().min(1, t('forms:validation.required')).email(t('forms:validation.email_invalid')),
      address: z.string().min(1, t('forms:validation.required')),
      postcode: countryConfig?.postalCodeField === 'postcode' 
        ? z.string().min(1, t('forms:validation.required'))
        : z.string().optional(),
      zipCode: countryConfig?.postalCodeField === 'zipCode'
        ? z.string().min(1, t('forms:validation.required'))
        : z.string().optional(),
      primaryLanguage: z.string().min(1, t('forms:validation.required')),
    });
  };

  const [selectedCountry, setSelectedCountry] = useState(initialData?.country || '');
  const schema = createSchema(selectedCountry);
  
  const form = useForm<Step1Data>({
    resolver: zodResolver(schema),
    defaultValues: {
      country: initialData?.country || '',
      name: initialData?.name || '',
      type: initialData?.type || '',
      adminEmail: initialData?.adminEmail || '',
      address: initialData?.address || '',
      postcode: initialData?.postcode || '',
      zipCode: initialData?.zipCode || '',
      primaryLanguage: initialData?.primaryLanguage || 'English',
    },
  });

  const watchCountry = form.watch('country');
  const countryConfig = getCountryConfig(watchCountry);

  const handleSubmit = (data: Step1Data) => {
    onNext(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6" data-testid="form-step1-school-info">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-navy" data-testid="text-step1-title">
            {t('forms:school_registration.about_your_school')}
          </h3>

          {/* Country */}
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('forms:school_registration.country_label')}</FormLabel>
                <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={countryOpen}
                        className="w-full justify-between"
                        data-testid="button-select-country"
                      >
                        {field.value || t('forms:school_registration.country_button')}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder={t('forms:school_registration.country_search_placeholder')} />
                      <CommandEmpty>{t('forms:school_registration.country_not_found')}</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {isLoadingCountries ? (
                          <div className="p-2">
                            <LoadingSpinner size="sm" />
                          </div>
                        ) : (
                          countries.map((country) => (
                            <CommandItem
                              key={country}
                              value={country}
                              onSelect={(currentValue) => {
                                field.onChange(currentValue);
                                setSelectedCountry(currentValue);
                                setCountryOpen(false);
                              }}
                              data-testid={`option-country-${country.toLowerCase().replace(/\s+/g, '-')}`}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  field.value === country ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {country}
                            </CommandItem>
                          ))
                        )}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage data-testid="error-country" />
              </FormItem>
            )}
          />

          {/* School Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('forms:school_registration.school_name_label')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('forms:school_registration.school_name_placeholder')}
                    {...field}
                    data-testid="input-school-name"
                  />
                </FormControl>
                <FormMessage data-testid="error-school-name" />
              </FormItem>
            )}
          />

          {/* School Type */}
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>School Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-school-type">
                      <SelectValue placeholder="Select school type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="kindergarten">Kindergarten</SelectItem>
                    <SelectItem value="primary">Primary</SelectItem>
                    <SelectItem value="secondary">Secondary</SelectItem>
                    <SelectItem value="high_school">High School</SelectItem>
                    <SelectItem value="international">International</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage data-testid="error-school-type" />
              </FormItem>
            )}
          />

          {/* Admin Email - Required */}
          <FormField
            control={form.control}
            name="adminEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('forms:school_registration.admin_email_label')}
                  <InfoTooltip 
                    content={t('forms:school_registration.admin_email_tooltip')}
                    dataTestId="tooltip-admin-email"
                  />
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder={t('forms:school_registration.admin_email_placeholder')}
                    {...field}
                    data-testid="input-admin-email"
                  />
                </FormControl>
                <FormMessage data-testid="error-admin-email" />
              </FormItem>
            )}
          />

          {/* Address */}
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('forms:school_registration.address_label')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('forms:school_registration.address_placeholder')}
                    {...field}
                    data-testid="input-address"
                  />
                </FormControl>
                <FormMessage data-testid="error-address" />
              </FormItem>
            )}
          />

          {/* Postcode/Zip Code - conditional based on country */}
          {countryConfig.postalCodeField === 'postcode' ? (
            <FormField
              control={form.control}
              name="postcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {watchCountry === 'United Kingdom' 
                      ? t('forms:school_registration.postcode_label')
                      : t('forms:school_registration.postal_code_label')
                    }
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        watchCountry === 'United Kingdom'
                          ? t('forms:school_registration.postcode_placeholder')
                          : t('forms:school_registration.postal_code_placeholder')
                      }
                      {...field}
                      data-testid="input-postcode"
                    />
                  </FormControl>
                  <FormMessage data-testid="error-postcode" />
                </FormItem>
              )}
            />
          ) : (
            <FormField
              control={form.control}
              name="zipCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {watchCountry === 'United States' 
                      ? t('forms:school_registration.zipcode_label')
                      : t('forms:school_registration.postal_code_label')
                    }
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        watchCountry === 'United States'
                          ? t('forms:school_registration.zipcode_placeholder')
                          : t('forms:school_registration.postal_code_placeholder')
                      }
                      {...field}
                      data-testid="input-zipcode"
                    />
                  </FormControl>
                  <FormMessage data-testid="error-zipcode" />
                </FormItem>
              )}
            />
          )}

          {/* Primary Language */}
          <FormField
            control={form.control}
            name="primaryLanguage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('forms:school_registration.primary_language_label')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-primary-language">
                      <SelectValue placeholder={t('forms:school_registration.primary_language_placeholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((language) => (
                      <SelectItem 
                        key={language.value} 
                        value={language.value}
                        data-testid={`option-language-${language.value.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {language.nativeLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage data-testid="error-primary-language" />
              </FormItem>
            )}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            data-testid="button-cancel-step1"
            className="flex-1"
          >
            {t('forms:school_registration.button_cancel')}
          </Button>
          <Button
            type="submit"
            className="btn-primary flex-1"
            data-testid="button-next-step1"
          >
            {t('forms:school_registration.button_next_about_you')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
