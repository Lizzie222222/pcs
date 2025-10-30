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
      { value: 'under-5', label: 'Under 5' },
      { value: '6', label: '6' },
      { value: '7', label: '7' },
      { value: '8', label: '8' },
      { value: '9', label: '9' },
      { value: '10', label: '10' },
      { value: '11', label: '11' },
      { value: '12', label: '12' },
      { value: '13', label: '13' },
      { value: '14', label: '14' },
      { value: '15', label: '15' },
      { value: '16', label: '16' },
      { value: '17', label: '17' },
      { value: '18', label: '18' },
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
      { value: 'under-5', label: 'Under 5' },
      { value: '6', label: '6' },
      { value: '7', label: '7' },
      { value: '8', label: '8' },
      { value: '9', label: '9' },
      { value: '10', label: '10' },
      { value: '11', label: '11' },
      { value: '12', label: '12' },
      { value: '13', label: '13' },
      { value: '14', label: '14' },
      { value: '15', label: '15' },
      { value: '16', label: '16' },
      { value: '17', label: '17' },
      { value: '18', label: '18' },
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
    { value: 'under-5', label: 'Under 5' },
    { value: '6', label: '6' },
    { value: '7', label: '7' },
    { value: '8', label: '8' },
    { value: '9', label: '9' },
    { value: '10', label: '10' },
    { value: '11', label: '11' },
    { value: '12', label: '12' },
    { value: '13', label: '13' },
    { value: '14', label: '14' },
    { value: '15', label: '15' },
    { value: '16', label: '16' },
    { value: '17', label: '17' },
    { value: '18', label: '18' },
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
