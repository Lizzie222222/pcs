export interface CountryConfig {
  name: string;
  addressLabel: string;
  postalCodeLabel: string;
  postalCodeField: 'postcode' | 'zipCode';
  postalCodePattern?: string;
  postalCodePlaceholder?: string;
  ageRangeOptions: Array<{ value: string; label: string }>;
}

export const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  'United Kingdom': {
    name: 'United Kingdom',
    addressLabel: 'School Address',
    postalCodeLabel: 'Postcode',
    postalCodeField: 'postcode',
    postalCodePlaceholder: 'e.g., SW1A 1AA',
    ageRangeOptions: [
      { value: 'Year 1-2', label: 'Year 1-2 (Ages 5-7)' },
      { value: 'Year 3-6', label: 'Year 3-6 (Ages 7-11)' },
      { value: 'Year 7-9', label: 'Year 7-9 (Ages 11-14)' },
      { value: 'Year 10-11', label: 'Year 10-11 (Ages 14-16)' },
      { value: 'Year 12-13', label: 'Year 12-13 (Ages 16-18)' },
    ]
  },
  'United States': {
    name: 'United States',
    addressLabel: 'School Address',
    postalCodeLabel: 'Zip Code',
    postalCodeField: 'zipCode',
    postalCodePlaceholder: 'e.g., 10001',
    postalCodePattern: '^[0-9]{5}(-[0-9]{4})?$',
    ageRangeOptions: [
      { value: 'Grades K-2', label: 'Grades K-2 (Ages 5-8)' },
      { value: 'Grades 3-5', label: 'Grades 3-5 (Ages 8-11)' },
      { value: 'Grades 6-8', label: 'Grades 6-8 (Ages 11-14)' },
      { value: 'Grades 9-12', label: 'Grades 9-12 (Ages 14-18)' },
    ]
  },
};

// Default config for countries not in the list above
export const DEFAULT_COUNTRY_CONFIG: CountryConfig = {
  name: 'Other',
  addressLabel: 'School Address',
  postalCodeLabel: 'Postal/Zip Code',
  postalCodeField: 'postcode',
  postalCodePlaceholder: 'Enter postal or zip code',
  ageRangeOptions: [
    { value: 'Ages 5-7', label: 'Ages 5-7 (Early Primary)' },
    { value: 'Ages 8-11', label: 'Ages 8-11 (Primary)' },
    { value: 'Ages 12-16', label: 'Ages 12-16 (Secondary)' },
    { value: 'Ages 17+', label: 'Ages 17+ (Advanced)' },
  ]
};

export const LANGUAGE_OPTIONS = [
  'English',
  'Spanish',
  'French',
  'German',
  'Portuguese',
  'Italian',
  'Dutch',
  'Chinese (Mandarin)',
  'Japanese',
  'Korean',
  'Arabic',
  'Hindi',
  'Other'
];

export const REFERRAL_SOURCE_OPTIONS = [
  { value: 'google_search', label: 'Google Search' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'colleague', label: 'Colleague Recommendation' },
  { value: 'conference', label: 'Conference/Event' },
  { value: 'email', label: 'Email Newsletter' },
  { value: 'website', label: 'Website/Blog Article' },
  { value: 'other', label: 'Other' },
];

export function getCountryConfig(country: string): CountryConfig {
  return COUNTRY_CONFIGS[country] || DEFAULT_COUNTRY_CONFIG;
}
