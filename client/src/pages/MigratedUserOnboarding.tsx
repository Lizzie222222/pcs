import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { School, UserCheck, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Define languages array matching LanguageSwitcher
const languages = [
  { code: 'ar', nativeName: 'العربية' },
  { code: 'zh', nativeName: '中文' },
  { code: 'nl', nativeName: 'Nederlands' },
  { code: 'en', nativeName: 'English' },
  { code: 'fr', nativeName: 'Français' },
  { code: 'de', nativeName: 'Deutsch' },
  { code: 'el', nativeName: 'Ελληνικά' },
  { code: 'id', nativeName: 'Bahasa Indonesia' },
  { code: 'it', nativeName: 'Italiano' },
  { code: 'ko', nativeName: '한국어' },
  { code: 'pt', nativeName: 'Português' },
  { code: 'ru', nativeName: 'Русский' },
  { code: 'es', nativeName: 'Español' },
  { code: 'cy', nativeName: 'Cymraeg' },
];

// Define form schema
const profileFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  preferredLanguage: z.string().min(1, "Please select a language"),
  schoolName: z.string().min(1, "School name is required"),
  country: z.string().min(1, "Country is required"),
  currentStage: z.enum(['inspire', 'investigate', 'act']),
  studentCount: z.union([
    z.coerce.number().positive(),
    z.literal(''),
    z.null(),
  ]).transform(val => (val === '' || val === null) ? null : val).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

// Define school data type
type SchoolData = {
  schoolName: string;
  country: string;
  currentStage: string;
  studentCount: number | null;
};

export default function MigratedUserOnboarding() {
  const { t } = useTranslation("auth");
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch school data
  const { data: schoolData, isLoading: isLoadingSchool, error: schoolError } = useQuery<SchoolData>({
    queryKey: ['/api/auth/migrated-user-school'],
    enabled: !!user,
  });

  // Fetch countries list
  const { data: countries = [] } = useQuery<string[]>({
    queryKey: ['/api/countries'],
  });

  // Initialize form with both user and school data
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      preferredLanguage: user?.preferredLanguage || "en",
      schoolName: "",
      country: "",
      currentStage: 'inspire' as const,
      studentCount: null,
    },
  });

  // Update form when school data loads
  useEffect(() => {
    if (schoolData) {
      form.reset({
        firstName: user?.firstName || "",
        lastName: user?.lastName || "",
        preferredLanguage: user?.preferredLanguage || "en",
        schoolName: schoolData.schoolName || "",
        country: schoolData.country || "",
        currentStage: (schoolData.currentStage as 'inspire' | 'investigate' | 'act') || 'inspire',
        studentCount: schoolData.studentCount || null,
      });
    }
  }, [schoolData, user, form]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const response = await apiRequest("POST", "/api/auth/complete-migrated-onboarding", {
        firstName: data.firstName,
        lastName: data.lastName || "",
        preferredLanguage: data.preferredLanguage,
        schoolName: data.schoolName,
        country: data.country,
        currentStage: data.currentStage,
        studentCount: data.studentCount || null,
      });
      return response.json();
    },
    onSuccess: (user) => {
      // Backend now returns updated user object directly (not wrapped in {success: true})
      toast({
        title: t("migratedUser.onboarding.toast_welcome_title"),
        description: t("migratedUser.onboarding.toast_welcome_description"),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/migrated-user-school'] });
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);
    },
    onError: (error: Error) => {
      toast({
        title: t("migratedUser.onboarding.toast_profile_error_title"),
        description: error.message || t("migratedUser.onboarding.toast_profile_error_description"),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="text-page-title">
            {t("migratedUser.onboarding.page_title")}
          </h1>
          <p className="text-gray-600" data-testid="text-page-description">
            {t("migratedUser.onboarding.page_description")}
          </p>
        </div>

        {/* Evidence Resubmission Notice */}
        <Alert variant="default" className="mb-6" data-testid="alert-evidence-notice">
          <Info className="h-4 w-4" />
          <AlertTitle>{t("migratedUser.onboarding.evidence_notice_title")}</AlertTitle>
          <AlertDescription>
            {t("migratedUser.onboarding.evidence_notice_description")}
          </AlertDescription>
        </Alert>

        {/* Profile Form */}
        <Card data-testid="card-profile-form">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <CardTitle>{t("migratedUser.onboarding.complete_setup_title")}</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingSchool ? (
              <div className="space-y-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="schoolName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("migratedUser.onboarding.school_name_label")} *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={t("migratedUser.onboarding.school_name_placeholder")}
                            data-testid="input-schoolName"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("migratedUser.onboarding.country_label")} *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-country">
                              <SelectValue placeholder={t("migratedUser.onboarding.country_placeholder")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {countries.map((country) => (
                              <SelectItem
                                key={country}
                                value={country}
                                data-testid={`select-option-${country}`}
                              >
                                {country}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currentStage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("migratedUser.onboarding.stage_label")} *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-stage">
                              <SelectValue placeholder={t("migratedUser.onboarding.stage_placeholder")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="inspire" data-testid="select-option-inspire">
                              Inspire
                            </SelectItem>
                            <SelectItem value="investigate" data-testid="select-option-investigate">
                              Investigate
                            </SelectItem>
                            <SelectItem value="act" data-testid="select-option-act">
                              Act
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("migratedUser.onboarding.firstName_label")} *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={t("migratedUser.onboarding.firstName_placeholder")}
                            data-testid="input-firstName"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("migratedUser.onboarding.lastName_label")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t("migratedUser.onboarding.lastName_placeholder")}
                          data-testid="input-lastName"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="preferredLanguage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("migratedUser.onboarding.language_label")} *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-preferredLanguage">
                            <SelectValue placeholder={t("migratedUser.onboarding.language_placeholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {languages.map((lang) => (
                            <SelectItem
                              key={lang.code}
                              value={lang.code}
                              data-testid={`select-option-${lang.code}`}
                            >
                              {lang.nativeName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                  <FormField
                    control={form.control}
                    name="studentCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("migratedUser.onboarding.student_count_label")}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            placeholder={t("migratedUser.onboarding.studentCount_placeholder")}
                            data-testid="input-studentCount"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                          />
                        </FormControl>
                        <FormDescription>
                          {t("migratedUser.onboarding.student_count_help")}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full bg-pcs_blue hover:bg-blue-600"
                    disabled={updateProfileMutation.isPending}
                    data-testid="button-submit-profile"
                  >
                    {updateProfileMutation.isPending ? (
                      t("migratedUser.onboarding.submitting_button")
                    ) : (
                      <>
                        {t("migratedUser.onboarding.submit_button")} <CheckCircle2 className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
