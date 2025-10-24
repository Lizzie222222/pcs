/**
 * Language utility functions for multi-language support
 */

/**
 * Mapping of language codes to their flag emojis
 */
export const LANGUAGE_FLAG_MAP: Record<string, string> = {
  en: '🇬🇧',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  it: '🇮🇹',
  pt: '🇵🇹',
  nl: '🇳🇱',
  ar: '🇸🇦',
  zh: '🇨🇳',
  el: '🇬🇷',
  ru: '🇷🇺',
  ko: '🇰🇷',
  id: '🇮🇩',
  cy: '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
};

/**
 * Mapping of language codes to their display names (in native language)
 */
export const LANGUAGE_NAME_MAP: Record<string, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
  nl: 'Nederlands',
  ar: 'العربية',
  zh: '中文',
  el: 'Ελληνικά',
  ru: 'Русский',
  ko: '한국어',
  id: 'Bahasa Indonesia',
  cy: 'Cymraeg',
};

/**
 * Interface for event object with translation fields
 */
interface EventWithTranslations {
  titleTranslations?: Record<string, any> | null;
  descriptionTranslations?: Record<string, any> | null;
  youtubeVideoTranslations?: Record<string, any> | null;
  eventPackFileTranslations?: Record<string, any> | null;
  testimonialTranslations?: Record<string, any> | null;
  evidenceSubmissionText?: Record<string, any> | null;
}

/**
 * Analyzes an event object's translation fields and returns an array of language codes
 * where content exists. Checks all JSONB translation fields.
 * 
 * @param event - Event object with translation fields
 * @returns Array of language codes that have translations
 */
export function getEventAvailableLanguages(event: EventWithTranslations): string[] {
  const languageSet = new Set<string>();

  // Translation fields to check
  const translationFields: (keyof EventWithTranslations)[] = [
    'titleTranslations',
    'descriptionTranslations',
    'youtubeVideoTranslations',
    'eventPackFileTranslations',
    'testimonialTranslations',
    'evidenceSubmissionText',
  ];

  // Iterate through each translation field
  translationFields.forEach((field) => {
    const translations = event[field];
    
    // Check if translations exist and is an object
    if (translations && typeof translations === 'object' && !Array.isArray(translations)) {
      // Add all language codes that have content
      Object.keys(translations).forEach((langCode) => {
        const content = translations[langCode];
        
        // Only add if content exists and is not empty
        // Ignore: null, undefined, empty string, empty arrays, empty objects
        if (content !== null && content !== undefined && content !== '') {
          // Check for empty arrays
          if (Array.isArray(content) && content.length === 0) {
            return;
          }
          
          // Check for empty objects
          if (typeof content === 'object' && !Array.isArray(content) && Object.keys(content).length === 0) {
            return;
          }
          
          languageSet.add(langCode);
        }
      });
    }
  });

  // Convert Set to sorted array for consistent ordering
  return Array.from(languageSet).sort();
}

/**
 * Returns a formatted label with flag emoji and language name
 * 
 * @param languageCode - Language code (e.g., 'en', 'es')
 * @returns Formatted string with flag and language name (e.g., "🇬🇧 English")
 */
export function getLanguageLabel(languageCode: string): string {
  const flag = LANGUAGE_FLAG_MAP[languageCode] || '🏳️';
  const name = LANGUAGE_NAME_MAP[languageCode] || languageCode.toUpperCase();
  return `${flag} ${name}`;
}

/**
 * Mapping of language names (English and native) to their codes
 * Used for backward compatibility with legacy language field
 */
const LANGUAGE_NAME_TO_CODE_MAP: Record<string, string> = {
  // English names
  'English': 'en',
  'Spanish': 'es',
  'French': 'fr',
  'German': 'de',
  'Italian': 'it',
  'Portuguese': 'pt',
  'Dutch': 'nl',
  'Arabic': 'ar',
  'Chinese': 'zh',
  'Greek': 'el',
  'Russian': 'ru',
  'Korean': 'ko',
  'Indonesian': 'id',
  'Welsh': 'cy',
  // Native names
  'Español': 'es',
  'Français': 'fr',
  'Deutsch': 'de',
  'Italiano': 'it',
  'Português': 'pt',
  'Nederlands': 'nl',
  'العربية': 'ar',
  '中文': 'zh',
  'Ελληνικά': 'el',
  'Русский': 'ru',
  '한국어': 'ko',
  'Bahasa Indonesia': 'id',
  'Cymraeg': 'cy',
};

/**
 * Converts a language name to its language code
 * Handles both English names ("English", "Spanish") and native names ("Español", "Français")
 * 
 * @param languageName - Language name (e.g., "English", "Spanish", "Español")
 * @returns Language code (e.g., "en", "es") or null if not found
 */
export function languageCodeFromName(languageName: string): string | null {
  return LANGUAGE_NAME_TO_CODE_MAP[languageName] || null;
}
