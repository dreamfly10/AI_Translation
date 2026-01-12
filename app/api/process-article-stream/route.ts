import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { extractContentFromUrl } from '@/lib/content-extractor';
import { translateTo, generateInsights } from '@/lib/openai';
import { checkTokenLimit, consumeTokens, calculateTokensUsed } from '@/lib/token-tracker';
import { StyleArchetype, getDefaultStyle } from '@/lib/prompt-styles';
import { supabaseServer, isSupabaseConfigured } from '@/lib/supabase';
import { sanitizeError, ErrorCodes } from '@/lib/error-handler';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const processArticleSchema = z.object({
  inputType: z.enum(['url', 'text', 'video']),
  content: z.string().min(1, 'Content cannot be empty'),
  style: z.enum(['warmBookish', 'lifeReflection', 'contrarian', 'education', 'science']).optional(),
  rewritingLevel: z.enum(['light', 'medium', 'heavy']).optional(),
  voiceProfileId: z.string().uuid().optional().or(z.literal('').transform(() => undefined)),
  targetLanguage: z.enum(['zh', 'en', 'es', 'fr', 'de', 'ja', 'ko', 'pt', 'it', 'ru', 'ar']).optional().default('zh'),
});

// Helper to send SSE message
function sendSSE(controller: ReadableStreamDefaultController, event: string, data: any) {
  try {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    controller.enqueue(new TextEncoder().encode(message));
  } catch (err) {
    console.error('Error sending SSE:', err);
  }
}

