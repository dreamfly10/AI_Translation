# AI Article Translation & Insight App

## Quick Summary

A modern web application that translates articles to Chinese and generates insights using OpenAI. Features include:

- ✅ **Token-based Usage**: Trial users get 1,000 tokens, enforced strictly
- ✅ **Subscription Detection**: Automatically detects paywalled content with guided workflow
- ✅ **Error Handling**: User-friendly error messages with actionable guidance
- ✅ **Modern UI**: Responsive design with gradient effects and smooth animations
- ✅ **Optional Google Auth**: Works with or without Google OAuth
- ✅ **Supabase Integration**: PostgreSQL database with proper RLS configuration

## Overview

This application allows users to input an article link or raw text, automatically translate it into Chinese, and generate in-depth interpretation and insights using the OpenAI API. The app features a modern, user-friendly interface with comprehensive error handling, token-based usage tracking, and intelligent subscription detection for paywalled content.

## Core Capabilities

- **User Authentication**: Email/Password registration with optional Google SSO
- **Article Processing**: URL extraction or direct text input
- **High-Quality Translation**: AI-powered translation to Simplified Chinese
- **Contextual Insights**: In-depth analysis and interpretation for Chinese-speaking audiences with multiple writing style options
- **Token Management**: Usage tracking with trial (1,000 tokens) and paid tiers
- **Subscription Detection**: Automatic detection of paywalled content with guided workflow
- **Error Handling**: User-friendly error messages with actionable guidance
- **Modern UI**: Responsive design with gradient effects and smooth animations
- **Style System**: 5 writing style archetypes for natural, engaging insights (warm bookish, life reflection, contrarian, education, science) 

## Tech Stack

- **Frontend**: Next.js 14 with React, TypeScript
- **Backend**: Next.js API routes
- **Authentication**: NextAuth.js (Email/Password + optional Google OAuth)
- **AI**: OpenAI API (GPT-4o-mini for translation, GPT-4o for insights)
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Styling**: Modern CSS with design system (CSS variables, gradients, responsive)
- **Infra**: Vercel-ready

## High-Level Architecture

```
User Authentication (NextAuth)
   ↓
Token Limit Check (Trial: 1,000 tokens)
   ↓
User Input (URL or Text)
   ↓
Content Extraction / Subscription Detection
   ↓
[If Subscription Required]
   ↓
Show Subscription Workflow Component
   ↓
[User Pastes Content]
   ↓
Token Estimation & Validation
   ↓
OpenAI Translation (GPT-4o-mini)
   ↓
OpenAI Insight Generation (GPT-4o)
   ↓
Token Consumption & Update
   ↓
Result Rendering with Error Handling
```

## User Flow

### Standard Flow
1. User signs up or signs in (Email/Password or optional Google SSO)
2. System checks token availability (Trial: 1,000 tokens)
3. User pastes article URL or raw text
4. System extracts and validates content
5. If subscription required → Show subscription workflow
6. System estimates token usage and validates availability
7. User selects writing style (optional, defaults to "warm bookish")
8. System translates content into Chinese (GPT-4o-mini)
9. System generates insights and interpretation (GPT-4o) using selected style
10. System consumes tokens and updates usage
11. User views translation and insights

### Subscription-Required Flow
1. User pastes URL requiring subscription
2. System detects paywall/subscription requirement
3. System displays subscription workflow component
4. User opens article in new tab and signs in
5. User copies article content
6. User pastes content into provided text area
7. System processes pasted content (continues from step 6 above)

### Token Limit Flow
1. User attempts to process article
2. System checks token availability
3. If insufficient tokens → Display upgrade prompt
4. User upgrades to paid plan (unlimited tokens)
5. User continues processing

