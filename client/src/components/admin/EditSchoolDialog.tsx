import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { School, Loader2 } from "lucide-react";
import { useCountriesForRegistration } from "@/hooks/useCountries";
import { COUNTRY_CONFIGS, DEFAULT_COUNTRY_CONFIG } from "@/lib/countryConfig";
import type { SchoolData } from "@/components/admin/shared/types";

interface EditSchoolDialogProps {
  school: SchoolData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditSchoolDialog({ school, open, onOpenChange }: EditSchoolDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: countries = [], isLoading: countriesLoading } = useCountriesForRegistration();
  
  const [formData, setFormData] = useState({
    name: '',
    adminEmail: '',
    country: '',
    address: '',
    type: '',
    website: '',
    primaryLanguage: 'en',
    postcode: '',
    zipCode: '',
    studentCount: '',
    ageRanges: [] as string[],
  });

  useEffect(() => {
    if (school && open) {
      console.log('EditSchoolDialog - Received school data:', school);
      console.log('EditSchoolDialog - adminEmail:', school.adminEmail);
      console.log('EditSchoolDialog - type:', school.type);
      console.log('EditSchoolDialog - ageRanges:', school.ageRanges);
      
      const newFormData = {
        name: school.name || '',
        adminEmail: school.adminEmail || '',
        country: school.country || '',
        address: school.address || '',
        type: school.type || '',
        website: school.website || '',
        primaryLanguage: school.primaryLanguage || 'en',
        postcode: school.postcode || '',
        zipCode: school.zipCode || '',
        studentCount: school.studentCount?.toString() || '',
        ageRanges: school.ageRanges || [],
      };
      
      console.log('EditSchoolDialog - Setting formData to:', newFormData);
      setFormData(newFormData);
    } else if (!open) {
      // Reset form when dialog closes
      setFormData({
        name: '',
        adminEmail: '',
        country: '',
        address: '',
        type: '',
        website: '',
        primaryLanguage: 'en',
        postcode: '',
        zipCode: '',
        studentCount: '',
        ageRanges: [],
      });
    }
  }, [school, open]);

  const updateSchoolMutation = useMutation({
    mutationFn: async (updates: any) => {
      if (!school) return;
      return await apiRequest('PUT', `/api/admin/schools/${school.id}`, updates);
    },
    onSuccess: () => {
      toast({
        title: "School Updated",
        description: "School details have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update school details.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updates: any = {
      name: formData.name,
      adminEmail: formData.adminEmail || null,
      country: formData.country,
      address: formData.address || null,
      type: formData.type || null,
      website: formData.website || null,
      primaryLanguage: formData.primaryLanguage,
      postcode: formData.postcode || null,
      zipCode: formData.zipCode || null,
      studentCount: formData.studentCount ? parseInt(formData.studentCount) : null,
      ageRanges: formData.ageRanges,
    };

    updateSchoolMutation.mutate(updates);
  };
  
  const countryConfig = formData.country && COUNTRY_CONFIGS[formData.country] 
    ? COUNTRY_CONFIGS[formData.country] 
    : DEFAULT_COUNTRY_CONFIG;
  
  const handleAgeRangeToggle = (value: string) => {
    setFormData(prev => ({
      ...prev,
      ageRanges: prev.ageRanges.includes(value)
        ? prev.ageRanges.filter(v => v !== value)
        : [...prev.ageRanges, value]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent key={school?.id || 'new'} className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <School className="h-5 w-5 text-pcs_blue" />
            Edit School Details
          </DialogTitle>
          <DialogDescription>
            Update the school's information. All fields except name and country are optional.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">School Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter school name"
                required
                data-testid="input-school-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Select
                value={formData.country}
                onValueChange={(value) => setFormData({ ...formData, country: value })}
              >
                <SelectTrigger id="country" data-testid="select-country">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {countriesLoading ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  ) : (
                    countries.filter(c => c !== 'Other').map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminEmail">Admin Email</Label>
              <Input
                id="adminEmail"
                type="email"
                value={formData.adminEmail}
                onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                placeholder="admin@school.edu"
                data-testid="input-admin-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">School Type</Label>
              <Select
                value={formData.type || "not_specified"}
                onValueChange={(value) => setFormData({ ...formData, type: value === "not_specified" ? null : value })}
              >
                <SelectTrigger id="type" data-testid="select-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_specified">Not specified</SelectItem>
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="secondary">Secondary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://www.school.edu"
                data-testid="input-website"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="primaryLanguage">Primary Language</Label>
              <Select
                value={formData.primaryLanguage}
                onValueChange={(value) => setFormData({ ...formData, primaryLanguage: value })}
              >
                <SelectTrigger id="primaryLanguage" data-testid="select-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="it">Italian</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                  <SelectItem value="nl">Dutch</SelectItem>
                  <SelectItem value="ar">Arabic</SelectItem>
                  <SelectItem value="zh">Chinese</SelectItem>
                  <SelectItem value="el">Greek</SelectItem>
                  <SelectItem value="ru">Russian</SelectItem>
                  <SelectItem value="ko">Korean</SelectItem>
                  <SelectItem value="id">Indonesian</SelectItem>
                  <SelectItem value="cy">Welsh</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="postcode">Postcode</Label>
              <Input
                id="postcode"
                value={formData.postcode}
                onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                placeholder="Enter postcode"
                data-testid="input-postcode"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zipCode">Zip Code</Label>
              <Input
                id="zipCode"
                value={formData.zipCode}
                onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                placeholder="Enter zip code"
                data-testid="input-zipcode"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="studentCount">Student Count</Label>
              <Input
                id="studentCount"
                type="number"
                min="0"
                value={formData.studentCount}
                onChange={(e) => setFormData({ ...formData, studentCount: e.target.value })}
                placeholder="Number of students"
                data-testid="input-student-count"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Age Ranges</Label>
            <div className="grid grid-cols-3 gap-2 p-4 border rounded-lg max-h-48 overflow-y-auto">
              {countryConfig.ageRangeOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`age-${option.value}`}
                    checked={formData.ageRanges.includes(option.value)}
                    onCheckedChange={() => handleAgeRangeToggle(option.value)}
                    data-testid={`checkbox-age-${option.value}`}
                  />
                  <Label 
                    htmlFor={`age-${option.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500">Select the age ranges served by this school</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Enter school address"
              rows={3}
              data-testid="input-address"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateSchoolMutation.isPending}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateSchoolMutation.isPending || !formData.name || !formData.country}
              data-testid="button-save"
            >
              {updateSchoolMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
