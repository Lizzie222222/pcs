// Mapping of country codes to full country names
export const COUNTRY_CODE_TO_NAME: Record<string, string> = {
  'AF': 'Afghanistan',
  'AL': 'Albania',
  'AR': 'Argentina',
  'AT': 'Austria',
  'AU': 'Australia',
  'AW': 'Aruba',
  'BA': 'Bosnia and Herzegovina',
  'BB': 'Barbados',
  'BD': 'Bangladesh',
  'BE': 'Belgium',
  'BG': 'Bulgaria',
  'BH': 'Bahrain',
  'BR': 'Brazil',
  'CA': 'Canada',
  'CH': 'Switzerland',
  'CL': 'Chile',
  'CN': 'China',
  'CO': 'Colombia',
  'CY': 'Cyprus',
  'CZ': 'Czech Republic',
  'DE': 'Germany',
  'DK': 'Denmark',
  'DM': 'Dominica',
  'EE': 'Estonia',
  'EG': 'Egypt',
  'ES': 'Spain',
  'ET': 'Ethiopia',
  'FI': 'Finland',
  'FJ': 'Fiji',
  'FR': 'France',
  'GB': 'United Kingdom',
  'GH': 'Ghana',
  'GR': 'Greece',
  'HK': 'Hong Kong',
  'HR': 'Croatia',
  'HU': 'Hungary',
  'ID': 'Indonesia',
  'IE': 'Ireland',
  'IL': 'Israel',
  'IN': 'India',
  'IT': 'Italy',
  'JE': 'Jersey',
  'JM': 'Jamaica',
  'JO': 'Jordan',
  'JP': 'Japan',
  'KE': 'Kenya',
  'KH': 'Cambodia',
  'KR': 'South Korea',
  'KW': 'Kuwait',
  'LA': 'Laos',
  'LB': 'Lebanon',
  'LK': 'Sri Lanka',
  'LR': 'Liberia',
  'LT': 'Lithuania',
  'LU': 'Luxembourg',
  'LV': 'Latvia',
  'MA': 'Morocco',
  'MD': 'Moldova',
  'MM': 'Myanmar',
  'MT': 'Malta',
  'MW': 'Malawi',
  'MX': 'Mexico',
  'MY': 'Malaysia',
  'NA': 'Namibia',
  'NL': 'Netherlands',
  'NO': 'Norway',
  'NP': 'Nepal',
  'NZ': 'New Zealand',
  'NG': 'Nigeria',
  'OM': 'Oman',
  'PE': 'Peru',
  'PH': 'Philippines',
  'PK': 'Pakistan',
  'PL': 'Poland',
  'PT': 'Portugal',
  'QA': 'Qatar',
  'RO': 'Romania',
  'RS': 'Serbia',
  'RU': 'Russia',
  'SA': 'Saudi Arabia',
  'SE': 'Sweden',
  'SG': 'Singapore',
  'SI': 'Slovenia',
  'SK': 'Slovakia',
  'ST': 'São Tomé and Príncipe',
  'TH': 'Thailand',
  'TN': 'Tunisia',
  'TR': 'Turkey',
  'TW': 'Taiwan',
  'TZ': 'Tanzania',
  'UG': 'Uganda',
  'UK': 'United Kingdom',
  'US': 'United States',
  'UY': 'Uruguay',
  'VE': 'Venezuela',
  'VN': 'Vietnam',
  'ZA': 'South Africa'
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
