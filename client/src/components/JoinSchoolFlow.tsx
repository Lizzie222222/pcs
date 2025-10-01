import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner, EmptyState } from "@/components/ui/states";
import { Search, School, Users, ArrowRight, ArrowLeft, X, MapPin, GraduationCap } from "lucide-react";
import type { School as SchoolType } from "@shared/schema";

interface JoinSchoolFlowProps {
  onClose: () => void;
  inline?: boolean;
}

export default function JoinSchoolFlow({ onClose, inline = false }: JoinSchoolFlowProps) {
  const { t } = useTranslation(['forms', 'common']);
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedSchool, setSelectedSchool] = useState<SchoolType | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [evidence, setEvidence] = useState("");

  // Fetch schools
  const { data: schools = [], isLoading } = useQuery<SchoolType[]>({
    queryKey: ['/api/schools', searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      const response = await fetch(`/api/schools?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch schools');
      return response.json();
    },
  });

  // Submit join request mutation
  const submitRequestMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSchool) throw new Error('No school selected');
      await apiRequest('POST', `/api/schools/${selectedSchool.id}/request-access`, {
        evidence,
      });
    },
    onSuccess: () => {
      toast({
        title: t('forms:join_school.success_title'),
        description: t('forms:join_school.success_message'),
      });
      onClose();
    },
    onError: (error: any) => {
      console.error("Error submitting join request:", error);
      toast({
        title: t('forms:join_school.error_title'),
        description: error.message || t('forms:join_school.error_message'),
        variant: "destructive",
      });
    },
  });

  const handleSelectSchool = (school: SchoolType) => {
    setSelectedSchool(school);
    setStep(2);
  };

  const handleBackToSchools = () => {
    setStep(1);
    setSelectedSchool(null);
    setEvidence("");
  };

  const handleSubmit = () => {
    if (!evidence || evidence.trim().length < 10) {
      toast({
        title: t('forms:validation.required'),
        description: t('forms:join_school.evidence_min_length'),
        variant: "destructive",
      });
      return;
    }
    submitRequestMutation.mutate();
  };

  const getSchoolTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      primary: t('forms:school_registration.school_type_primary'),
      secondary: t('forms:school_registration.school_type_secondary'),
      high_school: t('forms:school_registration.school_type_high'),
      international: t('forms:school_registration.school_type_international'),
      other: t('forms:school_registration.school_type_other'),
    };
    return typeMap[type] || type;
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          type="text"
          placeholder={t('forms:join_school.search_placeholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          data-testid="input-search-schools"
        />
      </div>

      {/* Schools List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" message={t('forms:join_school.loading_schools')} />
        </div>
      ) : schools.length === 0 ? (
        <EmptyState
          icon={School}
          title={t('forms:join_school.no_schools_title')}
          description={t('forms:join_school.no_schools_description')}
        />
      ) : (
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
          {schools.map((school) => (
            <Card 
              key={school.id} 
              className="hover:shadow-md transition-shadow"
              data-testid={`card-school-${school.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start gap-2">
                      <School className="h-5 w-5 text-pcs_blue mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-navy text-lg" data-testid={`text-school-name-${school.id}`}>
                          {school.name}
                        </h3>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span data-testid={`text-school-country-${school.id}`}>{school.country}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <GraduationCap className="h-4 w-4" />
                        <span data-testid={`text-school-type-${school.id}`}>{getSchoolTypeLabel(school.type)}</span>
                      </div>
                      
                      {school.studentCount && (
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span data-testid={`text-school-students-${school.id}`}>
                            {school.studentCount} {t('common:students')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => handleSelectSchool(school)}
                    className="bg-pcs_blue hover:bg-pcs_blue/90 text-white flex-shrink-0"
                    data-testid={`button-select-school-${school.id}`}
                  >
                    {t('forms:join_school.request_to_join')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      {/* Selected School Display */}
      <Card className="bg-gray-50 border-pcs_blue/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="bg-pcs_blue text-white p-2 rounded-lg">
              <School className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('forms:join_school.requesting_to_join')}</p>
              <h3 className="font-semibold text-navy text-lg" data-testid="text-selected-school-name">
                {selectedSchool?.name}
              </h3>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Evidence Form */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-navy">
          {t('forms:join_school.evidence_label')}
        </label>
        <Textarea
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
          placeholder={t('forms:join_school.evidence_placeholder')}
          rows={6}
          className="resize-none"
          data-testid="textarea-evidence"
        />
        <p className="text-xs text-gray-500">
          {t('forms:join_school.evidence_hint')}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={handleBackToSchools}
          className="flex-1"
          disabled={submitRequestMutation.isPending}
          data-testid="button-back-to-schools"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common:back')}
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={submitRequestMutation.isPending || !evidence || evidence.trim().length < 10}
          className="flex-1 bg-pcs_blue hover:bg-pcs_blue/90 text-white"
          data-testid="button-submit-join-request"
        >
          {submitRequestMutation.isPending ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              {t('common:submitting')}
            </>
          ) : (
            <>
              {t('forms:join_school.submit_request')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );

  if (inline) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-pcs_blue text-white p-2 rounded-lg">
              <School className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-navy" data-testid="text-join-school-title">
                {t('forms:join_school.title')}
              </h2>
              <p className="text-gray-600">{t('forms:join_school.subtitle')}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onClose}
            data-testid="button-close-join-flow"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {step === 1 ? renderStep1() : renderStep2()}
      </div>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-pcs_blue text-white p-2 rounded-lg">
              <School className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-2xl text-navy" data-testid="text-join-school-title">
                {t('forms:join_school.title')}
              </CardTitle>
              <p className="text-gray-600 text-sm mt-1">{t('forms:join_school.subtitle')}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onClose}
            data-testid="button-close-join-flow"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {step === 1 ? renderStep1() : renderStep2()}
      </CardContent>
    </Card>
  );
}
