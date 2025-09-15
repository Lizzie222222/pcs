import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { X, School, Mail, MapPin, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCountriesForRegistration } from "@/hooks/useCountries";

const registrationSchema = z.object({
  school: z.object({
    name: z.string().min(1, "School name is required").max(200, "School name too long"),
    type: z.enum(['primary', 'secondary', 'high_school', 'international', 'other'], {
      required_error: "Please select school type",
    }),
    country: z.string().min(1, "Country is required"),
    address: z.string().optional(),
    studentCount: z.number().min(1, "Student count must be at least 1").max(10000, "Student count too high"),
  }),
  user: z.object({
    firstName: z.string().min(1, "First name is required").max(50, "First name too long"),
    lastName: z.string().min(1, "Last name is required").max(50, "Last name too long"),
    email: z.string().email("Invalid email address"),
  }),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions",
  }),
  showOnMap: z.boolean().default(false),
});

interface SchoolSignUpFormProps {
  onClose: () => void;
  inline?: boolean;
}

export default function SchoolSignUpForm({ onClose, inline = false }: SchoolSignUpFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);

  const { data: countries = [], isLoading: isLoadingCountries } = useCountriesForRegistration();

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
        firstName: '',
        lastName: '',
        email: '',
      },
      acceptTerms: false,
      showOnMap: false,
    },
  });

  const registrationMutation = useMutation({
    mutationFn: async (data: z.infer<typeof registrationSchema>) => {
      setIsSubmitting(true);
      const { acceptTerms, ...submitData } = data;
      await apiRequest('POST', '/api/schools/register', submitData);
    },
    onSuccess: () => {
      toast({
        title: "Registration Successful!",
        description: "Welcome to Plastic Clever Schools! Check your email for confirmation and login details.",
      });
      onClose();
      // Redirect to login after brief delay
      setTimeout(() => {
        window.location.href = "/api/auth/google";
      }, 2000);
    },
    onError: (error: any) => {
      console.error("Registration error:", error);
      let errorMessage = "Failed to register school. Please try again.";
      
      if (error.message?.includes('email')) {
        errorMessage = "This email address is already registered. Please use a different email or contact support.";
      } else if (error.message?.includes('school')) {
        errorMessage = "This school name is already registered. Please contact support if this is your school.";
      }
      
      toast({
        title: "Registration Failed",
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
    { value: 'primary', label: 'Primary School' },
    { value: 'secondary', label: 'Secondary School' },
    { value: 'high_school', label: 'High School' },
    { value: 'international', label: 'International School' },
    { value: 'other', label: 'Other' },
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
                Join Plastic Clever Schools
              </h2>
              <p className="text-gray-600">Register your school for the program</p>
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
                  School Information
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="school.name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>School Name *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Your School Name"
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
                        <FormLabel>School Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-school-type">
                              <SelectValue placeholder="Select school type" />
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
                        <FormLabel>Country *</FormLabel>
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
                                  : "Select country"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0">
                            <Command>
                              <CommandInput placeholder="Search countries..." />
                              <CommandList>
                                <CommandEmpty>No country found.</CommandEmpty>
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
                        <FormLabel>Number of Students *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            placeholder="450"
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
                      <FormLabel>School Address</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="123 Education Street, Learning City..."
                          rows={3}
                          {...field}
                          data-testid="textarea-school-address"
                        />
                      </FormControl>
                      <FormDescription>
                        Optional: This information helps us better understand our community
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
                  Primary Contact Information
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="user.firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Jane"
                            {...field}
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
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Smith"
                            {...field}
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
                      <FormLabel>Email Address *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input 
                            type="email"
                            placeholder="teacher@school.edu"
                            className="pl-10"
                            {...field}
                            data-testid="input-email"
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        This will be your login email and where we'll send program updates
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                        I agree to the Terms of Service and Privacy Policy *
                      </FormLabel>
                      <FormDescription>
                        By joining, you agree to our{' '}
                        <a href="#" className="text-pcs_blue hover:underline">Terms of Service</a>
                        {' '}and{' '}
                        <a href="#" className="text-pcs_blue hover:underline">Privacy Policy</a>
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
                        Show our school on the public map (optional)
                      </FormLabel>
                      <FormDescription>
                        Allow our school to be featured on the global schools map to inspire other educators. 
                        You can change this setting later in your school dashboard.
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
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                  data-testid="button-submit-registration"
                >
                  {isSubmitting ? 'Registering...' : 'Join the Program'}
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
