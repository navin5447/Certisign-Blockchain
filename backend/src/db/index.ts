import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

export function getDbConnection() {
  if (!db) {
    if (!process.env.NEON_DB_URL) {
      console.warn('⚠️  NEON_DB_URL environment variable is not set. Database functionality will be limited.');
      // Return a mock connection for development
      return null as any;
    }

    pool = new Pool({ connectionString: process.env.NEON_DB_URL });
    db = drizzle(pool, { schema });
  }

  return db;
}

export async function closeDbConnection() {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
}

// Export the database instance for use in other modules
export const database = getDbConnection();

// Export schema for external use
export { schema };

// Health check function
export async function checkDbConnection(): Promise<boolean> {
  try {
    const db = getDbConnection();
    if (!db) return false;
    
    // Use sql template for raw SQL queries
    await db.execute(sql`SELECT 1`);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Migration helper (if needed)
export async function runMigrations() {
  // This would typically be handled by drizzle-kit migrate command
  console.log('Migrations should be run using: npm run db:migrate');
}

export default database;
