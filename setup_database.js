
import { query } from './lib/supabaseClient.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupDatabase() {
  try {
    console.log('Setting up database tables...');

    // Read the SQL file
    const sqlFile = path.join(__dirname, 'database_setup.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');

    // Remove comments and split by semicolons
    const cleanedSql = sqlContent
      .replace(/--.*$/gm, '') // Remove comments
      .replace(/\n\s*\n/g, '\n') // Remove empty lines
      .trim();

    // Split into individual commands
    const commands = cleanedSql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0);

    console.log(`Found ${commands.length} SQL commands to execute`);

    // Execute each command individually
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i] + ';'; // Add semicolon back
      console.log(`Executing command ${i + 1}/${commands.length}...`);
      
      try {
        await query(command);
        console.log(`✓ Command ${i + 1} executed successfully`);
      } catch (error) {
        // Only log as error if it's not a "already exists" error
        if (error.message.includes('already exists')) {
          console.log(`- Command ${i + 1} skipped (already exists)`);
        } else {
          console.error(`✗ Error executing command ${i + 1}:`, error.message);
        }
      }
    }

    console.log('Database setup completed!');

    // Test the connection
    console.log('Testing database connection...');
    try {
      const result = await query('SELECT COUNT(*) FROM user_profiles');
      console.log('✓ Database connection successful!');
      console.log(`Found ${result.rows[0].count} user profiles`);
    } catch (error) {
      console.error('Connection test failed:', error.message);
    }

  } catch (error) {
    console.error('Setup failed:', error);
  }
}

setupDatabase();
