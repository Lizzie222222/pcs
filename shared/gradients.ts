/**
 * Predefined gradient options for event banners
 */

export interface GradientOption {
  id: string;
  name: string;
  gradient: string;
  textColorRecommended: string;
}

export const BANNER_GRADIENTS: GradientOption[] = [
  {
    id: 'ocean',
    name: '🌊 Ocean Blue',
    gradient: 'linear-gradient(135deg, #0066CC 0%, #004B9B 100%)',
    textColorRecommended: '#FFFFFF',
  },
  {
    id: 'sunset',
    name: '🌅 Sunset Orange',
    gradient: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)',
    textColorRecommended: '#FFFFFF',
  },
  {
    id: 'forest',
    name: '🌲 Forest Green',
    gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    textColorRecommended: '#FFFFFF',
  },
  {
    id: 'purple',
    name: '💜 Purple Dream',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
    textColorRecommended: '#FFFFFF',
  },
  {
    id: 'coral',
    name: '🪸 Coral Reef',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
    textColorRecommended: '#FFFFFF',
  },
  {
    id: 'teal',
    name: '🐚 Teal Wave',
    gradient: 'linear-gradient(135deg, #14B8A6 0%, #0891B2 100%)',
    textColorRecommended: '#FFFFFF',
  },
  {
    id: 'midnight',
    name: '🌙 Midnight Blue',
    gradient: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
    textColorRecommended: '#FFFFFF',
  },
  {
    id: 'rose',
    name: '🌹 Rose Garden',
    gradient: 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)',
    textColorRecommended: '#FFFFFF',
  },
  {
    id: 'sky',
    name: '☁️ Sky Blue',
    gradient: 'linear-gradient(135deg, #38BDF8 0%, #0284C7 100%)',
    textColorRecommended: '#FFFFFF',
  },
  {
    id: 'lime',
    name: '🍋 Lime Fresh',
    gradient: 'linear-gradient(135deg, #84CC16 0%, #65A30D 100%)',
    textColorRecommended: '#FFFFFF',
  },
];

export function getGradientById(id: string): GradientOption | undefined {
  return BANNER_GRADIENTS.find(g => g.id === id);
}
