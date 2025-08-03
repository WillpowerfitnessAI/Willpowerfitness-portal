
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Missing DATABASE_URL environment variable. Please set up Replit PostgreSQL database.');
}

// Create a more robust connection pool for Replit
export const pool = new Pool({
  connectionString: databaseUrl,
  max: 5, // Increased pool size for better performance
  min: 1, // Keep at least one connection
  idleTimeoutMillis: 60000, // 60 seconds - longer idle time
  connectionTimeoutMillis: 15000, // 15 seconds to establish connection
  acquireTimeoutMillis: 20000, // 20 seconds to get connection from pool
  keepAlive: true,
  keepAliveInitialDelayMillis: 0,
  ssl: false,
  // Add retry logic for Replit's database sleep behavior
  application_name: 'willpower_fitness_ai'
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Helper function to execute queries with better error handling and retries
export async function query(text, params, retries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    let client;
    try {
      // Get connection with timeout
      client = await Promise.race([
        pool.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 8000)
        )
      ]);
      
      const result = await client.query(text, params);
      return result;
    } catch (error) {
      lastError = error;
      console.error(`Database query attempt ${attempt}/${retries} failed:`, error.message);
      
      // Release client if we got one
      if (client) {
        try { client.release(true); } catch (e) { /* ignore */ }
      }
      
      // If it's the last attempt, don't wait
      if (attempt === retries) break;
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    } finally {
      if (client) {
        try { client.release(); } catch (e) { /* ignore */ }
      }
    }
  }
  
  throw lastError;
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
