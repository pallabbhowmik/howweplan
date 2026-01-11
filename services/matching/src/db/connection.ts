import { Pool, PoolClient, PoolConfig } from 'pg';
import { env } from '../config/index.js';

let pool: Pool | null = null;

// Version for debugging deployment issues
const CONNECTION_MODULE_VERSION = '2.2.0';

/**
 * Parse DATABASE_URL into individual connection parameters.
 * This bypasses pg-connection-string which has issues with some URL formats.
 */
function parseDatabaseUrl(url: string): PoolConfig {
  console.info(`[DB v${CONNECTION_MODULE_VERSION}] Parsing DATABASE_URL...`);
  
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

  // Parse URL manually to extract components
  // Format: postgresql://user:password@host:port/database?params
  const regex = /^postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^:\/]+):?(\d+)?\/([^?]+)(?:\?(.*))?$/;
  const match = trimmed.match(regex);
  
  if (!match) {
    throw new Error(`DATABASE_URL format is invalid. Expected: postgresql://user:password@host:port/database`);
  }

  const [, user, password, host, port, database, queryString] = match;
  
  if (!user || !password || !host || !database) {
    throw new Error('DATABASE_URL is missing required components (user, password, host, or database)');
  }
  
  // Parse query string for SSL options
  let ssl: boolean | { rejectUnauthorized: boolean } = false;
  if (queryString) {
    const params = new URLSearchParams(queryString);
    const sslMode = params.get('sslmode') || params.get('ssl');
    if (sslMode === 'require' || sslMode === 'true' || sslMode === 'verify-ca' || sslMode === 'verify-full') {
      ssl = { rejectUnauthorized: sslMode === 'verify-full' };
    }
  }
  
  // For Supabase pooler, always use SSL
  if (host.includes('supabase.com') || host.includes('pooler.supabase')) {
    ssl = { rejectUnauthorized: false };
  }

  console.info(`[DB v${CONNECTION_MODULE_VERSION}] Parsed: host=${host}, port=${port || '5432'}, database=${database}, user=${user}, ssl=${!!ssl}`);

  return {
    user: decodeURIComponent(user),
    password: decodeURIComponent(password),
    host,
    port: port ? parseInt(port, 10) : 5432,
    database,
    ssl,
  };
}

export function initializePool(): Pool {
  if (pool) return pool;

  // Parse DATABASE_URL into explicit parameters (bypasses pg-connection-string)
  const config = parseDatabaseUrl(env.DATABASE_URL);
  
  console.info(`[DB v${CONNECTION_MODULE_VERSION}] Creating pool...`);

  pool = new Pool({
    ...config,
    min: env.DATABASE_POOL_MIN,
    max: env.DATABASE_POOL_MAX,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    application_name: env.SERVICE_NAME,
  });

  pool.on('error', (err) => {
    console.error('[DB] Unexpected pool error:', err);
  });

  pool.on('connect', (client) => {
    console.info('[DB] New client connected');
    client.query('SET statement_timeout = 15000').catch(() => {});
  });

  console.info(`[DB v${CONNECTION_MODULE_VERSION}] Pool created successfully`);
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
