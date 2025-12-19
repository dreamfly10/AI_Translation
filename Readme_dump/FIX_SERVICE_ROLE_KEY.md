# Fix Registration Error - Service Role Key

## Problem

You're getting a "500 Internal Server Error" when trying to register. This is because Supabase Row Level Security (RLS) is blocking server-side operations.

## Solution

You need to add the **Service Role Key** to your `.env.local` file. This key bypasses RLS and allows server-side operations (like user registration).

## How to Get the Service Role Key

### Step 1: Go to Supabase Dashboard

1. Open https://supabase.com/dashboard
2. Select your project

### Step 2: Get the Service Role Key

1. Click **Settings** (gear icon in left sidebar)
2. Click **API** in the settings menu
3. Look for the **Project API keys** section
4. Find the key labeled **service_role** (NOT "anon" or "publishable")
5. Click the **eye icon** to reveal the key (it's hidden by default)
6. Copy the entire key

**Important:** 
- The service role key is a **secret key** - never expose it to the client
- It starts with `eyJ` (JWT format)
- It's much longer than the anon key
- Keep it secure and never commit it to version control

### Step 3: Add to .env.local

Open your `.env.local` file and add:

```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkd3V5ZHp5ZHBuemFxZHBpenlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcx...
```

Replace the value with your actual service role key.

### Step 4: Restart Server

After updating `.env.local`:
1. Stop the dev server (Ctrl+C)
2. Restart: `npm run dev`
3. Try registering again

## Why This is Needed

- **Anon Key**: Used for client-side operations, respects Row Level Security (RLS)
- **Service Role Key**: Used for server-side operations, bypasses RLS

Since your app uses NextAuth (not Supabase Auth), server-side operations need the service role key to bypass RLS policies.

## Security Note

The service role key has full access to your database. It's only used server-side in API routes and never exposed to the client. This is the standard pattern for NextAuth + Supabase setups.

