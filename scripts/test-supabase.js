// Quick script to test Supabase connection
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing Supabase connection...\n');
console.log('URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
console.log('Key:', supabaseAnonKey ? `✓ Set (starts with: ${supabaseAnonKey.substring(0, 10)}...)` : '✗ Missing');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('\n❌ Missing Supabase configuration!');
  process.exit(1);
}

// Check for both legacy JWT format and new publishable format
const isLegacyJwt = supabaseAnonKey.startsWith('eyJ');
const isNewPublishable = supabaseAnonKey.startsWith('sb_publishable_');

if (!isLegacyJwt && !isNewPublishable) {
  console.error('\n❌ Invalid anon key format!');
  console.error('Expected anon key to start with "eyJ" (legacy JWT) or "sb_publishable_" (new format)');
  console.error('Current key starts with:', supabaseAnonKey.substring(0, 20));
  console.error('\nTo fix:');
  console.error('1. Go to Supabase Dashboard → Settings → API');
  console.error('2. Copy the "anon public" or "publishable" key (NOT the service_role key)');
  console.error('3. It should start with "eyJ..." (legacy) or "sb_publishable_..." (new)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test connection by querying users table
supabase
  .from('users')
  .select('count')
  .limit(1)
  .then(({ data, error }) => {
    if (error) {
      if (error.code === '42P01') {
        console.error('\n❌ Table "users" does not exist!');
        console.error('Please run the SQL schema from supabase/schema.sql in your Supabase SQL Editor.');
      } else if (error.message.includes('JWT')) {
        console.error('\n❌ Invalid API key!');
        console.error('The key you provided is not valid. Please check your NEXT_PUBLIC_SUPABASE_ANON_KEY');
      } else {
        console.error('\n❌ Connection error:', error.message);
        console.error('Error code:', error.code);
      }
      process.exit(1);
    } else {
      console.log('\n✅ Supabase connection successful!');
      console.log('Database is configured correctly.');
      process.exit(0);
    }
  })
  .catch((err) => {
    console.error('\n❌ Unexpected error:', err.message);
    process.exit(1);
  });