## Environment Variables

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Supabase Configuration (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# NextAuth Configuration
NEXTAUTH_SECRET=your_random_secret_here
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (OPTIONAL - app works without it)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Application Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Required vs Optional
- **Required**: OpenAI API key, Supabase credentials (URL, anon key, service role key), NextAuth secret
- **Optional**: Google OAuth credentials (app works with email/password only if not provided)

## API Endpoints

### `POST /api/process-article`

Requires authentication. Processes an article and returns translation and insights. Includes token validation and subscription detection.

**Request**

```json
{
  "inputType": "url | text",
  "content": "string",
  "style": "warmBookish | lifeReflection | contrarian | education | science" // optional
}
```

**Success Response**

```json
{
  "translation": "string",
  "insights": "string",
  "requiresSubscription": false,
  "style": "warmBookish",
  "tokensUsed": 150,
  "tokensRemaining": 850,
  "tokensTotal": 150,
  "tokenLimit": 1000
}
```

**Error Responses**

```json
// Token limit reached
{
  "error": "TOKEN_LIMIT_REACHED",
  "message": "You've used all your free tokens...",
  "tokensUsed": 1000,
  "limit": 1000,
  "upgradeRequired": true
}

// Subscription required
{
  "error": "SUBSCRIPTION_REQUIRED",
  "message": "This article requires a subscription...",
  "requiresSubscription": true,
  "url": "https://..."
}

// Insufficient tokens
{
  "error": "INSUFFICIENT_TOKENS",
  "message": "This article requires approximately X tokens...",
  "estimatedTokens": 500,
  "tokensRemaining": 200,
  "upgradeRequired": true
}
```

### `POST /api/auth/register`

Creates a new user account with email and password.

**Request**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "Optional Name"
}
```

### `GET /api/token-usage`

Returns current token usage statistics for authenticated user.

**Response**

```json
{
  "allowed": true,
  "tokensUsed": 150,
  "tokensRemaining": 850,
  "limit": 1000,
  "userType": "trial"
}
```

### Authentication Routes

- `GET /api/auth/signin` - Sign in page
- `GET /api/auth/signout` - Sign out
- `GET /api/auth/[...nextauth]` - NextAuth.js handler
- `POST /api/auth/register` - User registration

## Authentication Methods

### 1. Email/Password Registration

Users can create an account with:
- Email address
- Password (minimum 6 characters)
- Optional name

**Default User Type**: Trial (1,000 tokens)

### 2. Google SSO (Optional)

Users can sign in with their Google account using OAuth 2.0. This feature is **optional** - if Google OAuth credentials are not provided in environment variables, the app works with email/password authentication only. The Google sign-in button automatically appears/disappears based on configuration.

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Up Supabase**
   - Create account at https://supabase.com
   - Create new project
   - Run SQL from `supabase/schema.sql` in SQL Editor
   - Get project URL, anon key, and **service role key** from Settings → API

3. **Set Up Environment Variables**
   - Copy `env.example` to `.env.local`
   - Add all required environment variables:
     - OpenAI API key
     - Supabase URL, anon key, and **service role key** (required for server-side operations)
     - NextAuth secret (generate with `openssl rand -base64 32`)
     - Google OAuth credentials (optional)

4. **Get API Keys**
   - **OpenAI**: https://platform.openai.com/api-keys
   - **Supabase**: Dashboard → Settings → API
     - Use **anon public** key (starts with `eyJ`) for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - Use **service_role** key (starts with `eyJ`) for `SUPABASE_SERVICE_ROLE_KEY`
   - **Google OAuth** (optional): https://console.cloud.google.com/apis/credentials
   - **NextAuth Secret**: Generate with `openssl rand -base64 32`

5. **Run Development Server**
   ```bash
   npm run dev
   ```

For detailed setup instructions, see [SETUP.md](./SETUP.md) and [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

## Token Management

### Trial Users
- **Token Limit**: 1,000 tokens
- **Enforcement**: Strict - cannot process articles if limit reached
- **Upgrade Prompt**: Automatic when limit reached or insufficient tokens
- **Usage Tracking**: Real-time display with progress bar

### Paid Users
- **Token Limit**: Effectively unlimited (10M tokens)
- **Usage Tracking**: Still tracked for analytics
- **No Restrictions**: Can process articles of any size

### Token Calculation
- Rough estimation: ~4 characters = 1 token
- Calculated for: Input text + Translation + Insights
- Pre-validation: System estimates tokens before processing

## Subscription Detection & Handling

### Detection Methods
- HTML class/id attributes containing paywall keywords
- Text content analysis for subscription messages
- Content length validation (short content = likely paywalled)

### User Workflow
1. System detects subscription requirement
2. Displays `SubscriptionRequired` component with:
   - Clear explanation message
   - Button to open article in new tab
   - Step-by-step instructions
   - Text area for pasted content
3. User signs in to source website
4. User copies article content
5. User pastes content into app
6. System automatically processes pasted content

## Error Handling System

### Centralized Error Handler (`lib/error-handler.ts`)
- Standardized error codes
- User-friendly messages
- Actionable guidance
- Industry best practices

### Error Types
- **Authentication**: Unauthorized, session expired
- **Token**: Limit reached, insufficient tokens
- **Content**: Extraction failed, subscription required, invalid URL, empty content
- **API**: OpenAI errors, network errors
- **Validation**: Invalid input

### Error Display
- Color-coded (red for errors, yellow for warnings)
- Clear messaging with emoji indicators
- Actionable buttons (e.g., "Upgrade to Paid Plan")
- Context-aware help text

## UI/UX Features

### Modern Design System
- **Colors**: Primary (#6366f1), secondary, accent colors
- **Typography**: Clear hierarchy with Inter font
- **Shadows**: Multiple elevation levels
- **Spacing**: Consistent spacing scale
- **Responsive**: Mobile-friendly layout

### Components
- **Hero Section**: Gradient text, feature cards, CTA buttons
- **Navigation**: Sticky header with smooth transitions
- **Forms**: Modern input styling with focus states
- **Cards**: Elevated design with hover effects
- **Error Messages**: User-friendly with actionable guidance

### User Experience
- Loading states for all async operations
- Smooth transitions and animations
- Clear visual feedback
- Accessible design patterns

## Future Enhancements

- Saved translation history
- Bulk processing
- Export formats (PDF, DOCX)
- User profiles and preferences
- Team/organization accounts
- Advanced analytics dashboard
- Multi-language support (beyond Chinese)

## Development Notes

- Translation and insight generation are intentionally separated
- Prompt quality is critical — iterate carefully
- **Style System**: 5 writing archetypes configured in `lib/prompt-styles.ts` - easily extensible
- **Style Selection**: Users can choose writing style via UI dropdown; defaults to "warmBookish"
- **Temperature Control**: Each style has optimized temperature (0.7-0.85) for best results
- Token usage is tracked per request
- Database uses Supabase with Row Level Security (RLS)
- Server-side operations use service role key to bypass RLS
- Google OAuth is optional - app gracefully handles missing credentials
- Error handling follows industry best practices
- All user-facing errors are translated to friendly messages

---

## Writing Style System

The app supports 5 distinct writing style archetypes for insight generation, each designed to produce natural, engaging content that feels less robotic:

### Available Styles

1. **温暖书卷风 (Warm Bookish)** - Default
   - Inspired by 十点读书
   - Warm, emotional, longform style
   - Empathetic tone with "陪你读/陪你想" companionship feel
   - Uses second-person address, sensory scenes, gentle transitions
   - Temperature: 0.85, Max Tokens: 2500

2. **人生思考+实用智慧 (Life Reflection)**
   - Inspired by 有书
   - Life lessons + practical wisdom
   - Calm, encouraging, slightly didactic but friendly
   - Clear "problem—cause—method" structure
   - Temperature: 0.75, Max Tokens: 2200

3. **反直觉评论+犀利逻辑 (Contrarian)**
   - Inspired by 远方青木
   - Sharp, contrarian, logical
   - Confident, direct, occasionally sarcastic
   - Uses "If...then..." reasoning and strong logic chains
   - Temperature: 0.8, Max Tokens: 2300

4. **教育/写作/互联网观察 (Education)**
   - Inspired by 玉树芝兰
   - Educational, methodological, reflective
   - Rational, thoughtful, practical frameworks
   - Clear models and teachable methods
   - Temperature: 0.75, Max Tokens: 2400

5. **科学解释+怀疑思维 (Science)**
   - Inspired by 果壳
   - Science explainer, skeptical thinking
   - Curious, precise, playful-but-rigorous
   - Separates "what we know" vs "what's uncertain"
   - Temperature: 0.7, Max Tokens: 2500

### Style Configuration

Styles are configured in `lib/prompt-styles.ts` with:
- Tone guidelines
- Structure templates
- Rhetorical devices
- Sentence style rules
- What to avoid
- Temperature and token limits

Users can select their preferred style via a dropdown in the article processor UI.

## OpenAI Prompt Templates (Production-Grade)

These are cleanly separated, debuggable, and scalable.

### Prompt 1 — Translation

#### System Prompt

```
You are a professional multilingual translator.

