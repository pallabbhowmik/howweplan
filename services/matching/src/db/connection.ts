import { Pool, PoolClient } from 'pg';
import { env } from '../config/index.js';

let pool: Pool | null = null;

export function initializePool(): Pool {
  if (pool) return pool;

  pool = new Pool({
    connectionString: env.DATABASE_URL,
    min: env.DATABASE_POOL_MIN,
    max: env.DATABASE_POOL_MAX,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    application_name: env.SERVICE_NAME,
  });

  pool.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('Unexpected database pool error:', err);
  });

  pool.on('connect', (client) => {
    client.query('SET statement_timeout = 30000').catch(() => {
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
