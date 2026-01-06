/**
 * HowWePlan - Monolithic Backend Entry Point
 * 
 * Runs all microservices in a single process for single-container deployment.
 * The API Gateway handles external requests and routes to internal service handlers.
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';

interface ServiceConfig {
  name: string;
  port: number;
  path: string;
  required: boolean;
}

const services: ServiceConfig[] = [
  { name: 'event-bus', port: 4000, path: '../event-bus-service/dist/index.js', required: true },
  { name: 'audit', port: 3010, path: '../audit/dist/index.js', required: true },
  { name: 'identity', port: 3011, path: '../identity/dist/index.js', required: true },
  { name: 'requests', port: 3012, path: '../requests/dist/index.js', required: true },
  { name: 'matching', port: 3013, path: '../matching/dist/index.js', required: false },
  { name: 'itineraries', port: 3014, path: '../itineraries/dist/index.js', required: false },
  { name: 'booking-payments', port: 3015, path: '../booking-payments/dist/index.js', required: false },
  { name: 'messaging', port: 3016, path: '../messaging/dist/index.js', required: false },
  { name: 'disputes', port: 3017, path: '../disputes/dist/index.js', required: false },
  { name: 'reviews', port: 3018, path: '../reviews/dist/index.js', required: false },
  { name: 'notifications', port: 3019, path: '../notifications/dist/index.js', required: false },
];

const runningProcesses: Map<string, ChildProcess> = new Map();

function startService(service: ServiceConfig): Promise<void> {
  return new Promise((resolve, reject) => {
    const servicePath = path.resolve(__dirname, service.path);
    
    console.log(`[LAUNCHER] Starting ${service.name} on port ${service.port}...`);
    
    const env = {
      ...process.env,
      PORT: String(service.port),
      SERVICE_NAME: service.name,
      // Internal service URLs (localhost since all in same container)
      EVENT_BUS_URL: 'http://localhost:4000',
      IDENTITY_SERVICE_URL: 'http://localhost:3011',
      REQUESTS_SERVICE_URL: 'http://localhost:3012',
      BOOKING_SERVICE_URL: 'http://localhost:3015',
      PAYMENTS_SERVICE_URL: 'http://localhost:3015',
      NOTIFICATION_SERVICE_URL: 'http://localhost:3019',
      AUDIT_SERVICE_URL: 'http://localhost:3010',
    };

    const child = spawn('node', [servicePath], {
      env,
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    runningProcesses.set(service.name, child);

    child.stdout?.on('data', (data) => {
      console.log(`[${service.name.toUpperCase()}] ${data.toString().trim()}`);
    });

    child.stderr?.on('data', (data) => {
      console.error(`[${service.name.toUpperCase()}] ${data.toString().trim()}`);
    });

    child.on('error', (err) => {
      console.error(`[LAUNCHER] Failed to start ${service.name}:`, err.message);
      if (service.required) {
        reject(err);
      } else {
        resolve();
      }
    });

    child.on('exit', (code) => {
      console.log(`[LAUNCHER] ${service.name} exited with code ${code}`);
      runningProcesses.delete(service.name);
    });

    // Give service time to start
    setTimeout(() => resolve(), 2000);
  });
}

async function startAllServices(): Promise<void> {
  console.log('[LAUNCHER] ====================================');
  console.log('[LAUNCHER] HowWePlan Monolithic Backend');
  console.log('[LAUNCHER] ====================================');
  console.log(`[LAUNCHER] Starting ${services.length} services...`);

  // Start services sequentially to manage dependencies
  for (const service of services) {
    try {
      await startService(service);
      console.log(`[LAUNCHER] ✓ ${service.name} started`);
    } catch (err) {
      if (service.required) {
        console.error(`[LAUNCHER] ✗ Required service ${service.name} failed to start`);
        throw err;
      }
      console.warn(`[LAUNCHER] ⚠ Optional service ${service.name} failed to start, continuing...`);
    }
  }

  // Finally start the API Gateway (main entry point)
  console.log('[LAUNCHER] Starting API Gateway on port', process.env.PORT || 3000);
  require('./index');
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[LAUNCHER] Received SIGTERM, shutting down...');
  for (const [name, proc] of runningProcesses) {
    console.log(`[LAUNCHER] Stopping ${name}...`);
    proc.kill('SIGTERM');
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[LAUNCHER] Received SIGINT, shutting down...');
  for (const [name, proc] of runningProcesses) {
    console.log(`[LAUNCHER] Stopping ${name}...`);
    proc.kill('SIGINT');
  }
  process.exit(0);
});

// Start everything
startAllServices().catch((err) => {
  console.error('[LAUNCHER] Fatal error:', err);
  process.exit(1);
});
