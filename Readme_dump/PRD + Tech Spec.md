# Expression Copilot - PRD & Technical Specification

## Quick Summary

**Expression Copilot** (智能表达助理) is a modern, AI-powered web application that translates articles into multiple languages and generates personalized insights using advanced AI models. The application features a comprehensive user management system, progressive rendering, multi-language support, and personalized content generation.

### Key Features

- ✅ **Multi-Language Translation**: Supports 11 target languages (Chinese, English, Spanish, French, German, Japanese, Korean, Portuguese, Italian, Russian, Arabic)
- ✅ **Progressive Rendering**: Real-time streaming of translation and insights using Server-Sent Events (SSE)
- ✅ **Author Profile System**: Personalized content generation based on user's writing samples or custom prompts
- ✅ **Text-to-Speech**: Audio playback for translations and insights using Google Cloud TTS (English and Chinese)
- ✅ **Token-based Usage**: Trial users get 5,000 tokens, paid users get 1,000,000 tokens/month
- ✅ **Degree of Rewriting**: Three levels (Low, Medium, High) for controlling output intensity
- ✅ **8 Thinking Styles**: Empathetic Thinking, Reflective Thinking, Critical Thinking, Methodical Thinking, Scientific Thinking, Editorial Column, Impact Decoder, Neutral Brief
- ✅ **Customizable Style Visibility**: Users can enable/disable default thinking styles in preferences
- ✅ **User Preferences**: Customizable defaults for thinking style, expression variation, target language, UI language, and enabled thinking styles visibility
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
  - Placeholder: "Paste an article link. We'll extract meaning, not just text."
- **Raw Text Input**: Direct text processing with format validation
- **Video Input**: YouTube video support with automatic transcript extraction
  - Uses `youtube-transcript` package for caption extraction
  - Falls back to OpenAI Whisper API via external worker if captions unavailable
  - Placeholder: "Supports videos with captions. We analyze the transcript, not the visuals."
  - Handles various YouTube URL formats (youtube.com, youtu.be, embed URLs)
- **Content Validation**: Automatic format checking and error prevention
- **UI Labels**: 
  - Title: "Start with a link, text, or video" (with helptip)
  - "Thinking Style" (formerly "Writing Style")
  - "Degree of Rewriting" (formerly "Expression Variation") with options: Low (preserve structure), Medium (reframe & reorganize), High (reinterpret ideas)
  - "Output Language" (formerly "Language Selection") with helptip
  - Dynamic button labels: "Analyze Article" (URL), "Analyze Text" (Raw Text), "Analyze Video" (Video)

### 2. Multi-Language Translation
- **11 Target Languages**: Chinese (Simplified), English, Spanish, French, German, Japanese, Korean, Portuguese, Italian, Russian, Arabic
- **High-Quality Translation**: GPT-4o-mini for accurate, context-aware translations
- **Language Selection**: User-selectable target language with preference saving
- **Markdown-Free Output**: Clean text output without formatting artifacts

### 3. Personalized Content Generation
- **Author Profile System**: Upload writing samples or provide custom prompts
  - **Writing Samples**: Flexible number of samples (no mandatory word limits)
  - **Custom Prompts**: Direct style instructions without samples
  - **Combined Mode**: Use both samples and custom prompts together
- **Style Extraction**: AI-powered analysis of writing patterns, tone, and structure (for sample-based profiles)
- **Dynamic Injection**: Representative samples and style rules injected into generation prompts
- **Voice Quality**: Content generated in user's personal voice, not generic AI

### 4. Thinking Style System
- **8 Predefined Styles** (with improved prompts):
  1. **Empathetic Thinking (共情思维)**: Warm, empathetic, longform style - gentle companion approach
  2. **Reflective Thinking (反思思维)**: Practical wisdom with clear structure - judgment builder
  3. **Critical Thinking (批判思维)**: Sharp, logical, contrarian viewpoints - assumption breaker
  4. **Methodical Thinking (方法思维)**: Methodological, framework-based thinking - mental model builder
  5. **Scientific Thinking (科学思维)**: Precise, evidence-based, skeptical analysis - epistemic clarity
  6. **Editorial Column (专栏思维)**: Column-style writing with rhythm and reasoning - mature columnist voice
  7. **Impact Decoder (影响分析)**: Impact chain analysis - who, how, when, consequences
  8. **Neutral Brief (中立摘要)**: Emotion-free, stance-free, high-clarity - fact-focused briefing
