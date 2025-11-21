/**
 * Shared utilities for working with evidence requirements
 */

/**
 * Get the translated requirement title for the current language
 * Handles region-qualified language codes (e.g., 'en-GB', 'fr-FR') by falling back to base language code
 * 
 * @param evidenceRequirementId - The ID of the evidence requirement
 * @param evidenceRequirements - Array of all evidence requirements
 * @param currentLanguage - The current language code (e.g., 'en', 'en-GB')
 * @returns Translated requirement title or null if not found
 */
export function getRequirementTitle(
  evidenceRequirementId: string | undefined | null,
  evidenceRequirements: any[] | undefined,
  currentLanguage: string
): string | null {
  if (!evidenceRequirementId || !evidenceRequirements) return null;
  
  const requirement = evidenceRequirements.find((req: any) => req.id === evidenceRequirementId);
  if (!requirement) return null;
  
  // Try exact match first (e.g., 'en-GB')
  if (requirement.translations && requirement.translations[currentLanguage]) {
    return requirement.translations[currentLanguage].title;
  }
  
  // Try base language code (e.g., 'en' from 'en-GB')
  const baseLang = currentLanguage.split('-')[0];
  if (baseLang !== currentLanguage && requirement.translations && requirement.translations[baseLang]) {
    return requirement.translations[baseLang].title;
  }
  
  // Fall back to default (English) title
  return requirement.title;
}
