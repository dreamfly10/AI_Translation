/**
 * Script to run the target_language migration
 * This ensures the target_language column exists in the articles table
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase configuration!');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function runMigration() {
  console.log('🔄 Running migration to add target_language column...\n');

  // Read the migration file
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', 'add_target_language_to_articles.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  try {
    // Execute the migration using RPC or direct SQL
    // Note: Supabase JS client doesn't support arbitrary SQL execution
    // We'll need to use the REST API or provide instructions
    
    console.log('📝 Migration SQL to run:');
    console.log('─'.repeat(60));
    console.log(migrationSQL);
    console.log('─'.repeat(60));
    console.log('\n⚠️  Supabase JS client cannot execute arbitrary SQL.');
    console.log('Please run this SQL in your Supabase Dashboard:\n');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Click "New query"');
    console.log('5. Paste the SQL above');
    console.log('6. Click "Run" (or press Ctrl+Enter)');
    console.log('\n✅ After running, the target_language column will be added.');
    console.log('   PostgREST will automatically refresh its schema cache.\n');
    
    // Verify if column exists
    console.log('🔍 Checking if target_language column exists...');
    const { data, error } = await supabase
      .from('articles')
      .select('target_language')
      .limit(1);
    
    if (error) {
      if (error.code === 'PGRST204') {
        console.log('❌ Column does not exist. Please run the migration SQL above.\n');
      } else {
        console.log(`⚠️  Error checking column: ${error.message}\n`);
      }
    } else {
      console.log('✅ Column exists! The migration may have already been run.\n');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

runMigration();
