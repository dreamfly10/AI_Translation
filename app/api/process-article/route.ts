import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { extractContentFromUrl } from '@/lib/content-extractor';
import { translateToChinese, generateInsights } from '@/lib/openai';
import { checkTokenLimit, consumeTokens, calculateTokensUsed } from '@/lib/token-tracker';
import { StyleArchetype, getDefaultStyle } from '@/lib/prompt-styles';
import { z } from 'zod';

const processArticleSchema = z.object({
  inputType: z.enum(['url', 'text']),
  content: z.string().min(1),
  style: z.enum(['warmBookish', 'lifeReflection', 'contrarian', 'education', 'science']).optional(),
});

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      console.error('Authentication failed:', { 
        hasSession: !!session, 
        hasUser: !!session?.user, 
        hasUserId: !!session?.user?.id 
      });
      return NextResponse.json(
        { 
          error: 'UNAUTHORIZED',
          message: 'Please sign in to continue',
          userMessage: 'Your session has expired. Please sign in again.'
        },
        { status: 401 }
      );
    }

    // Check token limit for trial users
    let tokenStatus;
    try {
      tokenStatus = await checkTokenLimit(session.user.id);
    } catch (error) {
      console.error('Error checking token limit:', error);
      return NextResponse.json(
        { 
          error: 'SERVER_ERROR',
          message: 'Failed to check token limit',
          userMessage: 'Unable to verify your token limit. Please try again.'
        },
        { status: 500 }
      );
    }

    if (!tokenStatus.allowed) {
      return NextResponse.json(
        { 
          error: tokenStatus.tokensRemaining <= 0 ? 'TOKEN_LIMIT_REACHED' : 'INSUFFICIENT_TOKENS',
          message: tokenStatus.tokensRemaining <= 0 
            ? 'You have reached your trial token limit. Please upgrade to continue.'
            : 'You do not have enough tokens for this operation. Please upgrade to continue.',
          tokensUsed: tokenStatus.tokensUsed,
          limit: tokenStatus.limit,
          tokensRemaining: tokenStatus.tokensRemaining,
          upgradeRequired: true
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { inputType, content, style } = processArticleSchema.parse(body);
    const selectedStyle: StyleArchetype = style || getDefaultStyle();

    let articleText: string;
    let requiresSubscription = false;

    // Extract content based on input type
    if (inputType === 'url') {
      try {
        const result = await extractContentFromUrl(content);
        articleText = result.content;
        requiresSubscription = result.requiresSubscription;
        
        // If subscription is required (either detected or known site), return early
        if (requiresSubscription) {
          return NextResponse.json(
            {
              error: 'SUBSCRIPTION_REQUIRED',
              message: 'This article requires a subscription to access',
              requiresSubscription: true,
              url: content,
            },
            { status: 402 }
          );
        }
      } catch (error) {
        // If extraction fails, check if it's a known subscription site
        const errorMessage = error instanceof Error ? error.message : String(error);
        const knownSubscriptionSites = ['wsj.com', 'nytimes.com', 'ft.com', 'economist.com', 'bloomberg.com'];
        const isKnownSite = knownSubscriptionSites.some(site => content.includes(site));
        
        // Handle subscription-required sites
        if (isKnownSite || errorMessage.includes('subscription') || errorMessage.includes('paywall')) {
          return NextResponse.json(
            {
              error: 'SUBSCRIPTION_REQUIRED',
              message: 'This article requires a subscription to access. Please sign in to the website and copy the article content.',
              userMessage: 'This article requires a subscription. Please log in to the website, copy the article text, and paste it in the "Raw Text" tab.',
              requiresSubscription: true,
              url: content,
            },
            { status: 402 }
          );
        }
        
        // Handle timeout errors
        if (errorMessage.includes('timeout') || errorMessage.includes('Request timeout')) {
          return NextResponse.json(
            {
              error: 'TIMEOUT',
              message: 'Request timed out while fetching the URL',
              userMessage: 'The website took too long to respond. This often happens with JavaScript-heavy sites. Please copy the article content and use the "Raw Text" tab instead.',
              url: content,
            },
            { status: 408 }
          );
        }
        
        // Handle network/CORS errors
        if (errorMessage.includes('CORS') || errorMessage.includes('Cross-Origin') || 
            errorMessage.includes('network') || errorMessage.includes('fetch failed')) {
          return NextResponse.json(
            {
              error: 'NETWORK_ERROR',
              message: 'Network error or CORS restriction',
              userMessage: 'Unable to fetch content from this URL. The website may block automated requests or use JavaScript to load content. Please copy the article text and use the "Raw Text" tab.',
              url: content,
            },
            { status: 403 }
          );
        }
        
        // Handle invalid URL errors
        if (errorMessage.includes('Invalid URL')) {
          return NextResponse.json(
            {
              error: 'INVALID_URL',
              message: 'Invalid URL format',
              userMessage: 'The URL format is invalid. Please ensure it starts with http:// or https:// and is a complete, valid URL.',
              url: content,
            },
            { status: 400 }
          );
        }
        
        // Handle SSL/certificate errors
        if (errorMessage.includes('SSL') || errorMessage.includes('certificate') || errorMessage.includes('TLS')) {
          return NextResponse.json(
            {
              error: 'SSL_ERROR',
              message: 'SSL/Certificate error',
              userMessage: 'The website has certificate issues. Please verify the URL is correct, or copy the article content and use the "Raw Text" tab.',
              url: content,
            },
            { status: 526 }
          );
        }
        
        // Generic extraction error with helpful message
        return NextResponse.json(
          {
            error: 'EXTRACTION_ERROR',
            message: errorMessage,
            userMessage: `Failed to extract content: ${errorMessage}. If this site uses JavaScript to load content dynamically, please copy the article text and use the "Raw Text" tab instead.`,
            url: content,
          },
          { status: 500 }
        );
      }
    } else {
      articleText = content;
    }
    
    // Check if content is empty
    if (!articleText || articleText.trim().length < 50) {
      const isEmptyFromUrl = inputType === 'url';
      return NextResponse.json(
        {
          error: 'EMPTY_CONTENT',
          message: 'No content found in the article',
          userMessage: isEmptyFromUrl 
            ? 'No readable content was found on this page. This may happen if the site uses JavaScript to load content, requires login, or has a paywall. Please copy the article text manually and use the "Raw Text" tab.'
            : 'The provided text is too short. Please provide at least 50 characters of content.',
          requiresSubscription: isEmptyFromUrl ? requiresSubscription : false,
          url: isEmptyFromUrl ? content : undefined,
        },
        { status: 400 }
      );
    }

    // Estimate tokens needed before processing
    const estimatedInputTokens = await calculateTokensUsed(articleText);
    // Estimate translation and insights (typically 1.5-2x the input)
    const estimatedTotalTokens = Math.ceil(estimatedInputTokens * 2.5);
    
    // Check if user has enough tokens for this operation
    const currentTokenStatus = await checkTokenLimit(session.user.id);
    if (currentTokenStatus.userType === 'trial' && currentTokenStatus.tokensRemaining < estimatedTotalTokens) {
      return NextResponse.json(
        { 
          error: 'INSUFFICIENT_TOKENS',
          message: `This article requires approximately ${estimatedTotalTokens.toLocaleString()} tokens, but you only have ${currentTokenStatus.tokensRemaining.toLocaleString()} tokens remaining. Please upgrade to continue.`,
          tokensUsed: currentTokenStatus.tokensUsed,
          limit: currentTokenStatus.limit,
          tokensRemaining: currentTokenStatus.tokensRemaining,
          estimatedTokens: estimatedTotalTokens,
          upgradeRequired: true
        },
        { status: 403 }
      );
    }

    // Translate to Chinese
    const translation = await translateToChinese(articleText);
    
    // Generate insights with selected style
    const insights = await generateInsights(translation, selectedStyle);

    // Calculate and consume tokens
    const inputTokens = await calculateTokensUsed(articleText);
    const translationTokens = await calculateTokensUsed(translation);
    const insightsTokens = await calculateTokensUsed(insights);
    const totalTokens = inputTokens + translationTokens + insightsTokens;

    // Final check before consuming tokens
    const finalTokenStatus = await checkTokenLimit(session.user.id);
    if (finalTokenStatus.userType === 'trial' && finalTokenStatus.tokensRemaining < totalTokens) {
      return NextResponse.json(
        { 
          error: 'INSUFFICIENT_TOKENS',
          message: `This operation requires ${totalTokens.toLocaleString()} tokens, but you only have ${finalTokenStatus.tokensRemaining.toLocaleString()} tokens remaining. Please upgrade to continue.`,
          tokensUsed: finalTokenStatus.tokensUsed,
          limit: finalTokenStatus.limit,
          tokensRemaining: finalTokenStatus.tokensRemaining,
          requiredTokens: totalTokens,
          upgradeRequired: true
        },
        { status: 403 }
      );
    }

    await consumeTokens(session.user.id, totalTokens);

    // Get updated token status
    const updatedTokenStatus = await checkTokenLimit(session.user.id);

    return NextResponse.json({
      translation,
      insights,
      requiresSubscription,
      style: selectedStyle,
      tokensUsed: totalTokens,
      tokensRemaining: updatedTokenStatus.tokensRemaining,
      tokensTotal: updatedTokenStatus.tokensUsed,
      tokenLimit: updatedTokenStatus.limit,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'INVALID_INPUT',
          message: 'Invalid input provided',
          details: error.errors 
        },
        { status: 400 }
      );
    }

    console.error('Process article error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Parse error type
    let errorCode = 'UNKNOWN_ERROR';
    let statusCode = 500;
    
    if (errorMessage.includes('extract') || errorMessage.includes('fetch')) {
      errorCode = 'CONTENT_EXTRACTION_FAILED';
      statusCode = 400;
    } else if (errorMessage.includes('subscription') || errorMessage.includes('paywall')) {
      errorCode = 'SUBSCRIPTION_REQUIRED';
      statusCode = 402;
    } else if (errorMessage.includes('OpenAI') || errorMessage.includes('API')) {
      errorCode = 'OPENAI_ERROR';
      statusCode = 500;
    } else if (errorMessage.includes('network') || errorMessage.includes('fetch failed')) {
      errorCode = 'NETWORK_ERROR';
      statusCode = 503;
    }
    
    return NextResponse.json(
      { 
        error: errorCode,
        message: errorMessage,
        userMessage: errorMessage
      },
      { status: statusCode }
    );
  }
}

