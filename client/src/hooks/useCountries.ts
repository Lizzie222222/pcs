import { useQuery } from '@tanstack/react-query';

export interface CountryOption {
  value: string;
  label: string;
}

export function useCountries() {
  return useQuery({
    queryKey: ['/api/countries'],
    queryFn: async (): Promise<string[]> => {
      const response = await fetch('/api/countries');
      if (!response.ok) {
        throw new Error('Failed to fetch countries');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    select: (countries: string[]): CountryOption[] => [
      { value: 'all', label: 'All Countries' },
      ...countries.map(country => ({ value: country, label: country }))
    ]
  });
}

// Hook for school registration form (includes "Other" option)
export function useCountriesForRegistration() {
  return useQuery({
    queryKey: ['/api/countries'],
    queryFn: async (): Promise<string[]> => {
      const response = await fetch('/api/countries');
      if (!response.ok) {
        throw new Error('Failed to fetch countries');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    select: (countries: string[]) => {
      // Prevent duplication of "Other" if it already exists in the database
      const hasOther = countries.includes('Other');
      return hasOther ? countries : [...countries, 'Other'];
    }
  });
}