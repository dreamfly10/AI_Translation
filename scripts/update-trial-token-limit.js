/**
 * Migration script to update existing trial users' token limit from 100,000 to 1,000
 * Run this script once to update existing users in the database
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Error: Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function updateTrialTokenLimits() {
  try {
    console.log('Updating trial users\' token limits from 100,000 to 1,000...');
    
    // Update all trial users with the old limit
    const { data, error } = await supabase
      .from('users')
      .update({ 
        token_limit: 1000,
        updated_at: new Date().toISOString()
      })
      .eq('user_type', 'trial')
      .gte('token_limit', 10000) // Only update users with old limit (>= 10k)
      .select();

    if (error) {
      console.error('Error updating users:', error);
      process.exit(1);
    }

    console.log(`✅ Successfully updated ${data?.length || 0} trial users`);
    console.log('All trial users now have a token limit of 1,000');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateTrialTokenLimits();

