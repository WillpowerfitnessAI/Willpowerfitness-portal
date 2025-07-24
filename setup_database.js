
import { supabase } from './lib/supabaseClient.js';
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
    const sqlCommands = fs.readFileSync(sqlFile, 'utf8');
    
    // Split SQL commands by semicolon and filter out empty ones
    const commands = sqlCommands
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`Found ${commands.length} SQL commands to execute`);
    
    // Execute each command
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      console.log(`Executing command ${i + 1}/${commands.length}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql: command });
      
      if (error) {
        console.error(`Error executing command ${i + 1}:`, error);
        // Try direct query for CREATE TABLE commands
        if (command.toUpperCase().includes('CREATE TABLE')) {
          const { error: directError } = await supabase.from('_').select('*').limit(0);
          if (directError) {
            console.log('Note: You may need to run the SQL commands manually in your Supabase dashboard');
          }
        }
      } else {
        console.log(`✓ Command ${i + 1} executed successfully`);
      }
    }
    
    console.log('Database setup completed!');
    
    // Test the connection
    console.log('Testing database connection...');
    const { data, error } = await supabase.from('user_profiles').select('count', { count: 'exact' });
    
    if (error) {
      console.error('Connection test failed:', error);
      console.log('\nPlease run these SQL commands manually in your Supabase SQL editor:');
      console.log('https://supabase.com/dashboard/project/[your-project]/sql');
      console.log('\n' + sqlCommands);
    } else {
      console.log('✓ Database connection successful!');
    }
    
  } catch (error) {
    console.error('Setup failed:', error);
    console.log('\nIf automatic setup fails, please run the SQL commands from database_setup.sql manually in your Supabase dashboard.');
  }
}

setupDatabase();
