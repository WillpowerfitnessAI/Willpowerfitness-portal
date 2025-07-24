
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Missing DATABASE_URL environment variable. Please set up Replit PostgreSQL database.');
}

// Create a more robust connection pool
export const pool = new Pool({
  connectionString: databaseUrl,
  max: 5, // Reduced pool size for better stability
  idleTimeoutMillis: 10000, // Reduced idle timeout
  connectionTimeoutMillis: 5000, // Increased connection timeout
  acquireTimeoutMillis: 10000, // Time to wait for connection from pool
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  ssl: false // Disable SSL for Replit internal connections
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Helper function to execute queries with better error handling
export async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Test connection function
export async function testConnection() {
  try {
    const result = await query('SELECT NOW() as current_time');
    console.log('✓ Database connection test successful');
    return true;
  } catch (error) {
    console.error('✗ Database connection test failed:', error.message);
    return false;
  }
}

export default pool;
