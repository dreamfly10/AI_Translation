# Expression Copilot - PRD & Technical Specification

## Quick Summary

**Expression Copilot** (智能表达助理) is a modern, AI-powered web application that translates articles into multiple languages and generates personalized insights using advanced AI models. The application features a comprehensive user management system, progressive rendering, multi-language support, and personalized content generation.

### Key Features

- ✅ **Multi-Language Translation**: Supports 11 target languages (Chinese, English, Spanish, French, German, Japanese, Korean, Portuguese, Italian, Russian, Arabic)
- ✅ **Progressive Rendering**: Real-time streaming of translation and insights using Server-Sent Events (SSE)
- ✅ **Author Profile System**: Personalized content generation based on user's writing samples
- ✅ **Token-based Usage**: Trial users get 1,000 tokens, paid users get 1,000,000 tokens/month
- ✅ **Expression Variation**: Three levels (Light, Medium, Heavy) for controlling output intensity
- ✅ **5 Writing Styles**: Warm Bookish, Life Reflection, Contrarian, Education, Science
- ✅ **User Preferences**: Customizable defaults for writing style, expression variation, target language, and UI language
- ✅ **Payment System**: Stripe integration with subscription management, payment history, and billing portal
- ✅ **Article History**: Paginated article history with soft delete functionality
- ✅ **Auto Sign-Out**: Automatic session timeout after inactivity
- ✅ **Subscription Detection**: Intelligent detection of paywalled content with guided workflow
- ✅ **Error Handling**: Comprehensive error handling with user-friendly messages
- ✅ **Modern UI**: Responsive design with language toggle, dark/light theme support

## Overview

Expression Copilot allows users to input article URLs or raw text, automatically translate them into any of 11 supported languages, and generate in-depth interpretations and insights using OpenAI's GPT-4o models. The app features personalized content generation through Author Profiles, real-time streaming updates, and a comprehensive user management system with payment processing.

## Core Capabilities

### 1. Multi-Modal Content Processing
- **URL Input**: Extract content from web articles
- **Raw Text Input**: Direct text processing with format validation
- **Video Input**: YouTube video support with automatic transcript extraction using OpenAI Whisper
  - Supports videos up to 2 hours in length
  - Automatic audio extraction and transcription
  - Handles various YouTube URL formats (youtube.com, youtu.be, embed URLs)
- **Content Validation**: Automatic format checking and error prevention

### 2. Multi-Language Translation
- **11 Target Languages**: Chinese (Simplified), English, Spanish, French, German, Japanese, Korean, Portuguese, Italian, Russian, Arabic
- **High-Quality Translation**: GPT-4o-mini for accurate, context-aware translations
- **Language Selection**: User-selectable target language with preference saving
- **Markdown-Free Output**: Clean text output without formatting artifacts

### 3. Personalized Content Generation
- **Author Profile System**: Upload 3-10 writing samples (200-800 words each)
- **Style Extraction**: AI-powered analysis of writing patterns, tone, and structure
- **Dynamic Injection**: Representative samples and style rules injected into generation prompts
- **Voice Quality**: Content generated in user's personal voice, not generic AI

### 4. Writing Style System
- **5 Predefined Styles**:
  1. **Emotional Resonance (治愈+情感)**: Warm, empathetic, longform style
  2. **Life Reflection (人生思考+实用智慧)**: Practical wisdom with clear structure
  3. **Contrarian (反直觉评论+犀利逻辑)**: Sharp, logical, contrarian viewpoints
  4. **Education (教育祛魅 + 逻辑拆解)**: Methodological, framework-based thinking
  5. **Science (科学解释+怀疑思维)**: Precise, evidence-based, skeptical analysis
- **Expression Variation**: Three levels (Light, Medium, Heavy) controlling rewriting intensity
- **Temperature Control**: Optimized temperature settings per style (0.7-0.85)

### 5. User Management
- **Authentication**: Email/Password with optional Google OAuth
- **Trial Users**: 1,000 tokens with strict enforcement
- **Paid Users**: 1,000,000 tokens/month with subscription management
- **Auto Sign-Out**: Configurable inactivity timeout
- **User Preferences**: Saved defaults for all settings

### 6. Payment & Subscription
- **Stripe Integration**: Secure payment processing
- **Subscription Management**: Active, expired, cancelled states
- **Payment History**: Complete invoice history with download links
- **Billing Portal**: Self-service payment method management
- **Subscription Cancellation**: One-click cancellation with confirmation

