/**
 * Predefined gradient options for event banners
 * Using ONLY official Plastic Clever Schools brand colors:
 * - PCS Navy: #204969
 * - PCS Blue: #009ADE
 * - Inspire Green: #00BBB4
 * - Investigate Yellow: #FFC557
 * - Act Red: #FF595A
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
    name: '🌊 PCS Classic',
    gradient: 'linear-gradient(135deg, #204969 0%, #009ADE 100%)',
    textColorRecommended: '#FFFFFF',
  },
  {
    id: 'sunset',
    name: '🔥 Investigate & Act',
    gradient: 'linear-gradient(135deg, #FFC557 0%, #FF595A 100%)',
    textColorRecommended: '#FFFFFF',
  },
  {
    id: 'forest',
    name: '🌿 Inspire Green',
    gradient: 'linear-gradient(135deg, #00BBB4 0%, #009ADE 100%)',
    textColorRecommended: '#FFFFFF',
  },
  {
    id: 'purple',
    name: '💙 Ocean Wave',
    gradient: 'linear-gradient(135deg, #009ADE 0%, #00BBB4 100%)',
    textColorRecommended: '#FFFFFF',
  },
  {
    id: 'coral',
    name: '☀️ Action Energy',
    gradient: 'linear-gradient(135deg, #FF595A 0%, #FFC557 100%)',
    textColorRecommended: '#FFFFFF',
  },
  {
    id: 'teal',
    name: '🌊 Deep Ocean',
    gradient: 'linear-gradient(135deg, #204969 0%, #00BBB4 100%)',
    textColorRecommended: '#FFFFFF',
  },
  {
    id: 'midnight',
    name: '🎯 Bold Impact',
    gradient: 'linear-gradient(135deg, #FF595A 0%, #204969 100%)',
    textColorRecommended: '#FFFFFF',
  },
  {
    id: 'rose',
    name: '💚 Inspire',
    gradient: 'linear-gradient(135deg, #00BBB4 0%, #00BBB4 100%)',
    textColorRecommended: '#FFFFFF',
  },
  {
    id: 'sky',
    name: '💙 PCS Blue',
    gradient: 'linear-gradient(135deg, #009ADE 0%, #009ADE 100%)',
    textColorRecommended: '#FFFFFF',
  },
  {
    id: 'lime',
    name: '🌟 Bright Future',
    gradient: 'linear-gradient(135deg, #FFC557 0%, #009ADE 100%)',
    textColorRecommended: '#FFFFFF',
  },
];

export function getGradientById(id: string): GradientOption | undefined {
  return BANNER_GRADIENTS.find(g => g.id === id);
}
