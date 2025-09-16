import { useState, useEffect } from 'react';

/**
 * Hook to detect user's reduced motion preference
 * Returns true if user prefers reduced motion
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if window is available (SSR safety)
    if (typeof window === 'undefined') return;

    // Create media query matcher
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    // Set initial state
    setPrefersReducedMotion(mediaQuery.matches);

    // Update state when preference changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Listen for changes with passive listener for better performance
    mediaQuery.addEventListener('change', handleChange, { passive: true });

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
}