### 7. Article Management
- **Article History**: Paginated list (10 articles per page)
- **Soft Delete**: UI-only deletion preserving database records
- **Article Loading**: Load and re-process saved articles
- **Metadata Storage**: Title, source URL, style, target language, tokens used

### 8. Progressive Rendering & Real-Time Updates
- **Server-Sent Events (SSE)**: Real-time streaming of processing updates
- **Progress Tracking**: Visual progress bars and time estimates
- **Chunked Updates**: Translation and insights streamed as they're generated
- **Error Recovery**: Graceful handling of connection issues

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI Library**: React 18
- **Styling**: CSS Variables with design system
- **State Management**: React Context API
- **Real-Time**: Server-Sent Events (SSE)

### Backend
- **API**: Next.js API Routes
- **Authentication**: NextAuth.js v4
- **Validation**: Zod schema validation
- **Streaming**: ReadableStream API with SSE

### AI & Processing
- **Translation**: OpenAI GPT-4o-mini
- **Insights**: OpenAI GPT-4o
- **Content Extraction**: Cheerio (HTML parsing)
- **Video Transcription**: OpenAI Whisper API for YouTube video transcript extraction
- **YouTube Processing**: ytdl-core for audio extraction from YouTube videos

### Database
- **Platform**: Supabase (PostgreSQL)
- **Security**: Row Level Security (RLS)
- **ORM**: Direct Supabase client queries
- **Migrations**: SQL migration files

### Payment
- **Provider**: Stripe
- **Features**: Checkout Sessions, Billing Portal, Webhooks, Invoices

### Infrastructure
- **Hosting**: Vercel
- **Environment**: Node.js runtime
- **Build**: Next.js production builds

## High-Level Architecture

```
User Authentication (NextAuth)
   ↓
Token Limit Check (Trial: 1,000 / Paid: 1,000,000)
   ↓
User Input (URL, Text, or Video)
   ↓
Content Extraction / Subscription Detection
   ↓
[If Subscription Required]
   ↓
Show Subscription Workflow Component
   ↓
[User Pastes Content]
   ↓
Token Estimation & Pre-Validation
   ↓
OpenAI Translation (GPT-4o-mini) → Streamed via SSE
   ↓
OpenAI Insight Generation (GPT-4o) → Streamed via SSE
   ↓
Article Save to Database
   ↓
Token Consumption (After Successful Save)
   ↓
Result Rendering with Progressive Updates
```

## User Flow

### Standard Processing Flow
1. User signs up or signs in (Email/Password or Google SSO)
2. System checks token availability and subscription status
3. User pastes article URL or raw text
4. System validates input format (URL validation, text length checks)
5. If subscription required → Show subscription workflow
6. User selects:
   - Writing Style (or Author Profile)
   - Expression Variation (Light/Medium/Heavy)
   - Target Language (11 options)
7. System estimates token usage and validates availability
8. System streams translation (GPT-4o-mini) with real-time updates
9. System streams insights (GPT-4o) with real-time updates
10. System saves article to database
11. System consumes tokens (only after successful save)
12. User views complete translation and insights

### Author Profile Creation Flow
1. User clicks "+ Custom Author Profile" or navigates to Settings
2. User provides profile name
3. User uploads 3-10 writing samples (files or paste)
4. System validates samples (200-800 words each, minimum 3)
5. System creates voice profile in database
6. System extracts style rules using OpenAI (tone, patterns, avoid list)
7. System saves extracted rules to profile
8. Profile becomes available in Writing Style dropdown
9. User can view, expand, and delete individual samples
10. User can delete entire profile (minimum 3 samples enforced)

### Payment & Subscription Flow
1. User clicks "Upgrade" or "Manage Subscription"
2. System creates Stripe Checkout Session
3. User completes payment on Stripe
4. Stripe webhook updates user to paid status
5. User gains access to 1,000,000 tokens/month
6. User can view payment history in Settings
7. User can manage payment methods via Billing Portal
8. User can cancel subscription (status changes to cancelled)

### Article History Flow
1. User views paginated article list (10 per page)
2. User can click article to load and re-process
3. User can delete article (soft delete - UI only)
4. Pagination updates automatically after deletion
5. Empty pages redirect to previous page

## Database Schema

