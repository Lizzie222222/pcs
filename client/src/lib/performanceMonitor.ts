interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private enabled: boolean = import.meta.env.DEV || import.meta.env.VITE_ENABLE_PERF_MONITORING === 'true';

  mark(name: string) {
    if (!this.enabled || typeof performance === 'undefined') return;
    
    try {
      performance.mark(name);
    } catch (error) {
      console.warn('Performance mark failed:', error);
    }
  }

  measure(name: string, startMark: string, endMark?: string) {
    if (!this.enabled || typeof performance === 'undefined') return;
    
    try {
      const end = endMark || `${name}-end`;
      performance.mark(end);
      performance.measure(name, startMark, end);
      
      const measure = performance.getEntriesByName(name, 'measure')[0];
      if (measure) {
        this.metrics.push({
          name,
          value: measure.duration,
          timestamp: Date.now()
        });
        
        // Log slow operations in development
        if (import.meta.env.DEV && measure.duration > 100) {
          console.warn(`Slow operation detected: ${name} took ${measure.duration.toFixed(2)}ms`);
        }
      }
    } catch (error) {
      console.warn('Performance measure failed:', error);
    }
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startMark = `${name}-start`;
    this.mark(startMark);
    
    try {
      const result = await fn();
      this.measure(name, startMark);
      return result;
    } catch (error) {
      this.measure(`${name}-error`, startMark);
      throw error;
    }
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getPageLoadMetrics() {
    if (typeof performance === 'undefined' || !performance.timing) return null;

    const timing = performance.timing;
    return {
      // Core Web Vitals approximations
      domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
      windowLoad: timing.loadEventEnd - timing.navigationStart,
      
      // Detailed metrics
      dns: timing.domainLookupEnd - timing.domainLookupStart,
      tcp: timing.connectEnd - timing.connectStart,
      request: timing.responseStart - timing.requestStart,
      response: timing.responseEnd - timing.responseStart,
      domProcessing: timing.domComplete - timing.domLoading,
    };
  }

  logPageLoadMetrics() {
    if (!this.enabled) return;

    window.addEventListener('load', () => {
      setTimeout(() => {
        const metrics = this.getPageLoadMetrics();
        if (metrics && import.meta.env.DEV) {
          console.log('Page Load Metrics:', {
            'DOM Content Loaded': `${metrics.domContentLoaded}ms`,
            'Window Load': `${metrics.windowLoad}ms`,
            'DNS Lookup': `${metrics.dns}ms`,
            'TCP Connection': `${metrics.tcp}ms`,
            'Request Time': `${metrics.request}ms`,
            'Response Time': `${metrics.response}ms`,
            'DOM Processing': `${metrics.domProcessing}ms`,
          });
        }
      }, 0);
    });
  }

  clear() {
    this.metrics = [];
    if (typeof performance !== 'undefined' && performance.clearMarks) {
      performance.clearMarks();
      performance.clearMeasures();
    }
  }
}

export const perfMonitor = new PerformanceMonitor();

// Auto-log page load metrics
if (typeof window !== 'undefined') {
  perfMonitor.logPageLoadMetrics();
}
