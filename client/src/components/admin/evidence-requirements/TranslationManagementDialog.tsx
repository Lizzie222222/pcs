import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Languages, Loader2, Save, RefreshCw } from "lucide-react";
import type { EvidenceRequirement } from "@/components/admin/shared/types";

interface TranslationManagementDialogProps {
  requirement: EvidenceRequirement | null;
  isOpen: boolean;
  onClose: () => void;
  allResources: any[];
}

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
  { code: 'el', name: 'Greek', flag: '🇬🇷' },
  { code: 'cy', name: 'Welsh', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
];

export default function TranslationManagementDialog({
  requirement,
  isOpen,
  onClose,
  allResources,
}: TranslationManagementDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [translations, setTranslations] = useState<Record<string, { title: string; description: string }>>({});
  const [languageSpecificResources, setLanguageSpecificResources] = useState<Record<string, string[]>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  // Initialize translations when requirement changes
  useState(() => {
    if (requirement) {
      const existingTranslations = (requirement as any).translations || {};
      const existingLangResources = (requirement as any).languageSpecificResources || {};
      
      const initialTranslations: Record<string, { title: string; description: string }> = {
        en: {
          title: requirement.title,
          description: requirement.description,
        },
        ...existingTranslations,
      };
      
      setTranslations(initialTranslations);
      setLanguageSpecificResources(existingLangResources);
    }
  });

  const generateTranslationsMutation = useMutation({
    mutationFn: async () => {
      if (!requirement) return;
      const response = await apiRequest('POST', `/api/evidence-requirements/${requirement.id}/translate`, {});
      return response;
    },
    onSuccess: (data: any) => {
      if (data?.translations) {
        setTranslations(data.translations);
      }
      toast({
        title: "Translations Generated",
        description: "All translations have been generated successfully. You can now edit them if needed.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/evidence-requirements'] });
    },
    onError: (error: any) => {
      toast({
        title: "Translation Failed",
        description: error.message || "Failed to generate translations",
        variant: "destructive",
      });
    },
  });

  const saveTranslationsMutation = useMutation({
    mutationFn: async () => {
      if (!requirement) return;
      return await apiRequest('PATCH', `/api/evidence-requirements/${requirement.id}`, {
        translations,
        languageSpecificResources,
      });
    },
    onSuccess: () => {
      toast({
        title: "Translations Saved",
        description: "All translations and language-specific resources have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/evidence-requirements'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save translations",
        variant: "destructive",
      });
    },
  });

  const handleGenerateTranslations = async () => {
    setIsGenerating(true);
    try {
      await generateTranslationsMutation.mutateAsync();
    } finally {
      setIsGenerating(false);
    }
  };

  const updateTranslation = (langCode: string, field: 'title' | 'description', value: string) => {
    setTranslations(prev => ({
      ...prev,
      [langCode]: {
        ...prev[langCode],
        [field]: value,
      },
    }));
  };

  const toggleResourceForLanguage = (langCode: string, resourceId: string) => {
    setLanguageSpecificResources(prev => {
      const currentResources = prev[langCode] || [];
      const isSelected = currentResources.includes(resourceId);
      
      return {
        ...prev,
        [langCode]: isSelected
          ? currentResources.filter(id => id !== resourceId)
          : [...currentResources, resourceId],
      };
    });
  };

  if (!requirement) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" data-testid="dialog-translations">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              Manage Translations - {requirement.title}
            </DialogTitle>
            <Button
              onClick={handleGenerateTranslations}
              disabled={isGenerating}
              className="bg-pcs_blue hover:bg-pcs_blue/90"
              data-testid="button-generate-translations"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate All Translations
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Edit translations for all 14 languages. Changes are saved when you click "Save All Translations" below.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const translation = translations[lang.code] || { title: '', description: '' };
            const langResources = languageSpecificResources[lang.code] || [];
            const isEnglish = lang.code === 'en';

            return (
              <Card key={lang.code} className="p-4" data-testid={`card-translation-${lang.code}`}>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{lang.flag}</span>
                    <h3 className="text-lg font-semibold">{lang.name}</h3>
                    {isEnglish && (
                      <Badge variant="outline" className="ml-2">Original</Badge>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title
                    </label>
                    <Input
                      value={translation.title}
                      onChange={(e) => updateTranslation(lang.code, 'title', e.target.value)}
                      placeholder={`Title in ${lang.name}`}
                      disabled={isEnglish}
                      data-testid={`input-title-${lang.code}`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <Textarea
                      value={translation.description}
                      onChange={(e) => updateTranslation(lang.code, 'description', e.target.value)}
                      placeholder={`Description in ${lang.name}`}
                      rows={3}
                      disabled={isEnglish}
                      data-testid={`input-description-${lang.code}`}
                    />
                  </div>

                  {!isEnglish && allResources.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Language-Specific Resources (optional)
                      </label>
                      <p className="text-xs text-gray-500 mb-2">
                        Select resources that are unique to {lang.name} (e.g., Greek-specific materials)
                      </p>
                      <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-2">
                        {allResources.map((resource) => {
                          const isSelected = langResources.includes(resource.id);
                          return (
                            <button
                              key={resource.id}
                              onClick={() => toggleResourceForLanguage(lang.code, resource.id)}
                              className={`text-left text-xs p-2 rounded border transition-colors ${
                                isSelected
                                  ? 'bg-pcs_blue text-white border-pcs_blue'
                                  : 'bg-white text-gray-700 border-gray-300 hover:border-pcs_blue'
                              }`}
                              data-testid={`button-resource-${lang.code}-${resource.id}`}
                            >
                              {resource.title}
                            </button>
                          );
                        })}
                      </div>
                      {langResources.length > 0 && (
                        <p className="text-xs text-gray-600 mt-1">
                          {langResources.length} resource{langResources.length !== 1 ? 's' : ''} selected for {lang.name}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={() => saveTranslationsMutation.mutate()}
            disabled={saveTranslationsMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
            data-testid="button-save-translations"
          >
            {saveTranslationsMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save All Translations
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