### `users` Table
```sql
- id (UUID, PRIMARY KEY)
- email (TEXT, UNIQUE, NOT NULL)
- password (TEXT, nullable) -- Hashed for email/password users
- name (TEXT, nullable)
- image (TEXT, nullable)
- user_type (TEXT) -- 'trial' | 'paid'
- tokens_used (BIGINT, DEFAULT 0)
- token_limit (BIGINT, DEFAULT 1000)
- subscription_status (TEXT) -- 'active' | 'expired' | 'cancelled'
- subscription_expires_at (TIMESTAMPTZ)
- payment_id (TEXT) -- Stripe customer ID
- default_writing_style (TEXT) -- User preference
- default_expression_variation (TEXT) -- 'light' | 'medium' | 'heavy'
- default_target_language (TEXT, DEFAULT 'zh')
- show_language_toggle (BOOLEAN, DEFAULT true)
- default_ui_language (TEXT, DEFAULT 'en') -- 'en' | 'zh'
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

### `articles` Table
```sql
- id (UUID, PRIMARY KEY)
- user_id (UUID, FOREIGN KEY → users.id)
- title (TEXT, NOT NULL)
- input_type (TEXT) -- 'url' | 'text' | 'video'
- source_url (TEXT, nullable)
- original_content (TEXT, NOT NULL)
- translated_content (TEXT, NOT NULL)
- insights (TEXT, NOT NULL)
- style (TEXT) -- Writing style used
- target_language (TEXT, DEFAULT 'zh')
- tokens_used (INTEGER, DEFAULT 0)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

