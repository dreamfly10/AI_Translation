# Fix Supabase Configuration

## Issue Found

Your `.env.local` file has incorrect Supabase configuration:

**Current (WRONG):**
```
NEXT_PUBLIC_SUPABASE_URL=https://supabase.com/dashboard/project/tdwuydzydpnzaqdpizyo/database/tables/17484
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_secret_7gsLFqr1XGJkp6YMBIOeHg_8oHUD8Mn
```

## Problems

1. **Wrong URL format**: The URL should be your project's API URL, not a dashboard link
2. **Wrong key type**: The key appears to be a secret key, not the anon/public key

## How to Fix

### Step 1: Get Correct Supabase URL

1. Go to https://supabase.com/dashboard
2. Select your project (tdwuydzydpnzaqdpizyo)
3. Go to **Settings** → **API**
4. Find **Project URL** (should look like: `https://tdwuydzydpnzaqdpizyo.supabase.co`)
5. Copy this URL

### Step 2: Get Correct Anon Key

1. In the same **Settings** → **API** page
2. Find **anon public** key (starts with `eyJ...`)
3. Copy this key (NOT the service_role key)

### Step 3: Update .env.local

Open `.env.local` and update these lines:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://tdwuydzydpnzaqdpizyo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important:**
- URL should end with `.supabase.co` (not `.com/dashboard/...`)
- Anon key should start with `eyJ` (not `sb_secret_`)

### Step 4: Verify Database Schema

Make sure you've run the SQL schema:

1. Go to Supabase dashboard → **SQL Editor**
2. Click **New query**
3. Copy and paste the entire contents of `supabase/schema.sql`
4. Click **Run**

### Step 5: Restart Dev Server

After updating `.env.local`:

1. Stop the dev server (Ctrl+C)
2. Restart it: `npm run dev`
3. Try registering again

## Quick Check

After fixing, your `.env.local` should have:

```env
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkd3V5ZHp5ZHBuemFxZHBpenlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MT...
```

The anon key is a long JWT token that starts with `eyJ`.



