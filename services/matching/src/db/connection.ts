import { Pool, PoolClient } from 'pg';
import { env } from '../config/index.js';

let pool: Pool | null = null;

/**
 * Validate DATABASE_URL format before passing to pg-pool.
 * Only check that it exists and has the right protocol prefix.
 * Don't use new URL() as it's too strict for some valid postgres URLs.
 */
function validateDatabaseUrl(url: string | undefined): string {
  if (!url || typeof url !== 'string') {
    throw new Error('DATABASE_URL environment variable is not set or empty');
  }

  const trimmed = url.trim();
  if (!trimmed) {
    throw new Error('DATABASE_URL environment variable is empty after trimming');
  }

  // Must start with postgres:// or postgresql://
  if (!trimmed.startsWith('postgres://') && !trimmed.startsWith('postgresql://')) {
    throw new Error(`DATABASE_URL must start with postgres:// or postgresql://, got: ${trimmed.substring(0, 20)}...`);
  }

  return trimmed;
}

export function initializePool(): Pool {
  if (pool) return pool;

  // Validate DATABASE_URL before creating pool
  const validatedUrl = validateDatabaseUrl(env.DATABASE_URL);
  
  // Log sanitized connection info for debugging (hide password)
  const maskedUrl = validatedUrl.replace(/(:\/\/[^:]+:)[^@]+(@)/, '$1****$2');
  console.info(`[DB] Initializing pool with: ${maskedUrl}`);

  pool = new Pool({
    connectionString: validatedUrl,
    min: env.DATABASE_POOL_MIN,
    max: env.DATABASE_POOL_MAX,
    connectionTimeoutMillis: 5000,   // Fast fail on connection issues (reduced from 10s)
    idleTimeoutMillis: 30000,
    application_name: env.SERVICE_NAME,
  });

  pool.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('Unexpected database pool error:', err);
  });

  pool.on('connect', (client) => {
    client.query('SET statement_timeout = 15000').catch(() => {  // Reduced from 30s
      // ignore
    });
  });

  return pool;
}

export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializePool() first.');
  }
  return pool;
}

export async function query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number }> {
  const client = await getPool().connect();
  try {
    const result = await client.query(sql, params);
    return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
  } finally {
    client.release();
  }
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
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

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