- **Style Visibility Control**: Users can enable/disable default thinking styles in Settings → Preferences
- **Custom Styles Priority**: User-created voice profiles always appear at the top of the dropdown
- **Improved Prompts**: All styles use enhanced prompts with COMMON_OUTPUT_RULES and COMMON_STRUCTURE
- **Language-Agnostic**: Prompts automatically adapt to output language
- **Degree of Rewriting**: Three levels controlling rewriting intensity
  - **Low (preserve structure)**: Minimal changes, maintains original structure
  - **Medium (reframe & reorganize)**: Moderate restructuring and reframing
  - **High (reinterpret ideas)**: Significant reinterpretation and restructuring
- **Temperature Control**: Optimized temperature settings per style (0.60-0.82)

### 5. User Management
- **Authentication**: Email/Password with optional Google OAuth
- **Trial Users**: 5,000 tokens with strict enforcement
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
- **Video Transcription**: YouTube transcript extraction via `youtube-transcript` package with OpenAI Whisper API fallback
- **Text-to-Speech**: Google Cloud Text-to-Speech API for audio generation (English and Chinese)
- **Document Parsing**: Mammoth for .docx file parsing

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
Token Limit Check (Trial: 5,000 / Paid: 1,000,000)
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
1. User clicks "Add Your Style" or navigates to Settings
2. User provides profile name
3. User chooses profile type:
   - **Writing Samples**: Paste text samples (flexible count, no word limits)
   - **Custom Prompt**: Provide direct style instructions
   - **Both**: Combine samples and custom prompt
4. System creates voice profile in database
5. For sample-based profiles: System extracts style rules using OpenAI (tone, patterns, avoid list)
6. System saves extracted rules or custom prompt to profile
7. Profile becomes available in Thinking Style dropdown
8. User can view, expand, and delete individual samples
9. User can delete entire profile

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
- default_writing_style (TEXT) -- User preference (8 style options)
- default_expression_variation (TEXT) -- 'light' | 'medium' | 'heavy'
- default_target_language (TEXT, DEFAULT 'zh')
- show_language_toggle (BOOLEAN, DEFAULT true)
- default_ui_language (TEXT, DEFAULT 'en') -- 'en' | 'zh'
- enabled_thinking_styles (JSONB) -- Array of enabled default thinking style keys, defaults to all 8 styles
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
- style (TEXT) -- Thinking style used (8 style options)
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
- style_rules (JSONB, nullable) -- Extracted style characteristics (for sample-based profiles)
- custom_prompt (TEXT, nullable) -- Custom prompt/instructions for prompt-based profiles
- profile_type (TEXT, DEFAULT 'samples') -- CHECK constraint: 'samples' | 'prompt' | 'both'
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

### `voice_samples` Table
```sql
- id (UUID, PRIMARY KEY)
- voice_profile_id (UUID, FOREIGN KEY → voice_profiles.id)
- content (TEXT, NOT NULL)
- word_count (INTEGER, nullable) -- Optional, no longer required
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
  "style": "warmBookish" | "lifeReflection" | "contrarian" | "education" | "science" | "editorialColumn" | "impactDecoder" | "neutralBrief" (optional),
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
  "samples": ["string", "string", ...] (optional), // Flexible count, no word limits
  "customPrompt": "string" (optional), // Custom style instructions
  "profileType": "samples" | "prompt" | "both" (optional, default: "samples"),
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
  "defaultUILanguage": "en",
  "enabledThinkingStyles": ["warmBookish", "lifeReflection", ...] | null
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
  "defaultUILanguage": "en",
  "enabledThinkingStyles": ["warmBookish", "lifeReflection", ...] | null
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
    "limit": 5000,
  "userType": "trial",
  "subscriptionStartDate": "2024-01-01",
  "subscriptionExpiresAt": "2024-02-01"
}
```

### Text-to-Speech

#### `POST /api/text-to-speech`
**Generate audio from text using Google Cloud Text-to-Speech**

**Request Body:**
```json
{
  "text": "string",
  "language": "en" | "zh"
}
```

**Response:**
```json
{
  "audio": "base64-encoded-audio-string",
  "format": "mp3"
}
```

**Features:**
- Automatically detects language (English or Chinese) based on text content
- Uses Google Cloud Text-to-Speech API
- Returns base64-encoded MP3 audio
- Supports high-quality neural voices
- Used for both Translation and Insights sections