Your task:
- Translate the provided content into Simplified Chinese
- Preserve meaning, tone, and structure
- Keep paragraph breaks, headings, and quotes
- Do NOT summarize or add commentary
- Do NOT omit information
- Use clear, natural Chinese suitable for educated readers

Output ONLY the translated text.
```

#### User Prompt (Translation)

```
Translate the following content into Simplified Chinese:

{{ARTICLE_TEXT}}
```

### Prompt 2 — Insight & Interpretation

**Note**: This prompt is now style-aware and dynamically generated based on the selected style archetype. The system prompt and user prompt are constructed from the style configuration in `lib/prompt-styles.ts`.

#### System Prompt (Style-Aware)

The system prompt is generated based on the selected style and includes:
- Core goal and description
- Tone guidelines
- Structure requirements (opening, body, ending)
- Rhetorical devices to use
- Sentence style rules
- What to avoid
- Important guidelines for natural, engaging writing

#### User Prompt (Style-Aware)

The user prompt is generated based on the selected style and includes:
- Instructions to write in the selected style
- Article content to analyze
- Structure requirements (3 main sections with subheadings)
- Reminder to write naturally and avoid robotic language
- Requirement for 3 actionable suggestions or questions at the end

#### Default Style

If no style is specified, the system defaults to "warmBookish" (温暖书卷风) for a warm, engaging reading experience.

### Style Selection

Users can select from 5 predefined styles via a dropdown in the article processor. Each style:
- Uses optimized temperature settings for that style
- Has appropriate token limits
- Follows specific structural and rhetorical guidelines
- Produces natural, engaging content that feels human-written

The style system is extensible - new styles can be added by updating `lib/prompt-styles.ts`.

## Prompt Chaining Recommendation

Always run prompts in this order:

1. Raw text → Translation prompt
2. Translation output → Insight prompt

This improves:
- Output quality
- Debuggability
- Cost control

## Cost Control & Best Practices

### Token Management
- **Trial Limit**: 1,000 tokens enforced strictly
- **Pre-validation**: Estimate tokens before processing
- **Real-time Tracking**: Display usage with progress indicators
- **Upgrade Path**: Clear upgrade prompts when limit reached

### Error Prevention
- Validate token availability before processing
- Check content length and validity
- Detect subscription requirements early
- Provide clear error messages with solutions

### Performance
- Efficient content extraction
- Optimized API calls
- Responsive UI with loading states
- Error recovery mechanisms

### Monitoring
- Track token usage per user
- Log API errors for debugging
- Monitor subscription detection accuracy
- Analyze user behavior patterns
