import { Pool, PoolClient } from 'pg';
import { env } from '../config/env';

/**
 * PostgreSQL connection pool for audit database
 * Configured for append-only workload patterns
 */
let pool: Pool | null = null;

/**
 * Initialize the database connection pool
 */
export function initializePool(): Pool {
  if (pool) {
    return pool;
  }

  pool = new Pool({
    connectionString: env.DATABASE_URL,
    min: env.DATABASE_POOL_MIN,
    max: env.DATABASE_POOL_MAX,
    ssl: env.DATABASE_SSL_ENABLED ? { rejectUnauthorized: true } : false,
    // Optimized connection settings for faster response times
    connectionTimeoutMillis: 5000,  // Fast fail on connection issues
    idleTimeoutMillis: 30000,       // Release idle connections after 30s
    // Application name for monitoring
    application_name: env.SERVICE_NAME,
  });

  pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
  });

  pool.on('connect', (client) => {
    // Set session configurations for audit workload - reduced timeout
    client.query('SET statement_timeout = 15000'); // 15 second timeout
  });

  return pool;
}

/**
 * Get the database pool instance
 */
export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializePool() first.');
  }
  return pool;
}

/**
 * Execute a query with automatic connection management
 */
export async function query<T>(
  sql: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
  const client = await getPool().connect();
  try {
    const result = await client.query(sql, params);
    return {
      rows: result.rows as T[],
      rowCount: result.rowCount ?? 0,
    };
  } finally {
    client.release();
  }
}

/**
 * Execute queries within a transaction
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close the database pool gracefully
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Health check for database connectivity
 */
export async function checkHealth(): Promise<{ healthy: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    await query('SELECT 1');
    return {
      healthy: true,
      latencyMs: Date.now() - start,
    };
  } catch {
    return {
      healthy: false,
      latencyMs: Date.now() - start,
    };
  }
}
