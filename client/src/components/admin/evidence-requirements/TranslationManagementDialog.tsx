import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [translations, setTranslations] = useState<Record<string, { title: string; description: string }>>({});
  const [languageSpecificResources, setLanguageSpecificResources] = useState<Record<string, string[]>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  // Initialize translations when requirement changes
  useEffect(() => {
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
      setSelectedLanguage('en');
    }
  }, [requirement]);

  const generateTranslationsMutation = useMutation({
    mutationFn: async () => {
      if (!requirement) return;
      const response = await apiRequest('POST', `/api/evidence-requirements/${requirement.id}/translate`, {});
      return response;
    },
    onSuccess: (data: any) => {
      if (data?.translations) {
        setTranslations(prev => ({
          ...prev,
          ...data.translations,
        }));
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

  const currentTranslation = translations[selectedLanguage] || { title: '', description: '' };
  const currentLangResources = languageSpecificResources[selectedLanguage] || [];
  const isEnglish = selectedLanguage === 'en';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-translations">
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
            Select a language tab below to edit its translation. Click "Generate All Translations" to auto-translate all languages at once.
          </p>
        </DialogHeader>

        {/* Language Tabs */}
        <div className="border-b border-gray-200 -mx-6 px-6 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSelectedLanguage(lang.code)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  selectedLanguage === lang.code
                    ? 'border-pcs_blue text-pcs_blue'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
                data-testid={`tab-${lang.code}`}
              >
                <span className="mr-1">{lang.flag}</span>
                {lang.name}
                {lang.code === 'en' && (
                  <Badge variant="outline" className="ml-2 text-xs">Original</Badge>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Translation Content */}
        <div className="space-y-4 py-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <Input
              value={currentTranslation.title}
              onChange={(e) => updateTranslation(selectedLanguage, 'title', e.target.value)}
              placeholder={`Title in ${SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name}`}
              disabled={isEnglish}
              className={isEnglish ? 'bg-gray-50 cursor-not-allowed' : ''}
              data-testid={`input-title-${selectedLanguage}`}
            />
            {isEnglish && (
              <p className="text-xs text-gray-500 mt-1">
                English is the original language. Edit the main requirement to change this.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <Textarea
              value={currentTranslation.description}
              onChange={(e) => updateTranslation(selectedLanguage, 'description', e.target.value)}
              placeholder={`Description in ${SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name}`}
              rows={4}
              disabled={isEnglish}
              className={isEnglish ? 'bg-gray-50 cursor-not-allowed' : ''}
              data-testid={`input-description-${selectedLanguage}`}
            />
            {isEnglish && (
              <p className="text-xs text-gray-500 mt-1">
                English is the original language. Edit the main requirement to change this.
              </p>
            )}
          </div>

          {/* Language-Specific Resources (only for non-English) */}
          {!isEnglish && allResources.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language-Specific Resources (optional)
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Select resources that are unique to {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name} (e.g., Greek-specific materials). 
                These will be shown IN ADDITION to the general resources.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto border rounded-md p-3 bg-gray-50">
                {allResources.map((resource) => {
                  const isSelected = currentLangResources.includes(resource.id);
                  return (
                    <button
                      key={resource.id}
                      onClick={() => toggleResourceForLanguage(selectedLanguage, resource.id)}
                      className={`text-left text-xs p-2 rounded border transition-colors ${
                        isSelected
                          ? 'bg-pcs_blue text-white border-pcs_blue'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-pcs_blue'
                      }`}
                      data-testid={`button-resource-${selectedLanguage}-${resource.id}`}
                    >
                      {resource.title}
                    </button>
                  );
                })}
              </div>
              {currentLangResources.length > 0 && (
                <p className="text-xs text-gray-600 mt-2 font-medium">
                  ✓ {currentLangResources.length} resource{currentLangResources.length !== 1 ? 's' : ''} selected for {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name}
                </p>
              )}
            </div>
          )}
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
