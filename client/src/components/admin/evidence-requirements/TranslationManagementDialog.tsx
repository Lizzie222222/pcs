import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PDFThumbnail } from "@/components/PDFThumbnail";
import { Languages, Loader2, Save, RefreshCw, Check, Plus, X, ImageIcon, FileVideo, BookOpen, Link as LinkIcon } from "lucide-react";
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
  const [languageSpecificLinks, setLanguageSpecificLinks] = useState<Record<string, Array<{ title: string; url: string }>>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  // Initialize translations when requirement changes
  useEffect(() => {
    if (requirement) {
      const existingTranslations = (requirement as any).translations || {};
      const existingLangResources = (requirement as any).languageSpecificResources || {};
      const existingLangLinks = (requirement as any).languageSpecificLinks || {};
      
      const initialTranslations: Record<string, { title: string; description: string }> = {
        en: {
          title: requirement.title,
          description: requirement.description,
        },
        ...existingTranslations,
      };
      
      setTranslations(initialTranslations);
      setLanguageSpecificResources(existingLangResources);
      setLanguageSpecificLinks(existingLangLinks);
      setSelectedLanguage('en');
      setNewLinkTitle('');
      setNewLinkUrl('');
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
        languageSpecificLinks,
      });
    },
    onSuccess: () => {
      toast({
        title: "Translations Saved",
        description: "All translations, language-specific resources, and custom links have been saved successfully.",
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

  if (!requirement) return null;

  const currentTranslation = translations[selectedLanguage] || { title: '', description: '' };
  const currentLangResources = languageSpecificResources[selectedLanguage] || [];
  const currentLangLinks = languageSpecificLinks[selectedLanguage] || [];
  const isEnglish = selectedLanguage === 'en';

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

  const addCustomLink = () => {
    if (newLinkTitle.trim() && newLinkUrl.trim()) {
      setLanguageSpecificLinks(prev => ({
        ...prev,
        [selectedLanguage]: [...(prev[selectedLanguage] || []), { title: newLinkTitle, url: newLinkUrl }],
      }));
      setNewLinkTitle('');
      setNewLinkUrl('');
    }
  };

  const removeCustomLink = (index: number) => {
    setLanguageSpecificLinks(prev => ({
      ...prev,
      [selectedLanguage]: (prev[selectedLanguage] || []).filter((_, i) => i !== index),
    }));
  };

  const getProxyUrl = (url: string | null) => {
    if (!url) return '';
    try {
      const urlObj = new URL(url);
      const pathname = decodeURIComponent(urlObj.pathname);
      
      const privateUploadsMatch = pathname.match(/\/.private\/uploads\/(.+)$/);
      if (privateUploadsMatch) {
        return `/objects/uploads/${privateUploadsMatch[1]}`;
      }
      
      const publicMatch = pathname.match(/\/public\/(.+)$/);
      if (publicMatch) {
        return `/objects/public/${publicMatch[1]}`;
      }
      
      if (url.startsWith('/objects/')) {
        return url;
      }
      
      return url;
    } catch {
      return url;
    }
  };

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
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-medium text-gray-700">Language-Specific Resources (optional)</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Select resources that are unique to {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name} (e.g., Greek-specific materials). 
                  These will be shown IN ADDITION to the general resources.
                </p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto p-1">
                {allResources.map((resource) => {
                  const isSelected = currentLangResources.includes(resource.id);
                  
                  const urlWithoutQuery = resource.fileUrl?.split('?')[0] || '';
                  const urlExtension = urlWithoutQuery.split('.').pop()?.toLowerCase() || '';
                  
                  const isImage = resource.fileType?.includes('image') || 
                                 ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(urlExtension);
                  const isPdf = resource.fileType?.includes('pdf') || urlExtension === 'pdf';
                  const isVideo = resource.fileType?.includes('video') || 
                                 ['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv'].includes(urlExtension);
                  
                  const imageProxyUrl = isImage ? getProxyUrl(resource.fileUrl) : '';
                  const pdfProxyUrl = isPdf ? getProxyUrl(resource.fileUrl) : '';
                  
                  return (
                    <Card
                      key={resource.id}
                      className={`cursor-pointer transition-all hover:shadow-md overflow-hidden ${
                        isSelected ? 'border-2 border-pcs_blue bg-blue-50' : 'border hover:border-gray-400'
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleResourceForLanguage(selectedLanguage, resource.id);
                      }}
                      data-testid={`button-resource-${selectedLanguage}-${resource.id}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex flex-col items-center text-center space-y-2">
                          <div className="relative w-full">
                            {isImage && imageProxyUrl ? (
                              <div className="aspect-video w-full bg-gray-100 rounded-md overflow-hidden flex items-center justify-center">
                                <img 
                                  src={imageProxyUrl} 
                                  alt={resource.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                                <ImageIcon className="h-10 w-10 text-gray-400 hidden" />
                              </div>
                            ) : isPdf && pdfProxyUrl ? (
                              <div className="aspect-video w-full bg-gray-100 rounded-md overflow-hidden">
                                <PDFThumbnail
                                  url={pdfProxyUrl}
                                  className="w-full h-full"
                                />
                              </div>
                            ) : (
                              <div className="aspect-video w-full bg-gray-100 rounded-md flex items-center justify-center">
                                {isVideo ? (
                                  <FileVideo className="h-10 w-10 text-gray-600" />
                                ) : (
                                  <BookOpen className="h-10 w-10 text-gray-600" />
                                )}
                              </div>
                            )}
                            {isSelected && (
                              <div className="absolute top-1 right-1 bg-pcs_blue rounded-full p-1 shadow-md">
                                <Check className="h-3 w-3 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="w-full">
                            <p className="text-xs font-medium text-gray-900 line-clamp-2">
                              {resource.title}
                            </p>
                            <Badge variant="outline" className="mt-1 text-xs">
                              {resource.stage}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              {currentLangResources.length > 0 && (
                <p className="text-xs text-gray-600 font-medium">
                  ✓ {currentLangResources.length} resource{currentLangResources.length !== 1 ? 's' : ''} selected for {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name}
                </p>
              )}
            </div>
          )}

          {/* Custom Links Section (only for non-English) */}
          {!isEnglish && (
            <div className="space-y-3 border-t pt-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700">Custom Links</h3>
                <p className="text-xs text-gray-600 mt-1">
                  Add external links specific to {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name} (e.g., YouTube videos, websites)
                </p>
              </div>
              
              {/* Display existing custom links */}
              {currentLangLinks.length > 0 && (
                <div className="space-y-2">
                  {currentLangLinks.map((link, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                      <LinkIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{link.title}</p>
                        <p className="text-xs text-gray-500 truncate">{link.url}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCustomLink(idx)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                        data-testid={`button-remove-link-${selectedLanguage}-${idx}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Add new link form */}
              <div className="space-y-2">
                <Input
                  placeholder="Link title (e.g., Watch our assembly)"
                  value={newLinkTitle}
                  onChange={(e) => setNewLinkTitle(e.target.value)}
                  data-testid={`input-link-title-${selectedLanguage}`}
                />
                <Input
                  placeholder="URL (e.g., https://youtube.com/...)"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  data-testid={`input-link-url-${selectedLanguage}`}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomLink}
                  disabled={!newLinkTitle.trim() || !newLinkUrl.trim()}
                  className="w-full"
                  data-testid={`button-add-link-${selectedLanguage}`}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Link
                </Button>
              </div>
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
