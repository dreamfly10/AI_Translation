# AI Article Translation & Insight App

## Overview

This application allows users to input an article link or raw text, automatically translate it into Chinese, and generate in-depth interpretation and insights using the OpenAI API. The app requires a user management system that provide authentication and supports both email/password registration and Google SSO sign-in.

## Core Capabilities

- User authentication (Email/Password or Google SSO)
- Article ingestion (URL or pasted text)
- Automatic language detection
- High-quality Chinese translation
- Contextual insights and interpretation
- Paywall and payment processing
- Auto detection if the URL pasted by user require a subscription or not. 

## Tech Stack

- **Frontend**: Next.js 14 with React
- **Backend**: Next.js API routes
- **Authentication**: NextAuth.js (Email/Password + Google OAuth)
- **AI**: OpenAI API
- **Database**: Supabase
- **Infra**: Vercel

## High-Level Architecture

```
User Authentication
   ↓
User Input (URL or Text)
   ↓
Content Extraction / Validation
   ↓
OpenAI Translation
   ↓
OpenAI Insight Generation
   ↓
Result Rendering
```

## User Flow

1. User signs up or signs in (Email/Password or Google)
2. User pastes article URL or raw text
3. System extracts and cleans content
4. System translates content into Chinese
5. System generates insights and interpretation
6. User views result

## Environment Variables

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# NextAuth Configuration
NEXTAUTH_SECRET=your_random_secret_here
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (for SSO)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Application Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## API Endpoints

### `POST /api/process-article`

Requires authentication. Processes an article and returns translation and insights.

**Request**

```json
{
  "inputType": "url | text",
  "content": "string"
}
```

**Response**

```json
{
  "translation": "string",
  "insights": "string"
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

### Authentication Routes

- `GET /api/auth/signin` - Sign in page
- `GET /api/auth/signout` - Sign out
- `GET /api/auth/[...nextauth]` - NextAuth.js handler

## Authentication Methods

### 1. Email/Password Registration

Users can create an account with:
- Email address
- Password (minimum 6 characters)
- Optional name

### 2. Google SSO

Users can sign in with their Google account using OAuth 2.0.

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Up Environment Variables**
   - Create `.env.local` file
   - Add all required environment variables (see above)

3. **Get API Keys**
   - **OpenAI**: https://platform.openai.com/api-keys
   - **Google OAuth**: https://console.cloud.google.com/apis/credentials
   - **NextAuth Secret**: Generate with `openssl rand -base64 32`

4. **Run Development Server**
   ```bash
   npm run dev
   ```

For detailed setup instructions, see [SETUP.md](./SETUP.md)

## Future Enhancements

- Database integration (PostgreSQL, MongoDB)
- Saved translation history
- Bulk processing
- Export formats (PDF, DOCX)
- User profiles and preferences
- Team/organization accounts

## Development Notes

- Translation and insight generation are intentionally separated
- Prompt quality is critical — iterate carefully
- Track OpenAI cost per request
- User data is currently stored in-memory (resets on server restart)
- For production, implement a proper database

---

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

#### System Prompt

```
You are an expert analyst and editor writing for a Chinese-speaking audience.

Your task:
- Analyze the translated article
- Provide clear, insightful interpretation
- Explain why this article matters
- Add context that a Chinese reader may not know
- Be objective, thoughtful, and informative
- Do NOT repeat the full article

Structure your response using clear sections.
```

#### User Prompt (Insights)

```
Based on the following translated article, provide:

1. A concise summary (3–5 bullet points)
2. Key takeaways
3. Context and interpretation (why it matters)
4. Any relevant background or implications

Translated article:
{{CHINESE_TRANSLATION}}
```

### Optional Prompt Variant — Media Professional Tone

Adjust the insights to be suitable for publication by a professional media outlet.
- Use a neutral, authoritative tone.
- Avoid casual language.

## Prompt Chaining Recommendation

Always run prompts in this order:

1. Raw text → Translation prompt
2. Translation output → Insight prompt

This improves:
- Output quality
- Debuggability
- Cost control

## Cost Control Tips

- Set max token limits per stage
- Cache translations when possible
- Enforce article length limits
- Log cost per request
- Monitor usage per user
