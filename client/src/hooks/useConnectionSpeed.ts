import { useState, useEffect, useCallback } from 'react';

// Network Connection API types (for better TypeScript support)
interface NavigatorConnection extends EventTarget {
  downlink: number;
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  rtt: number;
  saveData: boolean;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NavigatorConnection;
  mozConnection?: NavigatorConnection;
  webkitConnection?: NavigatorConnection;
}

export interface ConnectionInfo {
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
  downlink: number; // Mbps
  rtt: number; // ms
  saveData: boolean;
  isSlowConnection: boolean;
  isFastConnection: boolean;
  connectionQuality: 'poor' | 'ok' | 'good' | 'excellent' | 'unknown';
}

export interface ConnectionSpeedHook {
  connectionInfo: ConnectionInfo;
  userPreference: 'auto' | 'high-quality' | 'data-saver';
  setUserPreference: (preference: 'auto' | 'high-quality' | 'data-saver') => void;
  shouldLoadHighQuality: boolean;
  shouldAutoloadVideo: boolean;
  recommendedImageQuality: number;
  isLoading: boolean;
  supportsNetworkAPI: boolean;
}

const DEFAULT_CONNECTION_INFO: ConnectionInfo = {
  effectiveType: 'unknown',
  downlink: 10, // Default to reasonable speed
  rtt: 100,
  saveData: false,
  isSlowConnection: false,
  isFastConnection: true,
  connectionQuality: 'unknown'
};

/**
 * Hook to detect connection speed using Navigator Connection API and performance timing
 * Falls back gracefully for unsupported browsers
 * 
 * @returns ConnectionSpeedHook with connection info and user preferences
 */
export function useConnectionSpeed(): ConnectionSpeedHook {
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>(DEFAULT_CONNECTION_INFO);
  const [userPreference, setUserPreference] = useState<'auto' | 'high-quality' | 'data-saver'>('auto');
  const [isLoading, setIsLoading] = useState(true);
  const [supportsNetworkAPI, setSupportsNetworkAPI] = useState(false);

  // Performance-based speed detection fallback
  const measureConnectionSpeed = useCallback(async (): Promise<Partial<ConnectionInfo>> => {
    try {
      const startTime = performance.now();
      
      // Use a small image from a fast CDN to measure speed
      const testImageUrl = 'https://img.youtube.com/vi/jyL1lt-72HQ/default.jpg?' + Date.now();
      
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = reject;
        img.src = testImageUrl;
      });

      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Estimate speed based on duration (rough approximation)
      let effectiveType: ConnectionInfo['effectiveType'];
      let connectionQuality: ConnectionInfo['connectionQuality'];
      
      if (duration > 2000) {
        effectiveType = 'slow-2g';
        connectionQuality = 'poor';
      } else if (duration > 1000) {
        effectiveType = '2g';
        connectionQuality = 'poor';
      } else if (duration > 500) {
        effectiveType = '3g';
        connectionQuality = 'ok';
      } else if (duration > 200) {
        effectiveType = '4g';
        connectionQuality = 'good';
      } else {
        effectiveType = '4g';
        connectionQuality = 'excellent';
      }

      const estimatedDownlink = duration > 1000 ? 1 : duration > 500 ? 3 : duration > 200 ? 10 : 25;
      
      return {
        effectiveType,
        downlink: estimatedDownlink,
        rtt: duration,
        connectionQuality,
        isSlowConnection: effectiveType === 'slow-2g' || effectiveType === '2g',
        isFastConnection: effectiveType === '4g' && connectionQuality !== 'ok'
      };
    } catch (error) {
      console.warn('Connection speed measurement failed:', error);
      return {};
    }
  }, []);

  // Get connection info from Navigator Connection API
  const getNetworkConnectionInfo = useCallback((): Partial<ConnectionInfo> => {
    const nav = navigator as NavigatorWithConnection;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    
    if (!connection) {
      return {};
    }

    const { effectiveType, downlink, rtt, saveData } = connection;
    
    const isSlowConnection = effectiveType === 'slow-2g' || effectiveType === '2g';
    const isFastConnection = effectiveType === '4g' && downlink >= 1.5;
    
    let connectionQuality: ConnectionInfo['connectionQuality'];
    if (effectiveType === 'slow-2g' || (effectiveType === '2g' && downlink < 0.5)) {
      connectionQuality = 'poor';
    } else if (effectiveType === '2g' || (effectiveType === '3g' && downlink < 1.5)) {
      connectionQuality = 'ok';
    } else if (effectiveType === '3g' || (effectiveType === '4g' && downlink < 5)) {
      connectionQuality = 'good';
    } else {
      connectionQuality = 'excellent';
    }

    return {
      effectiveType,
      downlink,
      rtt,
      saveData,
      isSlowConnection,
      isFastConnection,
      connectionQuality
    };
  }, []);

  // Update connection info
  const updateConnectionInfo = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const networkInfo = getNetworkConnectionInfo();
      const hasNetworkAPI = Object.keys(networkInfo).length > 0;
      
      setSupportsNetworkAPI(hasNetworkAPI);
      
      if (hasNetworkAPI) {
        // Use Network API data
        setConnectionInfo(prev => ({
          ...prev,
          ...networkInfo
        }));
      } else {
        // Fallback to performance measurement
        const performanceInfo = await measureConnectionSpeed();
        setConnectionInfo(prev => ({
          ...prev,
          ...performanceInfo
        }));
      }
    } catch (error) {
      console.warn('Failed to update connection info:', error);
    } finally {
      setIsLoading(false);
    }
  }, [getNetworkConnectionInfo, measureConnectionSpeed]);

  // Initialize and set up listeners
  useEffect(() => {
    // Load user preference from localStorage
    const savedPreference = localStorage.getItem('connection-preference') as 'auto' | 'high-quality' | 'data-saver';
    if (savedPreference) {
      setUserPreference(savedPreference);
    }

    // Initial connection info update
    updateConnectionInfo();

    // Listen for connection changes
    const nav = navigator as NavigatorWithConnection;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    
    if (connection) {
      const handleConnectionChange = () => {
        updateConnectionInfo();
      };
      
      connection.addEventListener('change', handleConnectionChange);
      
      return () => {
        connection.removeEventListener('change', handleConnectionChange);
      };
    }
  }, [updateConnectionInfo]);

  // Save user preference to localStorage
  const setUserPreferenceWithStorage = useCallback((preference: 'auto' | 'high-quality' | 'data-saver') => {
    setUserPreference(preference);
    localStorage.setItem('connection-preference', preference);
  }, []);

  // Calculate derived values
  const shouldLoadHighQuality = userPreference === 'high-quality' || 
    (userPreference === 'auto' && connectionInfo.isFastConnection && !connectionInfo.saveData);
    
  const shouldAutoloadVideo = userPreference === 'high-quality' || 
    (userPreference === 'auto' && connectionInfo.connectionQuality === 'excellent' && !connectionInfo.saveData);
    
  const recommendedImageQuality = 
    userPreference === 'data-saver' ? 60 :
    userPreference === 'high-quality' ? 95 :
    connectionInfo.isSlowConnection || connectionInfo.saveData ? 70 :
    connectionInfo.isFastConnection ? 90 : 80;

  return {
    connectionInfo,
    userPreference,
    setUserPreference: setUserPreferenceWithStorage,
    shouldLoadHighQuality,
    shouldAutoloadVideo,
    recommendedImageQuality,
    isLoading,
    supportsNetworkAPI
  };
}