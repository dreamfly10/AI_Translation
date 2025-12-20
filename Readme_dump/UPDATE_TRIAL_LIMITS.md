# Update Trial User Token Limits

## Problem

Existing users in the database may still have the old token limit of 100,000 tokens instead of the new limit of 1,000 tokens.

## Solution

Run the migration script to update all existing trial users' token limits.

## Steps

1. **Make sure your `.env.local` file has Supabase credentials:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **Run the migration script:**
   ```bash
   npm run update-trial-limits
   ```

3. **Verify the update:**
   - The script will output how many users were updated
   - Check your Supabase dashboard to confirm trial users now have `token_limit: 1000`

## What the Script Does

- Finds all trial users with `token_limit >= 10,000` (old limit)
- Updates their `token_limit` to `1,000`
- Updates the `updated_at` timestamp

## Manual Update (Alternative)

If you prefer to update manually in Supabase SQL Editor:

```sql
UPDATE users
SET token_limit = 1000,
    updated_at = NOW()
WHERE user_type = 'trial' 
  AND token_limit >= 10000;
```

## Notes

- New users created after the code update will automatically get 1,000 tokens
- This script only updates existing users with the old limit
- Paid users are not affected

