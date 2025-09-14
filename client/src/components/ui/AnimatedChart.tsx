import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useState, useEffect, useRef } from 'react';

/**
 * Chart animation configuration with accessibility considerations
 */
export interface ChartAnimationConfig {
  /** Enable/disable animations based on reduced motion preference */
  isAnimationActive: boolean;
  /** Animation duration in milliseconds */
  animationDuration: number;
  /** Animation begin delay */
  animationBegin: number;
  /** Animation easing function */
  animationEasing: string;
}

/**
 * Hook to get chart animation configuration with reduced motion support
 */
export function useChartAnimation(): ChartAnimationConfig {
  const prefersReducedMotion = useReducedMotion();
  
  return {
    isAnimationActive: !prefersReducedMotion,
    animationDuration: prefersReducedMotion ? 0 : 800,
    animationBegin: prefersReducedMotion ? 0 : 100,
    animationEasing: 'ease-out'
  };
}

/**
 * Accessibility announcement for chart updates
 */
export function useChartAnnouncement() {
  const [announcement, setAnnouncement] = useState<string>('');
  const announcementRef = useRef<HTMLDivElement>(null);

  const announceChart = (message: string) => {
    setAnnouncement(message);
    
    // Clear announcement after a short delay to allow screen readers to process
    setTimeout(() => {
      setAnnouncement('');
    }, 1000);
  };

  return {
    announcement,
    announceChart,
    AnnouncementRegion: () => (
      <div
        ref={announcementRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="chart-announcement"
      >
        {announcement}
      </div>
    )
  };
}

/**
 * Enhanced chart animations for specific chart types
 */
export const chartAnimations = {
  // Bar chart animation from bottom
  bar: {
    animationBegin: 0,
    animationDuration: 800,
    animationEasing: 'ease-out',
  },
  
  // Line chart animation with stroke-dasharray effect
  line: {
    animationBegin: 100,
    animationDuration: 1200,
    animationEasing: 'ease-in-out',
  },
  
  // Pie chart animation with rotation
  pie: {
    animationBegin: 200,
    animationDuration: 1000,
    animationEasing: 'ease-out',
  },
  
  // Scatter plot with staggered appearance
  scatter: {
    animationBegin: 300,
    animationDuration: 600,
    animationEasing: 'ease-out',
  }
};

/**
 * Chart type for animation configuration
 */
export type ChartKind = 'bar' | 'line' | 'pie' | 'scatter';

/**
 * Helper to get animation props for charts, avoiding edit conflicts
 */
export function getAnimProps(kind: ChartKind, idx = 0, overrides?: Partial<ChartAnimationConfig>) {
  const base = useChartAnimation();
  const preset = chartAnimations[kind];
  
  return {
    isAnimationActive: base.isAnimationActive,
    animationDuration: overrides?.animationDuration ?? preset.animationDuration ?? base.animationDuration,
    animationBegin: overrides?.animationBegin ?? (preset.animationBegin ?? base.animationBegin) + idx * 80,
    animationEasing: overrides?.animationEasing ?? preset.animationEasing ?? base.animationEasing,
  };
}

/**
 * Chart accessibility helpers
 */
export const chartA11y = {
  /**
   * Generate accessible description for chart data
   */
  getChartDescription: (data: any[], chartType: string, dataKey: string) => {
    if (!data || data.length === 0) return 'Chart contains no data';
    
    const total = data.length;
    const hasValues = data.filter(item => item[dataKey] !== undefined && item[dataKey] !== null);
    const valueCount = hasValues.length;
    
    return `${chartType} chart with ${total} data points, ${valueCount} containing values for ${dataKey}`;
  },
  
  /**
   * Generate summary for screen readers
   */
  getDataSummary: (data: any[], dataKey: string) => {
    if (!data || data.length === 0) return 'No data available';
    
    const values = data.map(item => item[dataKey]).filter(val => val !== undefined && val !== null);
    if (values.length === 0) return 'No valid data values';
    
    const max = Math.max(...values);
    const min = Math.min(...values);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    return `Data ranges from ${min} to ${max} with an average of ${Math.round(avg)}`;
  }
};