**Environment Variables:**
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` (recommended) - Full service account JSON as string
- OR `GOOGLE_CLOUD_PROJECT_ID`, `GOOGLE_CLOUD_PRIVATE_KEY`, `GOOGLE_CLOUD_CLIENT_EMAIL`

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
- **YouTube Videos**: Extracts transcript via captions or Whisper fallback
  - Primary: Uses `youtube-transcript` package to fetch captions
  - Fallback: External Whisper worker if captions unavailable
  - Handles videos without captions with clear error messages
  - Progress updates during transcript extraction

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
1. **Default Writing Style**: Pre-selected style on page load (8 options)
2. **Default Expression Variation**: Pre-selected variation level
3. **Default Target Language**: Pre-selected translation language
4. **Show Language Toggle**: Toggle visibility of language switcher in header
5. **Default UI Language**: Default language for interface (English/Chinese)
6. **Enabled Thinking Styles**: Array of default thinking styles to show in dropdown (null = all enabled)

### Preference Application
- **On Load**: Preferences applied when ArticleProcessor mounts
- **Real-Time Updates**: Changes apply immediately via event system
- **Persistence**: Saved to database, loaded on session start
- **Fallbacks**: Sensible defaults if preferences not set (all styles enabled by default)
- **Dropdown Filtering**: Only enabled default styles appear in Thinking Style dropdown
- **Custom Styles Priority**: User-created voice profiles always shown first, then enabled default styles

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

# Text-to-Speech (Google Cloud)
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...} # Full JSON as string
# OR use individual variables:
# GOOGLE_CLOUD_PROJECT_ID=your-project-id
# GOOGLE_CLOUD_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
# GOOGLE_CLOUD_CLIENT_EMAIL=your-service@project.iam.gserviceaccount.com

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

**Last Updated**: January 2025
**Version**: 1.2.0
**Application Name**: Expression Copilot (智能表达助理)

## Recent Updates (January 2025)

### Token Limits
- Trial users: Increased from 1,000 to 5,000 tokens

### Text-to-Speech Feature
- Added Google Cloud Text-to-Speech API integration
- Audio playback for Translation and Insights sections
- Supports English and Chinese voices
- Dynamic voice selection (automatically picks best available voice)
- Audio controls: play/pause, replay, speed adjustment

### UI/UX Improvements
- **Title**: Changed from "Multimodal Content" to "Start with a link, text, or video" with helptip
- **Thinking Style**: Renamed from "Writing Style" (formerly "Author Profile")
- **Degree of Rewriting**: Renamed from "Expression Variation" with updated options:
  - Low (preserve structure) - formerly "Light"
  - Medium (reframe & reorganize) - formerly "Medium"
  - High (reinterpret ideas) - formerly "Heavy"
- **Output Language**: Renamed from "Language Selection" with helptip
- **Dynamic Button Labels**: 
  - URL tab: "Analyze Article"
  - Raw Text tab: "Analyze Text"
  - Video tab: "Analyze Video"
- **Updated Placeholders**:
  - URL: "Paste an article link. We'll extract meaning, not just text."
  - Video: "Supports videos with captions. We analyze the transcript, not the visuals."
- **Helptips**: Interactive tooltips displayed to the right of icons

### Voice Profiles (Author Profiles)
- **Custom Prompt Support**: Users can provide direct style instructions
- **Profile Types**: samples-only, prompt-only, or both
- **Flexible Requirements**: Removed mandatory word counts and sample minimums
- **Text Input Only**: File upload removed, users paste text directly

### YouTube Transcript Processing
- **Primary Strategy**: Uses `youtube-transcript` package for caption extraction
- **Fallback Strategy**: External Whisper worker for videos without captions
- **Removed**: ytdl-core dependency (no longer used)

### Analytics
- **Microsoft Clarity**: Integrated for user behavior tracking and analytics

### Thinking Styles System (January 2025)
- **Expanded to 8 Styles**: Added 3 new thinking styles:
  - Editorial Column (专栏思维): Column-style writing with rhythm and reasoning
  - Impact Decoder (影响分析): Impact chain analysis for policy/business/social issues
  - Neutral Brief (中立摘要): Emotion-free, fact-focused briefing
- **Improved Prompts**: All styles now use ChatGPT-enhanced prompts with:
  - COMMON_OUTPUT_RULES: Prevents generic summaries, focuses on meaning and connections
  - COMMON_STRUCTURE: Standardized 5-part structure (core, what matters, why, how connects, actions)
  - Language-agnostic: Prompts adapt to output language automatically
- **Style Visibility Control**: 
  - Users can enable/disable default thinking styles in Settings → Preferences
  - Checkbox UI for each of the 8 default styles
  - Custom voice profiles always appear at the top of dropdown
  - Only enabled default styles appear in dropdown
- **Database Schema**: Added `enabled_thinking_styles` JSONB column to users table
- **Migration**: `supabase/migrations/add_enabled_thinking_styles.sql` updates schema and constraints
