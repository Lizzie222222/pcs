import * as cron from 'node-cron';
import { storage } from './storage';
import { getBaseUrl } from './emailService';

const ENDPOINTS_TO_MONITOR = [
  { name: '/', path: '/' },
  { name: '/api/countries', path: '/api/countries' },
  { name: '/api/case-studies', path: '/api/case-studies' },
  { name: '/api/events', path: '/api/events' },
];

interface HealthCheckResult {
  endpoint: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime?: number;
  errorMessage?: string;
}

async function checkEndpointHealth(endpoint: { name: string; path: string }): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const baseUrl = getBaseUrl();
    
    const response = await fetch(`${baseUrl}${endpoint.path}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Health-Monitor/1.0',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        endpoint: endpoint.name,
        status: responseTime > 2000 ? 'degraded' : 'healthy',
        responseTime,
      };
    } else {
      return {
        endpoint: endpoint.name,
        status: 'down',
        responseTime,
        errorMessage: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      endpoint: endpoint.name,
      status: 'down',
      responseTime,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function runHealthChecks() {
  console.log('[Health Monitor] Running health checks...');
  
  const results = await Promise.all(
    ENDPOINTS_TO_MONITOR.map(endpoint => checkEndpointHealth(endpoint))
  );

  for (const result of results) {
    try {
      await storage.createHealthCheck(result);
      console.log(`[Health Monitor] ${result.endpoint}: ${result.status} (${result.responseTime}ms)`);
    } catch (error) {
      console.error(`[Health Monitor] Failed to log health check for ${result.endpoint}:`, error);
    }
  }
}

async function aggregateDailyMetrics() {
  console.log('[Health Monitor] Aggregating daily metrics...');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const endpoint of ENDPOINTS_TO_MONITOR) {
    try {
      const checks = await storage.getRecentHealthChecks(endpoint.name, 1440); // Last 24 hours (1 check/min)
      
      if (checks.length === 0) continue;

      const totalChecks = checks.length;
      const successfulChecks = checks.filter(c => c.status === 'healthy').length;
      const failedChecks = checks.filter(c => c.status === 'down').length;
      
      const responseTimes = checks
        .filter(c => c.responseTime !== null && c.responseTime !== undefined)
        .map(c => c.responseTime!);
      
      const avgResponseTime = responseTimes.length > 0
        ? (responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length).toFixed(2)
        : '0';

      const uptimePercentage = ((successfulChecks / totalChecks) * 100).toFixed(2);

      await storage.updateUptimeMetric({
        date: today,
        endpoint: endpoint.name,
        totalChecks,
        successfulChecks,
        failedChecks,
        avgResponseTime,
        uptimePercentage,
      });

      console.log(`[Health Monitor] Metrics for ${endpoint.name}: ${uptimePercentage}% uptime`);
    } catch (error) {
      console.error(`[Health Monitor] Failed to aggregate metrics for ${endpoint.name}:`, error);
    }
  }
}

export function startHealthMonitoring() {
  console.log('[Health Monitor] Starting health monitoring service...');

  // Run health checks every minute
  cron.schedule('* * * * *', () => {
    runHealthChecks().catch(error => {
      console.error('[Health Monitor] Error in health check cron job:', error);
    });
  });

  // Aggregate daily metrics every hour
  cron.schedule('0 * * * *', () => {
    aggregateDailyMetrics().catch(error => {
      console.error('[Health Monitor] Error in metrics aggregation cron job:', error);
    });
  });

  // Run initial health check immediately
  runHealthChecks().catch(error => {
    console.error('[Health Monitor] Error in initial health check:', error);
  });

  console.log('[Health Monitor] Health monitoring service started');
}