### `voice_profiles` Table (Author Profiles)
```sql
- id (UUID, PRIMARY KEY)
- user_id (UUID, FOREIGN KEY → users.id)
- name (TEXT, NOT NULL)
- sliders_json (JSONB, nullable)
- do_list (TEXT[], nullable)
- dont_list (TEXT[], nullable)
- style_rules (JSONB) -- Extracted style characteristics
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

### `voice_samples` Table
```sql
- id (UUID, PRIMARY KEY)
- voice_profile_id (UUID, FOREIGN KEY → voice_profiles.id)
- content (TEXT, NOT NULL)
- word_count (INTEGER)
- platform (TEXT, nullable)
- created_at (TIMESTAMPTZ)
```

## API Endpoints

### Article Processing

#### `POST /api/process-article-stream`
**Streaming endpoint for article processing with real-time updates**

**Request Body:**
```json
{
  "inputType": "url" | "text" | "video",
  "content": "string",
  "style": "warmBookish" | "lifeReflection" | "contrarian" | "education" | "science" (optional),
  "rewritingLevel": "light" | "medium" | "heavy" (optional),
  "voiceProfileId": "uuid" (optional),
  "targetLanguage": "zh" | "en" | "es" | "fr" | "de" | "ja" | "ko" | "pt" | "it" | "ru" | "ar" (optional, default: "zh")
}
```

**Response:** Server-Sent Events stream with events:
- `status`: Progress updates
- `time_estimate`: Time remaining estimates
- `translation_chunk`: Streaming translation text
- `insights_chunk`: Streaming insights text
- `complete`: Final result with article ID
- `error`: Error messages
- `save_error`: Database save errors (non-blocking)

**Success Response (complete event):**
```json
{
  "translation": "string",
  "insights": "string",
  "requiresSubscription": false,
  "style": "warmBookish",
  "articleId": "uuid",
  "tokensUsed": 150
}
```

### Article Management

#### `GET /api/articles`
**Get paginated article history**

**Query Parameters:**
- `limit` (optional, default: 10): Articles per page
- `page` (optional, default: 1): Page number

**Response:**
```json
{
  "articles": [
    {
      "id": "uuid",
      "title": "string",
      "createdAt": "ISO date",
      "inputType": "url" | "text" | "video",
      "sourceUrl": "string" | null,
      "style": "string" | null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalArticles": 50,
    "totalPages": 5
  }
}
```

#### `GET /api/articles/[id]`
**Get single article by ID**

**Response:**
```json
{
  "article": {
    "id": "uuid",
    "title": "string",
    "inputType": "url" | "text" | "video",
    "sourceUrl": "string" | null,
    "originalContent": "string",
    "translatedContent": "string",
    "insights": "string",
    "style": "string" | null,
    "targetLanguage": "zh",
    "createdAt": "ISO date"
  }
}
```

### Author Profiles (Voice Profiles)

#### `GET /api/voice-profiles`
**Get all voice profiles for authenticated user**

**Response:**
```json
{
  "profiles": [
    {
      "id": "uuid",
      "name": "string",
      "sampleCount": 5,
      "createdAt": "ISO date"
    }
  ]
}
```

#### `POST /api/voice-profiles`
**Create new voice profile**

**Request Body:**
```json
{
  "name": "string",
  "samples": ["string", "string", ...], // 3-10 samples, 200-800 words each
  "doList": ["string"] (optional),
  "dontList": ["string"] (optional)
}
```

#### `POST /api/voice-profiles/[id]/extract-style`
**Extract style rules from voice profile samples**

**Response:**
```json
{
  "profile": { ... },
  "styleRules": {
    "tone": "string",
    "sentencePatterns": "string",
    "avoid": ["string"]
  }
}
```

#### `POST /api/voice-profiles/upload`
**Upload writing sample file**

**Request:** FormData with `file` field

**Response:**
```json
{
  "content": "string",
  "wordCount": 500,
  "fileName": "string"
}
```

#### `DELETE /api/voice-profiles/[id]`
**Delete voice profile**

#### `DELETE /api/voice-samples/[id]`
**Delete individual voice sample (minimum 3 samples enforced)**

### User Preferences

#### `GET /api/user-preferences`
**Get user preferences**

**Response:**
```json
{
  "defaultWritingStyle": "warmBookish" | null,
  "defaultExpressionVariation": "medium" | null,
  "defaultTargetLanguage": "zh",
  "showLanguageToggle": true,
  "defaultUILanguage": "en"
}
```

#### `PUT /api/user-preferences`
**Update user preferences**

**Request Body:**
```json
{
  "defaultWritingStyle": "warmBookish" | null,
  "defaultExpressionVariation": "medium" | null,
  "defaultTargetLanguage": "zh",
  "showLanguageToggle": true,
  "defaultUILanguage": "en"
}
```

### Payment & Subscription

#### `POST /api/create-checkout-session`
**Create Stripe Checkout session for subscription**

**Response:**
```json
{
  "sessionId": "cs_...",
  "url": "https://checkout.stripe.com/..."
}
```

#### `POST /api/create-portal-session`
**Create Stripe Billing Portal session**

**Response:**
```json
{
  "url": "https://billing.stripe.com/..."
}
```

#### `GET /api/payment-history`
**Get payment invoice history**

**Response:**
```json
{
  "invoices": [
    {
      "id": "in_...",
      "amount": 999,
      "currency": "usd",
      "status": "paid",
      "created": 1234567890,
      "periodStart": "2024-01-01",
      "periodEnd": "2024-02-01",
      "invoicePdf": "https://..."
    }
  ]
}
```

#### `POST /api/cancel-subscription`
**Cancel user subscription**

**Response:**
```json
{
  "success": true,
  "message": "Subscription cancelled successfully",
  "subscriptionStatus": "cancelled"
}
```

### Token Management

#### `GET /api/token-usage`
**Get current token usage**

**Response:**
```json
{
  "allowed": true,
  "tokensUsed": 150,
  "tokensRemaining": 850,
  "limit": 1000,
  "userType": "trial",
  "subscriptionStartDate": "2024-01-01",
  "subscriptionExpiresAt": "2024-02-01"
}
```

### Authentication

#### `POST /api/auth/register`
**Register new user**

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "Optional Name"
}
```

#### `GET/POST /api/auth/[...nextauth]`
**NextAuth.js authentication handler**

## Edge Cases & Error Handling

### Input Validation
- **URL Format**: Validates URL structure, requires http/https
- **Text Length**: Minimum 50 characters for text input
- **URL in Text**: Detects URLs pasted in Raw Text field, shows error
- **Empty Content**: Prevents processing of empty inputs
- **YouTube Videos**: Automatically extracts and transcribes using Whisper API
  - Validates video availability and length (max 2 hours)
  - Handles private/unavailable videos with clear error messages
  - Progress updates during audio download and transcription

### Token Management
- **Pre-Validation**: Estimates tokens before processing
- **Final Check**: Re-validates before consuming tokens
- **Save-First Strategy**: Tokens consumed only after successful article save
- **Subscription Expiration**: Checks during processing, handles mid-processing expiration
- **Insufficient Tokens**: Clear error messages with upgrade prompts

### Database Operations
- **Connection Errors**: Graceful handling with user-friendly messages
- **Missing Tables**: Clear error messages with migration instructions
- **Save Failures**: Non-blocking - results still available, error logged
- **RLS Bypass**: Service role key used for server-side operations

### Voice Profile Management
- **Minimum Samples**: Enforces 3-sample minimum
- **Sample Deletion**: Prevents deletion if it would leave < 3 samples
- **Profile Deletion**: Clears selection in UI if deleted profile was active
- **Style Rules Validation**: Validates structure and completeness
- **Empty Samples**: Validates sample content before processing
- **File Upload Errors**: Handles read errors, empty files, format issues

### Article Processing
- **Streaming Errors**: Graceful recovery from connection issues
- **Timeout Handling**: 15-minute timeout with user notification
- **Race Conditions**: Prevents duplicate submissions
- **Subscription Expiration**: Detects and handles during processing
- **Voice Profile Not Found**: Falls back to default style with error message

### Pagination
- **Empty Pages**: Redirects to previous page after deletion
- **Count Failures**: Falls back to actual query results
- **State Management**: Proper state updates after deletions

### Error Message Standardization
- **User-Friendly Messages**: All errors include `userMessage` field
- **Actionable Guidance**: Errors include suggested actions
- **Development Details**: Technical details only in development mode
- **Error Codes**: Standardized error codes for programmatic handling

## User Preferences System

### Stored Preferences
1. **Default Writing Style**: Pre-selected style on page load
2. **Default Expression Variation**: Pre-selected variation level
3. **Default Target Language**: Pre-selected translation language
4. **Show Language Toggle**: Toggle visibility of language switcher in header
5. **Default UI Language**: Default language for interface (English/Chinese)

### Preference Application
- **On Load**: Preferences applied when ArticleProcessor mounts
- **Real-Time Updates**: Changes apply immediately via event system
- **Persistence**: Saved to database, loaded on session start
- **Fallbacks**: Sensible defaults if preferences not set

## Progressive Rendering & Real-Time Updates

### Server-Sent Events (SSE) Implementation
- **Streaming Architecture**: ReadableStream with TextEncoder
- **Event Types**: status, translation_chunk, insights_chunk, complete, error
- **Progress Tracking**: Real-time progress percentages and time estimates
- **Chunked Updates**: Content streamed as it's generated
- **Error Recovery**: Graceful handling of stream interruptions

### Frontend Handling
- **Event Listener**: Parses SSE events and updates UI
- **Buffer Management**: Handles partial messages and line breaks
- **State Updates**: Real-time updates to translation and insights
- **Loading States**: Visual feedback during processing
- **Timeout Management**: 15-minute timeout with activity tracking

## Security Features

### Authentication
- **NextAuth.js**: Industry-standard authentication
- **Password Hashing**: bcryptjs for secure password storage
- **Session Management**: Secure session handling
- **OAuth Integration**: Google OAuth with proper callback handling

### Database Security
- **Row Level Security (RLS)**: Supabase RLS policies
- **Service Role Key**: Server-side operations bypass RLS securely
- **User Isolation**: All queries filtered by user_id
- **Input Validation**: Zod schema validation on all inputs

### Payment Security
- **Stripe Integration**: PCI-compliant payment processing
- **Webhook Verification**: Stripe signature verification
- **Secure Sessions**: HTTPS-only checkout and portal sessions

## Performance Optimizations

### Database
- **Indexes**: Optimized indexes on user_id, email, created_at
- **Pagination**: Efficient pagination with range queries
- **Connection Pooling**: Supabase handles connection management

### API Routes
- **Dynamic Routes**: `force-dynamic` for real-time data
- **Streaming**: Reduces time-to-first-byte
- **Error Handling**: Fast-fail on validation errors

### Frontend
- **Progressive Rendering**: Content appears as it's generated
- **Lazy Loading**: Components loaded on demand
- **State Management**: Efficient React state updates

## Environment Variables

### Required
```env
# Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (or sb_publishable_...)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (server-side only)

# Authentication
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000

# AI
OPENAI_API_KEY=sk-...

# Payment
STRIPE_SECRET_KEY=sk_test_... or sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... or pk_live_...
STRIPE_PRICE_ID=price_...
STRIPE_TOKEN_10K_PRICE_ID=price_... (optional)
STRIPE_TOKEN_50K_PRICE_ID=price_... (optional)
```

### Optional
```env
# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Email (Support Form)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Expression Copilot <onboarding@resend.dev>
SUPPORT_EMAIL=your-email@example.com
```

## Future Enhancements

### Planned Features
- **Bulk Processing**: Process multiple articles at once
- **Export Formats**: PDF, DOCX, Markdown export
- **Team Accounts**: Organization-level subscriptions
- **Advanced Analytics**: Usage dashboards and insights
- **Embedding-Based Retrieval**: V2 Author Profile system with semantic search
- **Voice Quality Check**: Post-generation quality scoring and suggestions

### Technical Improvements
- **Tailwind CSS Migration**: Utility-first styling
- **Component Library**: shadcn/ui integration
- **Testing**: Unit and integration tests
- **Monitoring**: Error tracking and performance monitoring
- **Caching**: Redis for frequently accessed data

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Application Name**: Expression Copilot (智能表达助理)