export async function POST(request: Request) {
  let articleId: string | null = null;
  
  // Parse request body first (before creating stream)
  let body;
  try {
    body = await request.json();
  } catch (err) {
    const sanitized = sanitizeError({ code: ErrorCodes.INVALID_INPUT }, 'Request Parse');
    return new Response(
      JSON.stringify({ 
        error: sanitized.code,
        message: sanitized.userMessage,
        userMessage: sanitized.userMessage
      }),
      { 
        status: sanitized.statusCode,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.id) {
          const sanitized = sanitizeError({ code: ErrorCodes.UNAUTHORIZED }, 'Authentication');
          sendSSE(controller, 'error', {
            error: sanitized.code,
            message: sanitized.userMessage,
            userMessage: sanitized.userMessage
          });
          controller.close();
          return;
        }

        // Check token limit
        let tokenStatus;
        try {
          tokenStatus = await checkTokenLimit(session.user.id);
        } catch (error) {
          const sanitized = sanitizeError(error, 'Token Limit Check');
          sendSSE(controller, 'error', {
            error: sanitized.code,
            message: sanitized.userMessage,
            userMessage: sanitized.userMessage
          });
          controller.close();
          return;
        }

        if (!tokenStatus.allowed) {
          // Check if it's due to subscription expiration
          if (tokenStatus.userType === 'paid' && tokenStatus.tokensRemaining > 0) {
            sendSSE(controller, 'error', {
              error: 'SUBSCRIPTION_EXPIRED',
              message: 'Your subscription has expired. Please renew to continue.',
              userMessage: 'Your subscription has expired. Please renew your subscription to continue processing articles.',
              upgradeRequired: true
            });
          } else {
            sendSSE(controller, 'error', {
              error: tokenStatus.tokensRemaining <= 0 ? 'TOKEN_LIMIT_REACHED' : 'INSUFFICIENT_TOKENS',
              message: tokenStatus.tokensRemaining <= 0 
                ? 'You have reached your trial token limit. Please upgrade to continue.'
                : 'You do not have enough tokens for this operation. Please upgrade to continue.',
              tokensUsed: tokenStatus.tokensUsed,
              limit: tokenStatus.limit,
              tokensRemaining: tokenStatus.tokensRemaining,
              upgradeRequired: true
            });
          }
          controller.close();
          return;
        }

        // Parse and validate request body
        let parsed;
        try {
          parsed = processArticleSchema.parse(body);
        } catch (schemaError) {
          if (schemaError instanceof z.ZodError) {
            // Get the first error message for better user feedback
            const firstError = schemaError.errors[0];
            let userMessage = 'Please check your input and try again.';
            
            if (firstError) {
              if (firstError.path.includes('content')) {
                userMessage = firstError.message || 'Content is required and cannot be empty.';
              } else if (firstError.path.includes('inputType')) {
                userMessage = 'Invalid input type. Please select URL, Raw Text, or Video.';
              } else if (firstError.path.includes('voiceProfileId')) {
                userMessage = 'Invalid author profile selected. Please select a different profile.';
              } else if (firstError.path.includes('targetLanguage')) {
                userMessage = 'Invalid target language selected.';
              } else {
                userMessage = firstError.message || userMessage;
              }
            }
            
            console.error('Validation error:', schemaError.errors);
            sendSSE(controller, 'error', {
              error: 'INVALID_INPUT',
              message: 'Invalid input provided',
              details: schemaError.errors,
              userMessage: userMessage
            });
          } else {
            sendSSE(controller, 'error', {
              error: 'INVALID_INPUT',
              message: 'Invalid request format',
              userMessage: 'Please check your input and try again.'
            });
          }
          controller.close();
          return;
        }
        
        const { inputType, content, style, rewritingLevel, voiceProfileId, targetLanguage } = parsed;
        const selectedStyle: StyleArchetype = style || getDefaultStyle();
        
        // Treat 'video' as 'url' - YouTube URLs are handled the same way
        const effectiveInputType = inputType === 'video' ? 'url' : inputType;

        sendSSE(controller, 'status', { 
          message: effectiveInputType === 'url' ? 'Extracting content from URL...' : 'Processing text...',
          progress: 10 
        });

        let articleText: string;
        let requiresSubscription = false;

        // Extract content based on input type
        if (effectiveInputType === 'url') {
          try {
            sendSSE(controller, 'status', { 
              message: 'Fetching content...',
              progress: 20 
            });

            // Extract content from URL (handles YouTube videos with Whisper transcription)
            const result = await extractContentFromUrl(content, (message) => {
              sendSSE(controller, 'status', {
                message,
                progress: 25
              });
            });
            articleText = result.content;
            requiresSubscription = result.requiresSubscription;
            
            if (requiresSubscription) {
              sendSSE(controller, 'error', {
                error: 'SUBSCRIPTION_REQUIRED',
                message: 'This article requires a subscription to access',
                requiresSubscription: true,
                url: content,
              });
              controller.close();
              return;
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const knownSubscriptionSites = ['wsj.com', 'nytimes.com', 'ft.com', 'economist.com', 'bloomberg.com'];
            const isKnownSite = knownSubscriptionSites.some(site => content.includes(site));
            
            if (isKnownSite || errorMessage.includes('fetch failed')) {
              sendSSE(controller, 'error', {
                error: 'SUBSCRIPTION_REQUIRED',
                message: 'This article requires a subscription to access. Please sign in to the website and copy the article content.',
                requiresSubscription: true,
                url: content,
              });
              controller.close();
              return;
            }
            
            sendSSE(controller, 'error', {
              error: 'CONTENT_EXTRACTION_FAILED',
              message: `Failed to extract content: ${errorMessage}`,
              userMessage: 'Could not extract content from the URL. Please check if the URL is valid and accessible, or use the Raw Text tab instead.'
            });
            controller.close();
            return;
          }
        } else {
          articleText = content;
        }
        
        // Check if content is empty
        if (!articleText || articleText.trim().length < 50) {
          sendSSE(controller, 'error', {
            error: 'EMPTY_CONTENT',
            message: 'No content found. Please provide at least 50 characters of text.',
            requiresSubscription: effectiveInputType === 'url' ? requiresSubscription : false,
            userMessage: effectiveInputType === 'url' 
              ? 'Could not extract content from the URL. Please try using the Raw Text tab instead.'
              : 'Please provide at least 50 characters of text to process.'
          });
          controller.close();
          return;
        }

        // Estimate tokens before processing (rough estimate: input + 2x for translation + 2x for insights)
        const estimatedInputTokens = await calculateTokensUsed(articleText);
        const estimatedTotalTokens = Math.ceil(estimatedInputTokens * 3.5); // Conservative estimate
        
        // Check token limit BEFORE processing
        const preCheckTokenStatus = await checkTokenLimit(session.user.id);
        if (preCheckTokenStatus.userType === 'trial' && preCheckTokenStatus.tokensRemaining < estimatedTotalTokens) {
          sendSSE(controller, 'error', {
            error: 'INSUFFICIENT_TOKENS',
            message: `This operation requires approximately ${estimatedTotalTokens.toLocaleString()} tokens, but you only have ${preCheckTokenStatus.tokensRemaining.toLocaleString()} tokens remaining. Please upgrade to continue.`,
            tokensUsed: preCheckTokenStatus.tokensUsed,
            limit: preCheckTokenStatus.limit,
            tokensRemaining: preCheckTokenStatus.tokensRemaining,
            requiredTokens: estimatedTotalTokens,
            upgradeRequired: true
          });
          controller.close();
          return;
        }

        const targetLang = targetLanguage || 'zh';
        const languageName = targetLang === 'zh' ? 'Chinese' : targetLang === 'en' ? 'English' : targetLang.toUpperCase();
        
        sendSSE(controller, 'status', { 
          message: `Translating to ${languageName}...`,
          progress: 30 
        });

        // Translate to target language
        let translation: string;
        try {
          translation = await translateTo(articleText, targetLang);
          
          if (!translation || translation.trim().length === 0) {
            throw new Error('Translation returned empty result');
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Translation failed';
          sendSSE(controller, 'error', {
            error: 'TRANSLATION_FAILED',
            message: errorMessage,
            userMessage: `Failed to translate article: ${errorMessage}. Please try again.`,
          });
          controller.close();
          return;
        }
        
        sendSSE(controller, 'translation_chunk', { 
          text: translation,
          complete: true
        });
        sendSSE(controller, 'status', { 
          message: 'Generating insights...',
          progress: 60 
        });
        
        // Generate insights, passing voiceProfileId, targetLanguage, and rewritingLevel
        let insights: string;
        try {
          insights = await generateInsights(translation, selectedStyle, voiceProfileId, targetLang, rewritingLevel);
          
          if (!insights || insights.trim().length === 0) {
            throw new Error('Insights generation returned empty result');
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Insights generation failed';
          
          // Check if it's a voice profile error
          let userMessage = `Failed to generate insights: ${errorMessage}. Translation is still available below.`;
          if (errorMessage.includes('Voice profile') || errorMessage.includes('not found') || errorMessage.includes('style rules')) {
            userMessage = `The selected author profile is invalid or missing. ${errorMessage}. Please select a different profile or use a default writing style. Translation is still available below.`;
          }
          
          sendSSE(controller, 'error', {
            error: 'INSIGHTS_FAILED',
            message: errorMessage,
            userMessage: userMessage,
          });
          controller.close();
          return;
        }
        
        sendSSE(controller, 'insights_chunk', { 
          text: insights,
          complete: true
        });
        sendSSE(controller, 'status', { 
          message: 'Saving article...',
          progress: 90 
        });

        // Calculate actual tokens used
        const inputTokens = await calculateTokensUsed(articleText);
        const translationTokens = await calculateTokensUsed(translation);
        const insightsTokens = await calculateTokensUsed(insights);
        const totalTokens = inputTokens + translationTokens + insightsTokens;

        // Final check before consuming tokens (in case estimation was off or subscription expired)
        const finalTokenStatus = await checkTokenLimit(session.user.id);
        
        // Check if subscription expired during processing
        if (finalTokenStatus.userType === 'paid' && !finalTokenStatus.allowed && finalTokenStatus.tokensRemaining > 0) {
          sendSSE(controller, 'error', {
            error: 'SUBSCRIPTION_EXPIRED',
            message: 'Your subscription has expired during processing. Please renew your subscription to continue.',
            userMessage: 'Your subscription expired while processing. Please renew to continue.',
            upgradeRequired: true
          });
          controller.close();
          return;
        }
        
        if (finalTokenStatus.userType === 'trial' && finalTokenStatus.tokensRemaining < totalTokens) {
          sendSSE(controller, 'error', {
            error: 'INSUFFICIENT_TOKENS',
            message: `This operation requires ${totalTokens.toLocaleString()} tokens, but you only have ${finalTokenStatus.tokensRemaining.toLocaleString()} tokens remaining. Please upgrade to continue.`,
            tokensUsed: finalTokenStatus.tokensUsed,
            limit: finalTokenStatus.limit,
            tokensRemaining: finalTokenStatus.tokensRemaining,
            requiredTokens: totalTokens,
            upgradeRequired: true
          });
          controller.close();
          return;
        }

        // Save article to database FIRST (before consuming tokens)
        if (isSupabaseConfigured()) {
          // Verify service role key is being used (required to bypass RLS)
          const hasServiceRoleKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
          if (!hasServiceRoleKey) {
            console.warn('[SAVE ARTICLE] WARNING: SUPABASE_SERVICE_ROLE_KEY not set. RLS policies may block inserts.');
          }
          
          try {
            const title = effectiveInputType === 'url' || inputType === 'video' 
              ? (content.length > 100 ? content.substring(0, 100) : content)
              : (articleText.length > 100 ? articleText.substring(0, 100) : articleText);

            // Ensure title is not empty
            const finalTitle = title.trim() || 'Untitled Article';

            // Match the actual database schema:
            // - original_content is NOT NULL, so we must always provide it (use articleText which contains the extracted content)
            // - input_type only allows 'url' or 'text' (not 'video'), so convert 'video' to 'url'
            // - source_url is only for URL input type
            // - tokens_used should be included
            const articleData: any = {
              user_id: session.user.id,
              title: finalTitle,
              // Convert 'video' to 'url' since schema only allows 'url' | 'text'
              input_type: inputType === 'video' ? 'url' : effectiveInputType,
              source_url: (effectiveInputType === 'url' || inputType === 'video') ? content : null,
              // original_content is NOT NULL in the schema, so always provide articleText (which contains extracted content for URLs)
              original_content: articleText || '',
              translated_content: translation || '',
              insights: insights || '',
              style: selectedStyle || null,
              target_language: targetLang,
              tokens_used: totalTokens,
            };

            console.log('[SAVE ARTICLE] Attempting to save:', {
              userId: session.user.id,
              title: finalTitle.substring(0, 50),
              inputType: articleData.input_type,
              hasTranslation: !!translation,
              hasInsights: !!insights,
              translationLength: translation?.length || 0,
              insightsLength: insights?.length || 0,
            });

            const { data: savedArticle, error: saveError } = await supabaseServer
              .from('articles')
              .insert(articleData)
              .select('id')
              .single();

            if (saveError) {
              // Handle missing target_language column gracefully
              if (saveError.code === 'PGRST204' && saveError.message?.includes('target_language')) {
                console.warn('[SAVE ARTICLE] target_language column missing, retrying without it...');
                // Remove target_language and try again
                const { target_language, ...articleDataWithoutTargetLang } = articleData;
                const { data: savedArticleRetry, error: saveErrorRetry } = await supabaseServer
                  .from('articles')
                  .insert(articleDataWithoutTargetLang)
                  .select('id')
                  .single();

                if (saveErrorRetry) {
                  console.error('[SAVE ARTICLE ERROR] Retry failed:', saveErrorRetry);
                  sendSSE(controller, 'save_error', {
                    error: 'ARTICLE_SAVE_FAILED',
                    message: saveErrorRetry.message,
                    errorCode: saveErrorRetry.code,
                    userMessage: 'Article processed but could not be saved. Please run the database migration to add the target_language column.',
                    errorDetails: 'Run the SQL in supabase/migrations/add_target_language_to_articles.sql in your Supabase SQL Editor'
                  });
                } else {
                  console.log('[SAVE ARTICLE] Saved successfully (without target_language)');
                  sendSSE(controller, 'complete', {
                    translation,
                    insights,
                    articleId: savedArticleRetry.id,
                    style: selectedStyle,
                  });
                }
                controller.close();
                return;
              }

              console.error('[SAVE ARTICLE ERROR] Full error:', {
                code: saveError.code,
                message: saveError.message,
                details: saveError.details,
                hint: saveError.hint,
                fullError: saveError,
                articleDataKeys: Object.keys(articleData),
                articleDataSizes: {
                  title: finalTitle.length,
                  translated_content: translation?.length || 0,
                  insights: insights?.length || 0,
                  original_content: articleData.original_content?.length || 0,
                }
              });
              
              // Check if it's a table missing error
              if (saveError.code === '42P01' || saveError.message?.includes('does not exist') || saveError.message?.includes('relation') && saveError.message?.includes('articles')) {
                sendSSE(controller, 'save_error', {
                  error: 'ARTICLE_SAVE_FAILED',
                  message: 'Articles table does not exist in database',
                  errorCode: saveError.code,
                  errorDetails: `Database error: ${saveError.message}. Please run the SQL schema from supabase/schema.sql in your Supabase SQL Editor to create the articles table.`,
                  userMessage: 'Article processed but could not be saved. The articles table needs to be created in the database. Please run the SQL schema in Supabase.'
                });
              } else if (saveError.code === '23505') {
                // Unique constraint violation
                sendSSE(controller, 'save_error', {
                  error: 'ARTICLE_SAVE_FAILED',
                  message: 'Article already exists',
                  errorCode: saveError.code,
                  errorDetails: saveError.message,
                  userMessage: 'Article processed but could not be saved (duplicate). Results are still available.'
                });
              } else if (saveError.code === '23503') {
                // Foreign key violation
                sendSSE(controller, 'save_error', {
                  error: 'ARTICLE_SAVE_FAILED',
                  message: 'Invalid user reference',
                  errorCode: saveError.code,
                  errorDetails: saveError.message,
                  userMessage: 'Article processed but could not be saved. Please contact support.'
                });
              } else {
                sendSSE(controller, 'save_error', {
                  error: 'ARTICLE_SAVE_FAILED',
                  message: 'Failed to save article to database',
                  errorCode: saveError.code || 'UNKNOWN',
                  errorDetails: `${saveError.message || 'Unknown error'}${saveError.hint ? ` (Hint: ${saveError.hint})` : ''}`,
                  userMessage: 'Article processed but could not be saved to history. Results are still available. Check server console for details.'
                });
              }
            } else {
              articleId = savedArticle.id;
              console.log('[SAVE ARTICLE] Successfully saved article:', articleId);
              
              // Only consume tokens AFTER successful save
              try {
                await consumeTokens(session.user.id, totalTokens);
              } catch (tokenError) {
                console.error('Error consuming tokens after save:', tokenError);
                // Log but don't fail - article is already saved
              }
            }
          } catch (saveErr) {
            console.error('Error saving article (catch block):', saveErr);
            const errorMessage = saveErr instanceof Error ? saveErr.message : String(saveErr);
            sendSSE(controller, 'save_error', {
              error: 'ARTICLE_SAVE_FAILED',
              message: 'Failed to save article to database',
              errorDetails: errorMessage,
              userMessage: 'Article processed but could not be saved to history. Results are still available.'
            });
            // Don't consume tokens if save failed
          }
        } else {
          // If Supabase is not configured, still consume tokens (for development/testing)
          try {
            await consumeTokens(session.user.id, totalTokens);
          } catch (tokenError) {
            console.error('Error consuming tokens:', tokenError);
          }
        }

        // Send complete event
        sendSSE(controller, 'complete', {
          translation,
          insights,
          requiresSubscription,
          style: selectedStyle,
          articleId: articleId,
          tokensUsed: totalTokens,
        });

        controller.close();
      } catch (error) {
        // All errors are sanitized - no backend details exposed
        const sanitized = sanitizeError(error, 'Stream Processing');
        sendSSE(controller, 'error', {
          error: sanitized.code,
          message: sanitized.userMessage,
          userMessage: sanitized.userMessage
        });
        controller.close();
      }
    },
  });

  try {
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    const sanitized = sanitizeError(error, 'Stream Creation');
    return new Response(
      JSON.stringify({ 
        error: sanitized.code,
        message: sanitized.userMessage,
        userMessage: sanitized.userMessage
      }),
      { 
        status: sanitized.statusCode,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

