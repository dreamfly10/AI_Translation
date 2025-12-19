# Fix Supabase Anon Key Issue

## Problem

Your `.env.local` has the **wrong type of key**. You're using:
```
sb_publishable_9l0wsc0pdLDjw_Egvgpf8A_oHJnNzH6
```

But you need the **anon public key** which is a JWT token starting with `eyJ`.

## How to Fix

### Step 1: Go to Supabase Dashboard

1. Open https://supabase.com/dashboard
2. Select your project (tdwuydzydpnzaqdpizyo)

### Step 2: Get the Correct Key

1. Click **Settings** (gear icon in left sidebar)
2. Click **API** in the settings menu
3. Look for the **Project API keys** section
4. Find the key labeled **anon public** or **anon** (NOT "publishable" or "service_role")
5. The key should be a **very long JWT token** that starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Step 3: Update .env.local

Open your `.env.local` file and replace the anon key:

**Before (WRONG):**
```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_9l0wsc0pdLDjw_Egvgpf8A_oHJnNzH6
```

**After (CORRECT):**
```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkd3V5ZHp5ZHBuemFxZHBpenlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MT...
```

**Important:** 
- The key should start with `eyJ` (not `sb_`)
- It's a very long JWT token (usually 200+ characters)
- It's labeled "anon" or "anon public" in the dashboard

### Step 4: Verify

Run the test script:
```bash
npm run test-supabase
```

You should see:
```
✅ Supabase connection successful!
Database is configured correctly.
```

### Step 5: Restart Server

After updating `.env.local`:
1. Stop the dev server (Ctrl+C)
2. Restart: `npm run dev`
3. Try registering again

## Visual Guide

In Supabase Dashboard → Settings → API, you'll see something like:

```
Project API keys
├── anon public          ← USE THIS ONE (starts with eyJ...)
├── service_role        ← DON'T USE (secret key)
└── publishable         ← DON'T USE (sb_publishable_...)
```

## Still Having Issues?

If you can't find the anon key:
1. Make sure you're in **Settings → API** (not somewhere else)
2. Look for the longest key (JWT tokens are very long)
3. It should start with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`



