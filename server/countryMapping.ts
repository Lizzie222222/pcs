// Mapping of country codes to full country names
export const COUNTRY_CODE_TO_NAME: Record<string, string> = {
  'GR': 'Greece',
  'ID': 'Indonesia',
  'ES': 'Spain',
  'BB': 'Barbados',
  'BE': 'Belgium',
  'US': 'United States',
  'LR': 'Liberia',
  'RO': 'Romania',
  'PT': 'Portugal',
  'FR': 'France',
  'DE': 'Germany',
  'IT': 'Italy',
  'NL': 'Netherlands',
  'PL': 'Poland',
  'SE': 'Sweden',
  'NO': 'Norway',
  'DK': 'Denmark',
  'FI': 'Finland',
  'IE': 'Ireland',
  'AT': 'Austria',
  'CH': 'Switzerland',
  'CZ': 'Czech Republic',
  'HU': 'Hungary',
  'SK': 'Slovakia',
  'SI': 'Slovenia',
  'HR': 'Croatia',
  'BG': 'Bulgaria',
  'LT': 'Lithuania',
  'LV': 'Latvia',
  'EE': 'Estonia',
  'CY': 'Cyprus',
  'MT': 'Malta',
  'LU': 'Luxembourg',
  'GB': 'United Kingdom',
  'UK': 'United Kingdom',
  'AU': 'Australia',
  'NZ': 'New Zealand',
  'CA': 'Canada',
  'JP': 'Japan',
  'KR': 'South Korea',
  'CN': 'China',
  'IN': 'India',
  'BR': 'Brazil',
  'MX': 'Mexico',
  'AR': 'Argentina',
  'CL': 'Chile',
  'CO': 'Colombia',
  'PE': 'Peru',
  'ZA': 'South Africa',
  'EG': 'Egypt',
  'NG': 'Nigeria',
  'KE': 'Kenya',
  'MA': 'Morocco',
  'TN': 'Tunisia',
  'GH': 'Ghana',
  'UG': 'Uganda',
  'TZ': 'Tanzania',
  'ET': 'Ethiopia',
  'TR': 'Turkey',
  'IL': 'Israel',
  'SA': 'Saudi Arabia',
  'AE': 'United Arab Emirates',
  'QA': 'Qatar',
  'KW': 'Kuwait',
  'OM': 'Oman',
  'JO': 'Jordan',
  'LB': 'Lebanon',
  'SG': 'Singapore',
  'MY': 'Malaysia',
  'TH': 'Thailand',
  'VN': 'Vietnam',
  'PH': 'Philippines',
  'HK': 'Hong Kong',
  'TW': 'Taiwan',
  'NP': 'Nepal',
  'BD': 'Bangladesh',
  'PK': 'Pakistan',
  'LK': 'Sri Lanka',
  'MM': 'Myanmar',
  'KH': 'Cambodia',
  'LA': 'Laos'
};

// Function to normalize a country string (convert code to name if it's a code)
export function normalizeCountryName(country: string | null): string | null {
  if (!country) return null;
  
  // If it's a 2-letter code (uppercase), try to convert it
  if (country.length === 2 && country === country.toUpperCase()) {
    return COUNTRY_CODE_TO_NAME[country] || country;
  }
  
  // Otherwise, return as-is (it's already a full name)
  return country;
}

// Function to get country code from name (for reverse lookup)
export function getCountryCode(countryName: string | null): string | null {
  if (!countryName) return null;
  
  // Find the code for this name
  const entry = Object.entries(COUNTRY_CODE_TO_NAME).find(
    ([_, name]) => name.toLowerCase() === countryName.toLowerCase()
  );
  
  return entry ? entry[0] : countryName;
}

/**
 * Gets all country codes that map to the same country name
 * Example: "United Kingdom" -> ["GB", "UK"]
 */
export function getAllCountryCodes(countryName: string): string[] {
  const normalized = countryName.trim();
  const codes: string[] = [];
  
  // If it's already a code, get all codes for that country
  const mappedName = COUNTRY_CODE_TO_NAME[normalized];
  if (mappedName) {
    // Find all codes that map to this country name
    for (const [code, name] of Object.entries(COUNTRY_CODE_TO_NAME)) {
      if (name === mappedName) {
        codes.push(code);
      }
    }
    return codes;
  }
  
  // Otherwise, find all codes that map to this country name
  for (const [code, name] of Object.entries(COUNTRY_CODE_TO_NAME)) {
    if (name.toLowerCase() === normalized.toLowerCase()) {
      codes.push(code);
    }
  }
  
  // If no codes found, return the original input as a single-item array
  return codes.length > 0 ? codes : [normalized];
}
