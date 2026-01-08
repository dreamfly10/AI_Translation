# Dependencies & Architecture Reference

**⚠️ IMPORTANT**: This document tracks all critical dependencies, relationships, and patterns in the codebase. Update this file when adding new features or changing dependencies.

## Table of Contents
1. [Database Schema](#database-schema)
2. [API Routes](#api-routes)
3. [Context Providers](#context-providers)
4. [Component Dependencies](#component-dependencies)
5. [Library Files](#library-files)
6. [Environment Variables](#environment-variables)
7. [External Services](#external-services)
8. [Critical File Relationships](#critical-file-relationships)
9. [Edge Cases & Error Handling](#edge-cases--error-handling)

---

## Database Schema

### Tables

#### `users` table
**Location**: `supabase/schema.sql`

**Columns**:
- `id` (UUID, PRIMARY KEY) - Auto-generated
- `email` (TEXT, UNIQUE, NOT NULL)
- `password` (TEXT, nullable) - Hashed password (null for OAuth users)
- `name` (TEXT, nullable)
- `image` (TEXT, nullable)
- `user_type` (TEXT, NOT NULL, DEFAULT 'trial') - CHECK constraint: 'trial' | 'paid'
- `tokens_used` (BIGINT, NOT NULL, DEFAULT 0)
- `token_limit` (BIGINT, NOT NULL, DEFAULT 1000) - 1k tokens for trial users
- `subscription_status` (TEXT, nullable) - CHECK constraint: 'active' | 'expired' | 'cancelled'
- `subscription_expires_at` (TIMESTAMPTZ, nullable)
- `payment_id` (TEXT, nullable) - Stripe customer ID
- `default_writing_style` (TEXT, nullable) - CHECK constraint: 'warmBookish' | 'lifeReflection' | 'contrarian' | 'education' | 'science'
- `default_expression_variation` (TEXT, nullable) - CHECK constraint: 'light' | 'medium' | 'heavy'
- `default_target_language` (TEXT, DEFAULT 'zh') - CHECK constraint: 'zh' | 'en' | 'es' | 'fr' | 'de' | 'ja' | 'ko' | 'pt' | 'it' | 'ru' | 'ar'
- `show_language_toggle` (BOOLEAN, DEFAULT true)
- `default_ui_language` (TEXT, DEFAULT 'en') - CHECK constraint: 'en' | 'zh'
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())

**Indexes**:
- `idx_users_email` on `email`
- `idx_users_user_type` on `user_type`

**RLS Policies**:
- Users can view own data (SELECT)
- Users can update own data (UPDATE)

**Access Pattern**:
- All queries use `supabaseServer` from `lib/supabase.ts` (bypasses RLS for server-side operations)
- Client-side uses `supabase` from `lib/supabase.ts` (respects RLS)

#### `articles` table
**Location**: `supabase/schema.sql`

**Columns**:
- `id` (UUID, PRIMARY KEY) - Auto-generated
- `user_id` (UUID, NOT NULL, FOREIGN KEY → users.id, ON DELETE CASCADE)
- `title` (TEXT, NOT NULL)
- `input_type` (TEXT, NOT NULL) - CHECK constraint: 'url' | 'text' | 'video'
- `source_url` (TEXT, nullable) - Original URL if input_type is 'url' or 'video'
- `original_content` (TEXT, NOT NULL) - Original article content
- `translated_content` (TEXT, NOT NULL) - Translated content
- `insights` (TEXT, NOT NULL) - Generated insights
- `style` (TEXT, nullable) - CHECK constraint: 'warmBookish' | 'lifeReflection' | 'contrarian' | 'education' | 'science'
- `target_language` (TEXT, DEFAULT 'zh') - CHECK constraint: 'zh' | 'en' | 'es' | 'fr' | 'de' | 'ja' | 'ko' | 'pt' | 'it' | 'ru' | 'ar'
- `tokens_used` (INTEGER, NOT NULL, DEFAULT 0)
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())

**Indexes**:
- `idx_articles_user_id` on `user_id`
- `idx_articles_created_at` on `created_at DESC`

**Triggers**:
- `update_articles_updated_at` - Auto-updates `updated_at` on row update

**Access Pattern**:
- Server-side queries filtered by `user_id`
- No RLS enabled (NextAuth handles authorization)

#### `voice_profiles` table (Author Profiles)
**Location**: `supabase/schema.sql`

**Columns**:
- `id` (UUID, PRIMARY KEY) - Auto-generated
- `user_id` (UUID, NOT NULL, FOREIGN KEY → users.id, ON DELETE CASCADE)
- `name` (TEXT, NOT NULL) - Profile name
- `sliders_json` (JSONB, nullable) - Future use for style sliders
- `do_list` (TEXT[], nullable) - Things to do in writing
- `dont_list` (TEXT[], nullable) - Things to avoid
- `style_rules` (JSONB, nullable) - Extracted style characteristics (tone, patterns, avoid list)
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())

**Indexes**:
- `idx_voice_profiles_user_id` on `user_id`

**Triggers**:
- `update_voice_profiles_updated_at` - Auto-updates `updated_at` on row update

**RLS Policies**:
- Users can view own voice profiles (SELECT)
- Users can insert own voice profiles (INSERT)
- Users can update own voice profiles (UPDATE)
- Users can delete own voice profiles (DELETE)

#### `voice_samples` table
**Location**: `supabase/schema.sql`

**Columns**:
- `id` (UUID, PRIMARY KEY) - Auto-generated
- `voice_profile_id` (UUID, NOT NULL, FOREIGN KEY → voice_profiles.id, ON DELETE CASCADE)
- `content` (TEXT, NOT NULL) - Writing sample content
- `word_count` (INTEGER, nullable) - Word count of sample
- `platform` (TEXT, nullable) - Source platform (e.g., "blog", "article")
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())

**Indexes**:
- `idx_voice_samples_profile_id` on `voice_profile_id`

**RLS Policies**:
- Users can view own voice samples (SELECT) - via voice_profiles.user_id
- Users can insert own voice samples (INSERT) - via voice_profiles.user_id
- Users can update own voice samples (UPDATE) - via voice_profiles.user_id
- Users can delete own voice samples (DELETE) - via voice_profiles.user_id

**Constraints**:
- Minimum 3 samples per profile (enforced in application logic)

---

## API Routes

### Authentication Routes

#### `POST /api/auth/register`
- **File**: `app/api/auth/register/route.ts`
- **Dependencies**: `lib/db.ts`, `lib/auth.ts`
- **Creates**: New user in `users` table with `userType: 'trial'`, `tokenLimit: 1000`
- **Returns**: User object or error

#### `GET/POST /api/auth/[...nextauth]`
- **File**: `app/api/auth/[...nextauth]/route.ts`
- **Dependencies**: `lib/auth.ts` (authOptions)
- **Handles**: NextAuth.js authentication flow
- **Providers**: Credentials (email/password), Google OAuth (optional)

### Article Routes

#### `GET /api/articles`
- **File**: `app/api/articles/route.ts`
- **Dependencies**: `lib/auth.ts`, `lib/supabase.ts`
- **Query Params**: `?limit=10&page=1` (optional)
- **Returns**: `{ articles: Article[], pagination: { page, limit, totalArticles, totalPages } }`
- **Used By**: `components/ArticleHistory.tsx`
- **Database**: Queries `articles` table filtered by `user_id` with pagination
- **Error Handling**: Handles connection errors, missing tables, count failures

#### `GET /api/articles/[id]`
- **File**: `app/api/articles/[id]/route.ts`
- **Dependencies**: `lib/auth.ts`, `lib/supabase.ts`
- **Returns**: Single article by ID (user must own article)
- **Used By**: `components/ArticleProcessor.tsx` (loadArticle function)
- **Includes**: `target_language` in response

### Processing Routes

#### `POST /api/process-article-stream`
- **File**: `app/api/process-article-stream/route.ts`
- **Dependencies**: `lib/auth.ts`, `lib/content-extractor.ts`, `lib/openai.ts`, `lib/token-tracker.ts`, `lib/supabase.ts`
- **Runtime**: `nodejs` with `force-dynamic`
- **Features**:
  - Server-Sent Events (SSE) streaming
  - Real-time progress updates
  - Chunked translation and insights
  - Token pre-validation and post-validation
  - Subscription expiration checks
  - Article saving with error handling
  - Token consumption after successful save
- **Request Body**: Zod-validated schema
- **Response**: SSE stream with events (status, translation_chunk, insights_chunk, complete, error, save_error)
- **Edge Cases**: Handles subscription expiration, save failures, voice profile errors, YouTube video processing

#### `POST /api/process-article`
- **File**: `app/api/process-article/route.ts`
- **Dependencies**: Similar to streaming version but non-streaming
- **Note**: Legacy endpoint, streaming version preferred

### Token & Usage Routes

#### `GET /api/token-usage`
- **File**: `app/api/token-usage/route.ts`
- **Dependencies**: `lib/auth.ts`, `lib/token-tracker.ts`
- **Returns**: `{ allowed: boolean, tokensUsed: number, tokensRemaining: number, limit: number, userType: 'trial' | 'paid', subscriptionStartDate, subscriptionExpiresAt }`
- **Used By**: `components/TokenUsage.tsx`, `components/UserHomePage.tsx`

### Payment Routes

#### `POST /api/create-checkout-session`
- **File**: `app/api/create-checkout-session/route.ts`
- **Dependencies**: `lib/auth.ts`, `lib/stripe.ts`
- **Returns**: `{ sessionId: string, url: string }`
- **Used By**: 
  - `components/TokenUsage.tsx` (UpgradeButton)
  - `components/PaidPlanBenefits.tsx`
  - `components/SettingsModal.tsx`
  - `app/upgrade/page.tsx`

#### `POST /api/create-portal-session`
- **File**: `app/api/create-portal-session/route.ts`
- **Dependencies**: `lib/auth.ts`, `lib/stripe.ts`, `lib/db.ts`
- **Features**:
  - Creates/finds Stripe customer by email if paymentId missing
  - Creates new customer if none found
  - Saves customer ID to user record
  - Returns billing portal URL
- **Used By**: `components/SettingsModal.tsx` (Manage Payment Information)

#### `GET /api/payment-history`
- **File**: `app/api/payment-history/route.ts`
- **Dependencies**: `lib/auth.ts`, `lib/stripe.ts`, `lib/db.ts`
- **Returns**: `{ invoices: Invoice[] }` - Up to 100 invoices from Stripe
- **Used By**: `components/SettingsModal.tsx` (Payment History section)
- **Error Handling**: Handles missing customers, Stripe API errors

#### `POST /api/cancel-subscription`
- **File**: `app/api/cancel-subscription/route.ts`
- **Dependencies**: `lib/auth.ts`, `lib/db.ts`
- **Updates**: User subscription status to 'cancelled'
- **Returns**: Success message with updated status

#### `POST /api/buy-tokens`
- **File**: `app/api/buy-tokens/route.ts`
- **Dependencies**: `lib/auth.ts`, `lib/stripe.ts`
- **Request Body**: `{ amount: '10k' | '50k' }`
- **Returns**: Stripe Checkout session for one-time token purchase

#### `GET /api/buy-tokens/prices`
- **File**: `app/api/buy-tokens/prices/route.ts`
- **Returns**: Token package prices

### Voice Profile Routes (Author Profiles)

#### `GET /api/voice-profiles`
- **File**: `app/api/voice-profiles/route.ts`
- **Dependencies**: `lib/auth.ts`, `lib/db.ts`
- **Returns**: `{ profiles: VoiceProfile[] }` - All profiles for authenticated user
- **Used By**: `components/ArticleProcessor.tsx`, `components/SettingsModal.tsx`

#### `POST /api/voice-profiles`
- **File**: `app/api/voice-profiles/route.ts`
- **Dependencies**: `lib/auth.ts`, `lib/db.ts`, `zod`
- **Request Body**: `{ name: string, samples: string[], doList?: string[], dontList?: string[] }`
- **Creates**: Voice profile and associated samples
- **Returns**: Created profile with samples

#### `GET /api/voice-profiles/[id]`
- **File**: `app/api/voice-profiles/[id]/route.ts`
- **Dependencies**: `lib/auth.ts`, `lib/db.ts`
- **Returns**: Single voice profile (user must own it)

#### `PUT /api/voice-profiles/[id]`
- **File**: `app/api/voice-profiles/[id]/route.ts`
- **Updates**: Voice profile (name, style rules, etc.)

#### `DELETE /api/voice-profiles/[id]`
- **File**: `app/api/voice-profiles/[id]/route.ts`
- **Deletes**: Voice profile and all associated samples (CASCADE)
- **Event**: Dispatches `voiceProfileUpdated` custom event

#### `POST /api/voice-profiles/[id]/extract-style`
- **File**: `app/api/voice-profiles/[id]/extract-style/route.ts`
- **Dependencies**: `lib/auth.ts`, `lib/db.ts`, `lib/openai.ts`
- **Features**:
  - Validates minimum 3 samples
  - Combines samples for analysis
  - Uses OpenAI to extract style rules (tone, patterns, avoid list)
  - Validates and parses JSON response
  - Updates profile with extracted rules
- **Returns**: Updated profile with style rules

#### `POST /api/voice-profiles/upload`
- **File**: `app/api/voice-profiles/upload/route.ts`
- **Dependencies**: `lib/auth.ts`
- **Request**: FormData with `file` field
- **Features**:
  - Reads file content
  - Validates word count (200-8000 words)
  - Supports non-English content (character-based counting)
  - Handles read errors and empty files
- **Returns**: `{ content: string, wordCount: number, fileName: string }`

#### `DELETE /api/voice-samples/[id]`
- **File**: `app/api/voice-samples/[id]/route.ts`
- **Dependencies**: `lib/auth.ts`, `lib/db.ts`
- **Features**:
  - Verifies user ownership
  - Enforces minimum 3 samples per profile
  - Prevents deletion if it would leave < 3 samples
- **Event**: Dispatches `voiceProfileUpdated` custom event

### User Preferences Routes

#### `GET /api/user-preferences`
- **File**: `app/api/user-preferences/route.ts`
- **Dependencies**: `lib/auth.ts`, `lib/db.ts`
- **Returns**: User preferences (defaultWritingStyle, defaultExpressionVariation, defaultTargetLanguage, showLanguageToggle, defaultUILanguage)

#### `PUT /api/user-preferences`
- **File**: `app/api/user-preferences/route.ts`
- **Dependencies**: `lib/auth.ts`, `lib/db.ts`, `zod`
- **Request Body**: Zod-validated preferences schema
- **Features**:
  - Transforms empty strings to null
  - Validates enum values
  - Provides specific error messages for missing columns
- **Event**: Dispatches `preferencesUpdated` custom event

### User Routes

#### `GET /api/user/profile`
- **File**: `app/api/user/profile/route.ts`
- **Returns**: User profile (name, email)

#### `PATCH /api/user/profile`
- **File**: `app/api/user/profile/route.ts`
- **Updates**: User name

### Support Routes

#### `POST /api/support`
- **File**: `app/api/support/route.ts`
- **Dependencies**: `lib/auth.ts`, Resend API
- **Sends**: Support emails via Resend
- **Used By**: `components/SupportForm.tsx`

---

## Context Providers

### Provider Hierarchy
**File**: `app/providers.tsx`

**Order** (outermost to innermost):
1. `SessionProvider` (from `next-auth/react`)
2. `LanguageProvider` (from `@/contexts/LanguageContext`)
3. `AuthModalProvider` (from `@/contexts/AuthModalContext`)
4. `SettingsModalProvider` (from `@/contexts/SettingsModalContext`)

**⚠️ IMPORTANT**: All providers must be wrapped in this exact order. The root layout (`app/layout.tsx`) uses `<Providers>` which wraps all children.

### Context Files

#### `contexts/LanguageContext.tsx`
- **Exports**: `LanguageProvider`, `useLanguage()`
- **State**: `language: 'en' | 'zh'`
- **Features**:
  - Loads default UI language from user preferences
  - Priority: localStorage > user preference > default 'en'
  - Listens for `preferencesUpdated` events
- **Used By**: 
  - `app/page.tsx`
  - `components/ArticleHistory.tsx`
  - `components/ArticleProcessor.tsx`
  - `components/AuthModal.tsx`
  - `components/SettingsModal.tsx`
  - `components/LanguageToggle.tsx`
  - `components/PaidPlanBenefits.tsx`
  - `components/TokenUsage.tsx`

#### `contexts/AuthModalContext.tsx`
- **Exports**: `AuthModalProvider`, `useAuthModal()`
- **State**: `isOpen: boolean`, `mode: 'signin' | 'signup'`
- **Used By**: `app/page.tsx`

#### `contexts/SettingsModalContext.tsx`
- **Exports**: `SettingsModalProvider`, `useSettingsModal()`
- **State**: `isOpen: boolean`, `initialSection: string | undefined`
- **Features**: `openModal(section?)` accepts optional section parameter
- **Sections**: 'userInfo', 'subscription', 'paymentHistory', 'voiceProfile', 'preferences'
- **Used By**: `app/page.tsx`, `components/SettingsModal.tsx`

---

## Component Dependencies

### Page Components

#### `app/page.tsx`
- **Dependencies**:
  - `next-auth/react` (useSession)
  - `@/components/ArticleProcessor`
  - `@/components/AuthButtons`
  - `@/components/UserHomePage`
  - `@/components/AuthModal`
  - `@/components/SettingsModal`
  - `@/components/LanguageToggle`
  - `@/components/GetStartedModal`
  - `@/contexts/LanguageContext` (useLanguage)
  - `@/contexts/AuthModalContext` (useAuthModal)
  - `@/contexts/SettingsModalContext` (useSettingsModal)
- **Renders**: Landing page (if not signed in) or UserHomePage (if signed in)
- **Features**: Language toggle in header, video hero section

#### `app/upgrade/page.tsx`
- **Dependencies**: 
  - `@stripe/stripe-js` (loadStripe)
  - `/api/create-checkout-session` (POST)

### User Components

#### `components/UserHomePage.tsx`
- **Dependencies**:
  - `@/components/TokenUsage`
  - `@/components/ArticleProcessor`
  - `@/components/PaidPlanBenefits`
  - `@/components/ArticleHistory`
  - `@/components/SupportForm`
  - `@/components/AutoSignOut`
  - `@/components/LanguageToggle`
  - `/api/token-usage` (GET)
  - `/api/user-preferences` (GET)
- **State**: Manages `selectedArticleId` and `refreshTrigger` for ArticleHistory
- **Features**: Conditionally shows language toggle based on user preference

#### `components/ArticleHistory.tsx`
- **Dependencies**:
  - `@/contexts/LanguageContext` (useLanguage)
  - `@/lib/prompt-styles` (styleArchetypes)
  - `/api/articles` (GET with pagination)
- **Props**: `onSelectArticle`, `selectedArticleId`, `refreshTrigger`, `onCollapse`
- **Features**:
  - Pagination (10 articles per page)
  - Soft delete (UI-only, database unchanged)
  - Handles empty pages after deletion
  - Error states (DATABASE_UNAVAILABLE, DATABASE_NOT_SETUP)

#### `components/ArticleProcessor.tsx`
- **Dependencies**:
  - `@/lib/error-handler` (parseError, AppError)
  - `@/lib/prompt-styles` (StyleArchetype, RewritingLevel, styleArchetypes, getDefaultStyle)
  - `@/lib/export-utils` (exportContent, ExportFormat)
  - `@/contexts/LanguageContext` (useLanguage)
  - `/api/articles/[id]` (GET)
  - `/api/process-article-stream` (POST - SSE)
  - `/api/voice-profiles` (GET)
  - `/api/user-preferences` (GET)
- **Props**: `selectedArticleId`, `onArticleProcessed`
- **Features**:
  - Input type switching (URL, Raw Text, Video)
  - Content format validation
  - URL detection in Raw Text field
  - Progressive rendering via SSE
  - Voice profile integration
  - User preferences loading
  - Expression variation selection
  - Language selection (11 languages)
  - Race condition prevention
  - Timeout handling (15 minutes)
- **Events**: Listens for `voiceProfileUpdated`, `preferencesUpdated`

#### `components/SettingsModal.tsx`
- **Dependencies**:
  - `@/contexts/LanguageContext` (useLanguage)
  - `@/components/VoiceProfileModal`
  - `/api/user/profile` (GET, PATCH)
  - `/api/create-checkout-session` (POST)
  - `/api/create-portal-session` (POST)
  - `/api/cancel-subscription` (POST)
  - `/api/payment-history` (GET)
  - `/api/voice-profiles` (GET)
  - `/api/voice-profiles/[id]` (DELETE)
  - `/api/voice-samples/[id]` (DELETE)
  - `/api/user-preferences` (GET, PUT)
- **Sections**:
  - User Info (default)
  - Subscription (with date range, cancel button)
  - Payment History (invoices with download links)
  - Author Profile (voice profiles management)
  - Preferences (default settings)
- **Features**: Dispatches `voiceProfileUpdated` and `preferencesUpdated` events

#### `components/VoiceProfileModal.tsx`
- **Dependencies**:
  - `/api/voice-profiles` (POST)
  - `/api/voice-profiles/[id]/extract-style` (POST)
  - `/api/voice-profiles/upload` (POST)
- **Features**:
  - Multi-step flow (name → samples → extraction → review)
  - File upload and text paste
  - Sample validation (3-10 samples, 200-800 words)
  - Style extraction progress
  - Dispatches `voiceProfileUpdated` event

#### `components/AutoSignOut.tsx`
- **Dependencies**: `hooks/useAutoSignOut.ts`
- **Features**: Automatic sign-out after inactivity period

#### `components/LanguageToggle.tsx`
- **Dependencies**: `@/contexts/LanguageContext` (useLanguage)
- **Features**: Toggles between English and Chinese UI

#### `components/TokenUsage.tsx`
- **Dependencies**:
  - `@stripe/stripe-js` (loadStripe)
  - `@/contexts/LanguageContext` (useLanguage)
  - `/api/token-usage` (GET)
  - `/api/create-checkout-session` (POST - UpgradeButton)
- **Exports**: `TokenUsage` component, internal `UpgradeButton`

#### `components/PaidPlanBenefits.tsx`
- **Dependencies**:
  - `@stripe/stripe-js` (loadStripe)
  - `@/contexts/LanguageContext` (useLanguage)
  - `/api/create-checkout-session` (POST)

#### `components/SupportForm.tsx`
- **Dependencies**: `/api/support` (POST)

#### `components/AuthModal.tsx`
- **Dependencies**:
  - `@/contexts/LanguageContext` (useLanguage)
  - NextAuth (signIn)
- **Features**: Email/password and Google sign-in

#### `components/GetStartedModal.tsx`
- **Dependencies**: NextAuth (signIn)
- **Features**: Modal for "Get Started" flow with Google and email/password options

#### `components/AuthButtons.tsx`
- **Dependencies**: NextAuth (signIn, signOut, useSession)
- **Features**: Header buttons (Log In, Get Started) or user menu (Settings, Sign Out)

---

## Library Files

### Database & Supabase

#### `lib/supabase.ts`
- **Exports**: 
  - `supabase` (client-side, uses anon key, respects RLS)
  - `supabaseServer` (server-side, uses service role key, bypasses RLS)
  - `isSupabaseConfigured()` (helper function)
- **Environment Variables**: 
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- **Used By**: All database operations

#### `lib/db.ts`
- **Exports**: `db` object with user, voiceProfile, and voiceSample operations
- **Dependencies**: `lib/supabase.ts`
- **User Operations**:
  - `create()` - Creates new user
  - `findByEmail()` - Finds user by email
  - `findById()` - Finds user by ID
  - `update()` - Updates user data (including preferences)
  - `mapUser()` - Maps database row to User interface
- **Voice Profile Operations**:
  - `create()` - Creates voice profile
  - `findById()` - Finds voice profile by ID
  - `findByUserId()` - Finds all profiles for user
  - `update()` - Updates voice profile
  - `delete()` - Deletes voice profile
  - `mapVoiceProfile()` - Maps database row to VoiceProfile interface
- **Voice Sample Operations**:
  - `create()` - Creates voice sample
  - `findById()` - Finds voice sample by ID
  - `findByProfileId()` - Finds all samples for profile
  - `delete()` - Deletes voice sample
  - `mapVoiceSample()` - Maps database row to VoiceSample interface
- **Used By**: All API routes that interact with database

### Authentication

#### `lib/auth.ts`
- **Exports**: `authOptions` (NextAuthOptions)
- **Dependencies**: `lib/db.ts`, `bcryptjs`
- **Providers**: 
  - Credentials (email/password)
  - Google OAuth (optional, requires env vars)
- **Callbacks**: `signIn`, `jwt`, `session`
- **Used By**: All API routes that need authentication (`getServerSession(authOptions)`)

### AI & Processing

#### `lib/openai.ts`
- **Exports**: 
  - `translateTo(text: string, targetLanguageCode: string)` - Multi-language translation
  - `generateInsights(translation: string, style: StyleArchetype, voiceProfileId?: string, targetLanguageCode: string, rewritingLevel?: 'light' | 'medium' | 'heavy')` - Style-aware insights
  - `isOpenAIConfigured()` - Configuration check
  - `openai` - OpenAI client instance
- **Dependencies**: `openai` package, `lib/db.ts` (for voice profiles)
- **Environment Variables**: `OPENAI_API_KEY`
- **Models**: GPT-4o-mini (translation), GPT-4o (insights)
- **Features**:
  - Markdown removal from outputs
  - Voice profile integration
  - Expression variation support
  - Multi-language prompts
- **Used By**: `app/api/process-article-stream/route.ts`, `app/api/voice-profiles/[id]/extract-style/route.ts`

#### `lib/youtube-transcript.ts`
- **Exports**:
  - `extractYouTubeVideoId(url: string)` - Extracts video ID from YouTube URLs
  - `transcribeYouTubeVideo(videoUrl: string, onProgress?: (message: string) => void)` - Downloads audio and transcribes using Whisper
- **Dependencies**: `ytdl-core`, `lib/openai.ts`
- **Environment Variables**: `OPENAI_API_KEY` (for Whisper API)
- **Features**:
  - Supports multiple YouTube URL formats (youtube.com, youtu.be, embed URLs)
  - Validates video availability and length (max 2 hours)
  - Downloads audio using ytdl-core
  - Transcribes using OpenAI Whisper API
  - Progress callbacks for real-time updates
- **Limitations**:
  - Maximum video length: 2 hours (7200 seconds)
  - Cannot process private or age-restricted videos
  - Requires valid YouTube video URL
- **Used By**: `lib/content-extractor.ts`

#### `lib/content-extractor.ts`
- **Exports**: `extractContentFromUrl(url: string, onProgress?: (message: string) => void)`
- **Dependencies**: `cheerio`, `lib/youtube-transcript.ts`
- **Features**: 
  - Subscription detection for paywalled content
  - HTML content extraction using Cheerio
  - YouTube video support with automatic transcript extraction
  - Progress callbacks for YouTube processing
- **Used By**: `app/api/process-article-stream/route.ts`

#### `lib/prompt-styles.ts`
- **Exports**: 
  - `StyleArchetype` type
  - `RewritingLevel` type
  - `StyleConfig` interface
  - `styleArchetypes` object
  - `getDefaultStyle()` function
  - `getStyleSystemPrompt(style: StyleArchetype)` function
  - `getStyleUserPrompt(translation: string, style: StyleArchetype)` function
- **Styles**: warmBookish (Emotional Resonance), lifeReflection, contrarian, education, science
- **Used By**: `components/ArticleProcessor.tsx`, `components/ArticleHistory.tsx`, `lib/openai.ts`

### Token Management

#### `lib/token-tracker.ts`
- **Exports**:
  - `calculateTokensUsed(text: string)` - Estimates token count
  - `checkTokenLimit(userId: string)` - Checks if user can use tokens
  - `consumeTokens(userId: string, tokens: number)` - Deducts tokens
  - `getTokenUsage(userId: string)` - Gets usage stats
- **Dependencies**: `lib/db.ts`
- **Features**:
  - Subscription expiration checking
  - Trial vs paid user handling
  - Token limit enforcement
- **Used By**: 
  - `app/api/process-article-stream/route.ts`
  - `app/api/token-usage/route.ts`

### Payment

#### `lib/stripe.ts`
- **Exports**: 
  - `stripe` (Stripe client instance)
  - `isStripeConfigured()` (helper function)
- **Environment Variables**: 
  - `STRIPE_SECRET_KEY`
  - `STRIPE_PRICE_ID`
  - `STRIPE_TOKEN_10K_PRICE_ID` (optional)
  - `STRIPE_TOKEN_50K_PRICE_ID` (optional)
- **Used By**: Payment-related API routes

### Utilities

#### `lib/error-handler.ts`
- **Exports**: `parseError()`, `AppError` type
- **Used By**: `components/ArticleProcessor.tsx`

#### `lib/export-utils.ts`
- **Exports**: `exportContent()`, `ExportFormat` type
- **Formats**: 'txt' | 'md' | 'json'
- **Used By**: `components/ArticleProcessor.tsx`

---

## Environment Variables

### Required

```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (or sb_publishable_...)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (server-side only)

# Authentication
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000 (or production URL)

# AI
OPENAI_API_KEY=sk-...

# Payment (required for upgrade functionality)
STRIPE_SECRET_KEY=sk_test_... or sk_live_...
STRIPE_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... or pk_live_...
```

### Optional

```bash
# Google OAuth (optional)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Token Purchase (optional)
STRIPE_TOKEN_10K_PRICE_ID=price_...
STRIPE_TOKEN_50K_PRICE_ID=price_...

# Email (for support form)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Expression Copilot <onboarding@resend.dev>
SUPPORT_EMAIL=your-email@example.com
```

---

## External Services

### Supabase (PostgreSQL Database)
- **Purpose**: User data, articles storage, voice profiles, preferences
- **Configuration**: `lib/supabase.ts`
- **Tables**: `users`, `articles`, `voice_profiles`, `voice_samples`
- **Security**: Row Level Security (RLS) with service role key for server operations

### OpenAI
- **Purpose**: Translation and insights generation, style extraction
- **Configuration**: `lib/openai.ts`
- **Models**: GPT-4o-mini (translation), GPT-4o (insights, style extraction)
- **Features**: Multi-language support, voice profile integration, expression variation

### Stripe
- **Purpose**: Payment processing, subscriptions, billing management
- **Configuration**: `lib/stripe.ts`
- **Features**: Checkout Sessions, Billing Portal, Webhooks, Invoices, Customer management

### Resend
- **Purpose**: Support email sending
- **Configuration**: `app/api/support/route.ts`
- **Used By**: Support form

### NextAuth.js
- **Purpose**: Authentication
- **Configuration**: `lib/auth.ts`
- **Providers**: Credentials, Google OAuth

---

## Critical File Relationships

### Authentication Flow
```
app/layout.tsx
  → app/providers.tsx
    → SessionProvider (next-auth/react)
      → LanguageProvider
        → AuthModalProvider
          → SettingsModalProvider
            → app/page.tsx
              → Uses: useSession(), useLanguage(), useAuthModal(), useSettingsModal()
```

### Article Processing Flow
```
components/UserHomePage.tsx
  → components/ArticleHistory.tsx
    → GET /api/articles (paginated)
      → lib/supabase.ts (supabaseServer)
        → articles table
  → components/ArticleProcessor.tsx
    → POST /api/process-article-stream (SSE)
      → lib/openai.ts (translateTo, generateInsights)
      → lib/token-tracker.ts (checkTokenLimit, consumeTokens)
        → lib/db.ts
          → users table
      → lib/supabase.ts
        → articles table (save)
```

### Voice Profile Flow
```
components/SettingsModal.tsx
  → components/VoiceProfileModal.tsx
    → POST /api/voice-profiles
      → lib/db.ts (voiceProfile.create)
        → voice_profiles table
    → POST /api/voice-profiles/upload
      → File processing
    → POST /api/voice-profiles/[id]/extract-style
      → lib/openai.ts
        → OpenAI style extraction
      → lib/db.ts (voiceProfile.update)
        → voice_profiles table (style_rules)
  → Dispatches: voiceProfileUpdated event
  → components/ArticleProcessor.tsx
    → Listens: voiceProfileUpdated event
    → GET /api/voice-profiles
      → Updates voice profile dropdown
```

### Payment Flow
```
components/TokenUsage.tsx (UpgradeButton)
  → POST /api/create-checkout-session
    → lib/stripe.ts
      → Stripe API
  → (After payment)
    → POST /api/webhooks/stripe
      → Updates users table via lib/db.ts
      → Sets userType: 'paid', tokenLimit: 1000000
```

### Preferences Flow
```
components/SettingsModal.tsx
  → PUT /api/user-preferences
    → lib/db.ts (user.update)
      → users table (preference columns)
  → Dispatches: preferencesUpdated event
  → components/ArticleProcessor.tsx
    → Listens: preferencesUpdated event
    → GET /api/user-preferences
      → Applies preferences to form
  → contexts/LanguageContext.tsx
    → Listens: preferencesUpdated event
    → Updates UI language
```

---

## Edge Cases & Error Handling

### Input Validation
- **URL Format**: Validates URL structure, requires http/https protocol
- **Text Length**: Minimum 50 characters for text input
- **URL in Text**: Detects URLs pasted in Raw Text field, shows format error
- **Empty Content**: Prevents processing of empty inputs
- **YouTube Videos**: Automatically extracts and transcribes using Whisper API (max 2 hours)
- **Zod Validation**: All API inputs validated with Zod schemas
- **Empty String Handling**: Transforms empty strings to null for optional fields

### Token Management
- **Pre-Validation**: Estimates tokens before processing
- **Final Check**: Re-validates before consuming tokens
- **Save-First Strategy**: Tokens consumed only after successful article save
- **Subscription Expiration**: Checks during processing, handles mid-processing expiration
- **Insufficient Tokens**: Clear error messages with upgrade prompts
- **Token Calculation**: Accurate token counting for all languages

### Database Operations
- **Connection Errors**: Graceful handling with user-friendly messages
- **Missing Tables**: Clear error messages with migration instructions
- **Save Failures**: Non-blocking - results still available, error logged
- **RLS Bypass**: Service role key used for server-side operations
- **Count Failures**: Falls back to actual query results for pagination
- **Null Handling**: Proper handling of null values in preferences

### Voice Profile Management
- **Minimum Samples**: Enforces 3-sample minimum
- **Sample Deletion**: Prevents deletion if it would leave < 3 samples
- **Profile Deletion**: Clears selection in UI if deleted profile was active
- **Style Rules Validation**: Validates structure and completeness
- **Empty Samples**: Validates sample content before processing
- **File Upload Errors**: Handles read errors, empty files, format issues
- **Non-English Content**: Character-based word counting for Chinese, Japanese, etc.

### Article Processing
- **Streaming Errors**: Graceful recovery from connection issues
- **Timeout Handling**: 15-minute timeout with user notification
- **Race Conditions**: Prevents duplicate submissions
- **Subscription Expiration**: Detects and handles during processing
- **Voice Profile Not Found**: Falls back to default style with error message
- **Markdown Removal**: Post-processing to remove all markdown formatting
- **Progress Tracking**: Real-time progress updates via SSE

### Pagination
- **Empty Pages**: Redirects to previous page after deletion
- **Count Failures**: Falls back to actual query results
- **State Management**: Proper state updates after deletions
- **Edge Cases**: Handles deletion of last item on page

### Error Message Standardization
- **User-Friendly Messages**: All errors include `userMessage` field
- **Actionable Guidance**: Errors include suggested actions
- **Development Details**: Technical details only in development mode
- **Error Codes**: Standardized error codes for programmatic handling
- **Field-Specific Errors**: Specific messages for validation failures

---

## Development Guidelines

### Before Creating New API Routes
1. Check if route exists in this document
2. Verify database schema in `supabase/schema.sql`
3. Check existing route patterns in `app/api/`
4. Add Zod validation schema
5. Implement proper error handling
6. Document in this file after implementation
7. Update PRD + Tech Spec.md

### Before Adding New Context Providers
1. Add provider to `app/providers.tsx` in correct order
2. Create context file in `contexts/`
3. Document in this file
4. Update components that use it

### Before Modifying Database Schema
1. Create migration file in `supabase/migrations/`
2. Update `supabase/schema.sql`
3. Update this document
4. Test with existing queries
5. Update `lib/db.ts` interfaces

### Error Handling Pattern
1. Use Zod for input validation
2. Return standardized error format: `{ error: string, message: string, userMessage: string }`
3. Include actionable guidance in `userMessage`
4. Log technical details only in development mode
5. Handle edge cases gracefully

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Maintained By**: Development Team
