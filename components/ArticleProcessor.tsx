'use client';

import { useState, useEffect, useRef } from 'react';
import { sanitizeError, AppError } from '@/lib/error-handler';
import SubscriptionRequired from './SubscriptionRequired';
import { StyleArchetype, RewritingLevel, styleArchetypes, getDefaultStyle, getAllDefaultStyles } from '@/lib/prompt-styles';
import { getSession } from 'next-auth/react';
import { exportContent, ExportFormat } from '@/lib/export-utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSettingsModal } from '@/contexts/SettingsModalContext';

interface ProcessResult {
  translation: string;
  insights: string;
  requiresSubscription?: boolean;
  style?: StyleArchetype;
  articleId?: string;
}

interface ArticleProcessorProps {
  selectedArticleId?: string | null;
  onArticleProcessed?: () => void;
}

// Helptip component
function Helptip({ tooltip }: { tooltip: string }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tooltipContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setShowTooltip(false);
      }
    };

    if (showTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTooltip]);

  // Calculate position to keep tooltip within viewport
  useEffect(() => {
    if (showTooltip && tooltipRef.current && tooltipContentRef.current) {
      const container = tooltipRef.current;
      const tooltip = tooltipContentRef.current;
      
      const containerRect = container.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Check if tooltip overflows to the right
      const overflowsRight = containerRect.right + tooltipRect.width + 8 > viewportWidth;
      // Check if tooltip overflows to the bottom
      const overflowsBottom = containerRect.bottom + tooltipRect.height / 2 > viewportHeight;
      // Check if tooltip overflows to the top
      const overflowsTop = containerRect.top - tooltipRect.height / 2 < 0;
      
      // Adjust position
      if (overflowsRight) {
        tooltip.style.left = 'auto';
        tooltip.style.right = '100%';
        tooltip.style.marginLeft = '0';
        tooltip.style.marginRight = '0.5rem';
      } else {
        tooltip.style.left = '100%';
        tooltip.style.right = 'auto';
        tooltip.style.marginLeft = '0.5rem';
        tooltip.style.marginRight = '0';
      }
      
      if (overflowsBottom) {
        tooltip.style.top = 'auto';
        tooltip.style.bottom = '0';
        tooltip.style.transform = 'translateY(0)';
      } else if (overflowsTop) {
        tooltip.style.top = '0';
        tooltip.style.transform = 'translateY(0)';
      } else {
        tooltip.style.top = '50%';
        tooltip.style.transform = 'translateY(-50%)';
      }
    }
  }, [showTooltip]);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={tooltipRef}>
      <button
        type="button"
        onClick={() => setShowTooltip(!showTooltip)}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '0.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-secondary)',
          fontSize: '1rem',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          transition: 'all var(--transition-base)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--color-text-primary)';
          e.currentTarget.style.background = 'var(--color-background-secondary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--color-text-secondary)';
          e.currentTarget.style.background = 'transparent';
        }}
        aria-label="Help"
      >
        ℹ️
      </button>
      {showTooltip && (
        <div
          ref={tooltipContentRef}
          style={{
            position: 'absolute',
            top: '50%',
            left: '100%',
            marginLeft: '0.5rem',
            transform: 'translateY(-50%)',
            padding: '0.5rem 0.75rem',
            background: 'var(--color-background-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
            color: 'var(--color-text-primary)',
            maxWidth: '300px',
            width: 'max-content',
            maxHeight: '80vh',
            overflow: 'auto',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            whiteSpace: 'pre-line',
            lineHeight: 1.4,
            wordWrap: 'break-word',
            overflowWrap: 'break-word'
          }}
        >
          {tooltip}
        </div>
      )}
    </div>
  );
}

export default function ArticleProcessor({ selectedArticleId, onArticleProcessed }: ArticleProcessorProps) {
  const { t, language } = useLanguage();
  const { openModal: openSettingsModal } = useSettingsModal();
  const [inputType, setInputType] = useState<'url' | 'text' | 'video'>('url');
  const [content, setContent] = useState('');
  const [style, setStyle] = useState<StyleArchetype>(getDefaultStyle());
  const [voiceProfileId, setVoiceProfileId] = useState<string | null>(null);
  const [voiceProfiles, setVoiceProfiles] = useState<any[]>([]);
  const [rewritingLevel, setRewritingLevel] = useState<RewritingLevel>('medium');
  const [targetLanguage, setTargetLanguage] = useState<string>('zh');
  const [enabledThinkingStyles, setEnabledThinkingStyles] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [subscriptionUrl, setSubscriptionUrl] = useState<string | null>(null);
  const [loadingArticle, setLoadingArticle] = useState(false);
  const [formatError, setFormatError] = useState<string | null>(null);
  
  // Streaming states
  const [streamingTranslation, setStreamingTranslation] = useState('');
  const [streamingInsights, setStreamingInsights] = useState('');
  const [currentStage, setCurrentStage] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  
  // Export dropdown states
  const [translationExportOpen, setTranslationExportOpen] = useState(false);
  const [insightsExportOpen, setInsightsExportOpen] = useState(false);
  const translationExportRef = useRef<HTMLDivElement>(null);
  const insightsExportRef = useRef<HTMLDivElement>(null);
  
  // Collapse states
  const [translationCollapsed, setTranslationCollapsed] = useState(false);
  const [insightsCollapsed, setInsightsCollapsed] = useState(false);
  
  // TTS states
  const [ttsLoading, setTtsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [ttsLoadingInsights, setTtsLoadingInsights] = useState(false);
  const [audioUrlInsights, setAudioUrlInsights] = useState<string | null>(null);
  
  // Audio player states
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [audioElementInsights, setAudioElementInsights] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayingInsights, setIsPlayingInsights] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [playbackRateInsights, setPlaybackRateInsights] = useState(1);

  // Fact check states
  const [factCheckLoading, setFactCheckLoading] = useState(false);
  const [factCheckLoadingInsights, setFactCheckLoadingInsights] = useState(false);
  // Shared fact-check results for both translation and insights
  const [factCheckResults, setFactCheckResults] = useState<any[] | null>(null);
  const [factCheckResultsInsights, setFactCheckResultsInsights] = useState<any[] | null>(null);

  // Fetch voice profiles on mount and when profiles are updated
  useEffect(() => {
    const fetchVoiceProfiles = async () => {
      try {
        const response = await fetch('/api/voice-profiles');
        if (response.ok) {
          const data = await response.json();
          setVoiceProfiles(data.profiles || []);
        }
      } catch (err) {
        console.error('Error fetching voice profiles:', err);
      }
    };

    fetchVoiceProfiles();

    // Listen for profile updates
    const handleProfileUpdate = () => {
      fetchVoiceProfiles().then(() => {
        // Check if currently selected profile still exists
        if (voiceProfileId) {
          fetch('/api/voice-profiles')
            .then(res => res.json())
            .then(data => {
              const profiles = data.profiles || [];
              const profileExists = profiles.some((p: any) => p.id === voiceProfileId);
              if (!profileExists) {
                // Profile was deleted, clear selection
                setVoiceProfileId(null);
                setStyle(getDefaultStyle());
              }
            })
            .catch(err => console.error('Error checking profile existence:', err));
        }
      });
    };

    window.addEventListener('voiceProfileUpdated', handleProfileUpdate);
    return () => {
      window.removeEventListener('voiceProfileUpdated', handleProfileUpdate);
    };
  }, [voiceProfileId]);

  // Load user preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await fetch('/api/user-preferences');
        if (response.ok) {
          const data = await response.json();
          if (data.defaultWritingStyle) {
            setStyle(data.defaultWritingStyle as StyleArchetype);
          }
          if (data.defaultExpressionVariation) {
            setRewritingLevel(data.defaultExpressionVariation as RewritingLevel);
          }
          if (data.defaultTargetLanguage) {
            setTargetLanguage(data.defaultTargetLanguage);
          }
          if (data.enabledThinkingStyles) {
            setEnabledThinkingStyles(data.enabledThinkingStyles);
          } else {
            // Default: all styles enabled
            setEnabledThinkingStyles(getAllDefaultStyles());
          }
        }
      } catch (err) {
        console.error('Error loading preferences:', err);
        // Default: all styles enabled on error
        setEnabledThinkingStyles(getAllDefaultStyles());
      }
    };
    loadPreferences();

    // Listen for preference updates
    const handlePreferencesUpdate = () => {
      loadPreferences();
    };
    window.addEventListener('preferencesUpdated', handlePreferencesUpdate);
    return () => {
      window.removeEventListener('preferencesUpdated', handlePreferencesUpdate);
    };
  }, []);

  // Cleanup audio elements on unmount
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }
      }
      if (audioElementInsights) {
        audioElementInsights.pause();
        audioElementInsights.src = '';
        if (audioUrlInsights) {
          URL.revokeObjectURL(audioUrlInsights);
        }
      }
    };
  }, [audioElement, audioElementInsights, audioUrl, audioUrlInsights]);

  // Clear content when switching input types
  useEffect(() => {
    // Only clear if not loading an article
    if (!loadingArticle && !selectedArticleId) {
      setContent('');
      setFormatError(null);
    }
  }, [inputType]);

  // Load article when selectedArticleId changes
  useEffect(() => {
    if (selectedArticleId) {
      loadArticle(selectedArticleId);
    } else {
      // Clear result when no article is selected
      setResult(null);
      setContent('');
      setError(null);
      setFormatError(null);
    }
  }, [selectedArticleId]);

  // Countdown timer effect
  useEffect(() => {
    if (timeRemaining !== null && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 1) {
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeRemaining]);

  // Session refresh effect - keep session alive during processing
  useEffect(() => {
    if (!loading) {
      return; // Don't refresh if not processing
    }

    // Refresh session every 2 minutes to prevent auto sign-out
    // NextAuth sessions typically expire after 30 days, but refreshing
    // ensures the session stays active during long video processing
    const refreshSession = async () => {
      try {
        // Call getSession() which will refresh the session token if needed
        const session = await getSession();
        
        if (!session) {
          // Session is null, user is signed out
          console.warn('Session is null during processing - user may have been signed out');
          if (loading) {
            setError({
              code: 'SESSION_EXPIRED',
              message: 'Your session has expired',
              userMessage: 'Your session has expired during processing. Please sign in again and try again.',
              actionable: 'Please sign in again',
              statusCode: 401,
            });
            setLoading(false);
          }
          return;
        }
        
        console.log('Session refreshed to prevent auto sign-out');
      } catch (error) {
        console.error('Failed to refresh session:', error);
        // If session refresh fails, it might mean the user is already signed out
        // In that case, we should stop processing and show an error
        if (loading) {
          setError({
            code: 'SESSION_EXPIRED',
            message: 'Your session has expired',
            userMessage: 'Your session has expired during processing. Please sign in again and try again.',
            actionable: 'Please sign in again',
            statusCode: 401,
          });
          setLoading(false);
        }
      }
    };

    // Refresh immediately, then every 2 minutes
    refreshSession();
    const sessionRefreshInterval = setInterval(refreshSession, 2 * 60 * 1000); // 2 minutes

    return () => {
      clearInterval(sessionRefreshInterval);
    };
  }, [loading]);

  // Close export dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (translationExportRef.current && !translationExportRef.current.contains(event.target as Node)) {
        setTranslationExportOpen(false);
      }
      if (insightsExportRef.current && !insightsExportRef.current.contains(event.target as Node)) {
        setInsightsExportOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Export handlers
  const handleExport = async (content: string, format: ExportFormat, title: string) => {
    try {
      const filename = title.replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '_');
      await exportContent(content, format, filename);
    } catch (error) {
      console.error('Export error:', error);
      setError({
        code: 'EXPORT_ERROR',
        message: 'Failed to export content',
        userMessage: error instanceof Error ? error.message : 'Failed to export content. Please try again.',
        actionable: 'Please try a different format',
        statusCode: 500,
      });
    }
  };

  const loadArticle = async (articleId: string) => {
    setLoadingArticle(true);
    setError(null);
    try {
      const response = await fetch(`/api/articles/${articleId}`);
      if (!response.ok) {
        throw new Error('Failed to load article');
      }
      const data = await response.json();
      const article = data.article;

      // Populate form with article data
      setInputType(article.inputType as 'url' | 'text' | 'video');
      setContent(article.inputType === 'url' || article.inputType === 'video' ? (article.sourceUrl || '') : article.originalContent);
      setStyle(article.style || getDefaultStyle());
      setRewritingLevel('medium'); // Default rewriting level for loaded articles
      setTargetLanguage(article.targetLanguage || 'zh'); // Restore target language
      
      // Set result to display translation and insights
      // Clean insights to remove markdown headers (including ####)
      const cleanedInsights = article.insights.replace(/^#{1,4}\s+/gm, '');
      setResult({
        translation: article.translatedContent,
        insights: cleanedInsights,
        style: article.style || getDefaultStyle(),
        articleId: article.id,
      });
    } catch (err) {
      setError({
        code: 'LOAD_ERROR',
        message: 'Failed to load article',
        userMessage: err instanceof Error ? err.message : 'Failed to load article',
        actionable: 'Please try again or select a different article.',
        statusCode: 500,
      });
    } finally {
      setLoadingArticle(false);
    }
  };

  // Validate content format based on input type
  const validateContent = (): boolean => {
    setFormatError(null);
    
    if (!content || content.trim().length === 0) {
      setFormatError('Please enter some content to process');
      return false;
    }

    if (inputType === 'text') {
      // Check if user pasted a URL in Raw Text
      const urlPattern = /^https?:\/\/.+/i;
      if (urlPattern.test(content.trim())) {
        setFormatError('This looks like a URL. Please use the "URL" tab for URLs, or paste the article text content here.');
        return false;
      }
      
      // Check minimum length for text
      if (content.trim().length < 50) {
        setFormatError('Please provide at least 50 characters of text to process');
        return false;
      }
    } else if (inputType === 'url' || inputType === 'video') {
      // Validate URL format
      const trimmedContent = content.trim();
      try {
        new URL(trimmedContent);
      } catch {
        setFormatError('Please enter a valid URL (e.g., https://example.com/article)');
        return false;
      }
      
      // Additional validation: ensure it's http/https
      if (!trimmedContent.startsWith('http://') && !trimmedContent.startsWith('https://')) {
        setFormatError('URL must start with http:// or https://');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent duplicate submissions
    if (loading) {
      return;
    }
    
    // Validate content format first
    if (!validateContent()) {
      return;
    }

    setLoading(true);
    setError(null);
    setFormatError(null);
    setResult(null);
    setSubscriptionUrl(null);
    setStreamingTranslation('');
    setStreamingInsights('');
    setCurrentStage('');
    setProgress(0);
    setEstimatedTime(null);
    setTimeRemaining(null);

    // Declare variables outside try block so they're accessible in catch
    let timeoutCheck: NodeJS.Timeout | null = null;
    let isProcessing = true;
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    let fetchTimeoutId: NodeJS.Timeout | null = null;

    try {
      // Add timeout to fetch
      const controller = new AbortController();
      fetchTimeoutId = setTimeout(() => controller.abort(), 15 * 60 * 1000); // 15 min

      const response = await fetch('/api/process-article-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputType,
          content: content.trim(),
          style: voiceProfileId ? undefined : style, // Only send style if no voice profile
          rewritingLevel,
          voiceProfileId: voiceProfileId || undefined,
          targetLanguage: targetLanguage || 'zh',
        }),
        signal: controller.signal,
      });

      if (fetchTimeoutId) {
        clearTimeout(fetchTimeoutId);
        fetchTimeoutId = null;
      }

      if (!response.ok) {
        let errorData: any = null;
        try {
          const text = await response.text();
          try {
            errorData = JSON.parse(text);
          } catch {
            // Malformed JSON - use generic error
            errorData = { code: 'UNKNOWN_ERROR' };
          }
        } catch {
          // Network error or empty response
          errorData = { code: 'NETWORK_ERROR' };
        }
        
        // Always sanitize - never show raw error
        const sanitized = sanitizeError(errorData, 'API Response');
        setError(sanitized);
        setLoading(false);
        return;
      }

      // Handle Server-Sent Events stream
      reader = response.body?.getReader() || null;
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';
      let currentEvent = '';
      let lastUpdateTime = Date.now();
      const TIMEOUT = 15 * 60 * 1000; // 15 minutes timeout

      // Set up timeout check only when actively processing
      timeoutCheck = setInterval(() => {
        // Check timeout using local state, not closure state
        if (!isProcessing) {
          if (timeoutCheck) {
            clearInterval(timeoutCheck);
            timeoutCheck = null;
          }
          return;
        }
        
        if (Date.now() - lastUpdateTime > TIMEOUT) {
          console.error('Stream timeout - no updates for 15 minutes');
          setError({
            code: 'TIMEOUT',
            message: 'Processing took too long',
            userMessage: 'The processing is taking longer than expected. Please try again or use a shorter article.',
            actionable: 'Try a shorter article or check your internet connection',
            statusCode: 408,
          });
          setLoading(false);
          // Cancel reader (fire-and-forget, as setInterval callback can't be async)
          if (reader) {
            reader.cancel().catch((err) => {
              // Reader may already be closed, ignore error
              console.log('Reader cancel error (ignored):', err);
            });
          }
          if (timeoutCheck) {
            clearInterval(timeoutCheck);
            timeoutCheck = null;
          }
        }
      }, 30000); // Check every 30 seconds

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('Stream ended');
          if (timeoutCheck) {
            clearInterval(timeoutCheck);
            timeoutCheck = null;
          }
          break;
        }

        lastUpdateTime = Date.now(); // Update last activity time when we receive data

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          if (!line) continue;
          
          if (line.startsWith('event: ')) {
            currentEvent = line.substring(7).trim();
            continue;
          }
          
          if (line.startsWith('data: ')) {
            try {
              const jsonData = line.substring(6);
              const data = JSON.parse(jsonData);
              
              console.log('SSE Event:', currentEvent, data);
              
              // Handle based on event type
              if (currentEvent === 'status') {
                setCurrentStage(data.message || '');
                if (data.progress !== undefined) {
                  setProgress(data.progress);
                }
              } else if (currentEvent === 'time_estimate') {
                if (data.estimatedSeconds) {
                  setEstimatedTime(data.estimatedSeconds);
                  setTimeRemaining(data.estimatedSeconds);
                }
              } else if (currentEvent === 'translation_chunk') {
                if (data.text) {
                  setStreamingTranslation(data.text);
                  if (data.complete) {
                    setProgress(75);
                  }
                }
              } else if (currentEvent === 'insights_chunk') {
                if (data.text) {
                  setStreamingInsights(data.text);
                  if (data.complete) {
                    setProgress(100);
                  }
                }
              } else if (currentEvent === 'token_error') {
                console.error('Token consumption error:', data);
                // Show warning but don't block the user - article was processed
                setError({
                  code: 'TOKEN_CONSUMPTION_FAILED',
                  message: data.userMessage || 'Token tracking failed',
                  userMessage: data.userMessage || 'Article processed but token usage may not have been updated. Please refresh the page to check your token balance.',
                  actionable: 'Please refresh the page to check your token balance, or contact support if this persists.',
                  statusCode: 500
                });
              } else if (currentEvent === 'complete') {
                console.log('Complete event received:', {
                  hasTranslation: !!data.translation,
                  hasInsights: !!data.insights,
                  articleId: data.articleId,
                  tokensUsed: data.tokensUsed,
                  inputType: inputType
                });
                
                setResult({
                  translation: data.translation,
                  insights: data.insights,
                  requiresSubscription: data.requiresSubscription,
                  style: data.style,
                  articleId: data.articleId,
                });
                
                // Refresh token usage if tokens were used
                if (data.tokensUsed) {
                  console.log('Tokens used:', data.tokensUsed, '- refreshing token usage display');
                  // Trigger a token usage refresh by dispatching an event
                  window.dispatchEvent(new CustomEvent('refreshTokenUsage'));
                }
                setStreamingTranslation('');
                setStreamingInsights('');
                setCurrentStage('');
                setProgress(100);
                setEstimatedTime(null);
                setTimeRemaining(null);
                isProcessing = false; // Mark processing as complete
                if (timeoutCheck) {
                  clearInterval(timeoutCheck);
                  timeoutCheck = null;
                }
                // Cancel reader - stream is complete
                try {
                  await reader.cancel();
                } catch (err) {
                  // Reader may already be closed, ignore error
                }
                
                if (data.articleId) {
                  console.log('Article saved with ID:', data.articleId);
                } else {
                  console.warn('WARNING: Article ID is missing from complete event. Article may not have been saved.');
                }
                
                if (onArticleProcessed) {
                  console.log('Calling onArticleProcessed callback to refresh article history');
                  onArticleProcessed();
                }
              } else if (currentEvent === 'save_error') {
                console.error('❌ [ARTICLE SAVE ERROR] Save failed:', {
                  error: data.error,
                  message: data.message,
                  errorCode: data.errorCode,
                  errorDetails: data.errorDetails,
                  userMessage: data.userMessage
                });
                console.error('❌ Full error details:', data);
                // Show a non-blocking warning to user
                setError({
                  code: 'ARTICLE_SAVE_FAILED',
                  message: data.message || 'Failed to save article',
                  userMessage: data.userMessage || 'Article processed but could not be saved to history. Results are still available.',
                  actionable: 'Check server logs for details. The translation and insights are still displayed below.',
                  statusCode: 500,
                });
                // Don't stop processing - results are still available
              } else if (currentEvent === 'error') {
                // Sanitize all errors - never show backend details
                const sanitized = sanitizeError(data, 'SSE Error Event');
                
                if (sanitized.code === 'SUBSCRIPTION_REQUIRED' && inputType === 'url') {
                  setSubscriptionUrl(content);
                  setError(null);
                } else {
                  setError(sanitized);
                }
                isProcessing = false; // Mark processing as stopped
                setLoading(false);
                setStreamingTranslation('');
                setStreamingInsights('');
                setCurrentStage('');
                setEstimatedTime(null);
                setTimeRemaining(null);
                if (timeoutCheck) {
                  clearInterval(timeoutCheck);
                  timeoutCheck = null;
                }
                // Cancel reader on error
                try {
                  await reader.cancel();
                } catch (err) {
                  // Reader may already be closed, ignore error
                }
                return;
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError, 'Line:', line);
            }
          }
        }
      }

      if (timeoutCheck) {
        clearInterval(timeoutCheck);
        timeoutCheck = null;
      }
      // Cancel reader if still active
      try {
        await reader.cancel();
      } catch (err) {
        // Reader may already be closed, ignore error
      }
      setLoading(false);
    } catch (err: any) {
      // Clear fetch timeout if error occurs
      if (fetchTimeoutId) {
        clearTimeout(fetchTimeoutId);
        fetchTimeoutId = null;
      }

      // Handle abort (timeout)
      if (err.name === 'AbortError') {
        setError({
          code: 'NETWORK_ERROR',
          message: 'Request timeout',
          userMessage: 'The request took too long. Please try again with a shorter article.',
          actionable: 'Try a shorter article or check your connection',
          statusCode: 408,
        });
      } else {
        // All other errors are sanitized - never show backend details
        const sanitized = sanitizeError(err, 'Article Processing');
        setError(sanitized);
      }
      setLoading(false);
      setStreamingTranslation('');
      setStreamingInsights('');
      setCurrentStage('');
      setEstimatedTime(null);
      setTimeRemaining(null);
      // Cleanup on error
      if (timeoutCheck) {
        clearInterval(timeoutCheck);
        timeoutCheck = null;
      }
      try {
        if (reader) await reader.cancel();
      } catch (cancelErr) {
        // Reader may already be closed, ignore error
      }
    }
  };

  const handleContentPasted = (pastedContent: string) => {
    setContent(pastedContent);
    setInputType('text');
    setSubscriptionUrl(null);
    // Auto-submit the form
    const form = document.querySelector('form');
    if (form) {
      form.requestSubmit();
    }
  };

  const handleTextToSpeech = async (text: string, isInsights: boolean = false) => {
    if (!text || text.trim().length === 0) {
      return;
    }

    // Clear any previous TTS errors when starting a new attempt
    if (error?.code === 'TTS_ERROR') {
      setError(null);
    }

    // Stop any currently playing audio
    if (isInsights) {
      if (audioElementInsights) {
        audioElementInsights.pause();
        audioElementInsights.currentTime = 0;
        setIsPlayingInsights(false);
      }
      setTtsLoadingInsights(true);
      setAudioUrlInsights(null);
    } else {
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
        setIsPlaying(false);
      }
      setTtsLoading(true);
      setAudioUrl(null);
    }

    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          language: targetLanguage,
        }),
      });

      if (!response.ok) {
        let errorData: any;
        try {
          const text = await response.text();
          try {
            errorData = JSON.parse(text);
          } catch {
            // If JSON parsing fails, use the raw text
            errorData = { error: text || 'Unknown error', details: text || 'Failed to parse error response' };
          }
        } catch (err) {
          errorData = { error: 'Unknown error', details: 'Failed to read error response' };
        }

        // Handle TTS configuration errors specifically
        if (errorData.error === 'TTS_CONFIG_ERROR') {
          const ttsError: AppError = {
            code: 'TTS_CONFIG_ERROR',
            message: errorData.message || 'Text-to-Speech is not configured',
            userMessage: errorData.message || 'Text-to-Speech is not configured',
            actionable: errorData.actionable || 'Please contact support if this issue persists.',
            statusCode: response.status,
          };
          setError(ttsError);
          if (isInsights) {
            setTtsLoadingInsights(false);
          } else {
            setTtsLoading(false);
          }
          return;
        }

        const errorMessage = errorData.details || errorData.error || errorData.message || 'Failed to generate audio';
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Convert base64 to blob and create audio URL
      const audioBlob = new Blob([
        Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))
      ], { type: data.format === 'mp3' ? 'audio/mpeg' : 'audio/wav' });
      
      const url = URL.createObjectURL(audioBlob);
      
      // Create audio element with controls
      const audio = new Audio(url);
      audio.playbackRate = isInsights ? playbackRateInsights : playbackRate;
      
      if (isInsights) {
        setAudioUrlInsights(url);
        setAudioElementInsights(audio);
      } else {
        setAudioUrl(url);
        setAudioElement(audio);
      }

      // Play audio automatically
      audio.play().then(() => {
        if (isInsights) {
          setIsPlayingInsights(true);
        } else {
          setIsPlaying(true);
        }
      }).catch((err) => {
        console.error('Error playing audio:', err);
      });

      // Handle audio events
      audio.onended = () => {
        if (isInsights) {
          setIsPlayingInsights(false);
          setAudioUrlInsights(null);
          setAudioElementInsights(null);
        } else {
          setIsPlaying(false);
          setAudioUrl(null);
          setAudioElement(null);
        }
        URL.revokeObjectURL(url);
      };

      audio.onpause = () => {
        if (isInsights) {
          setIsPlayingInsights(false);
        } else {
          setIsPlaying(false);
        }
      };

      audio.onplay = () => {
        if (isInsights) {
          setIsPlayingInsights(true);
        } else {
          setIsPlaying(true);
        }
      };
    } catch (error: any) {
      console.error('TTS error:', error);
      setError({
        code: 'TTS_ERROR',
        message: 'Failed to generate audio',
        userMessage: error.message || 'Failed to generate audio. Please check your Google Cloud TTS configuration.',
        actionable: 'Please ensure Google Cloud Text-to-Speech API is enabled and credentials are configured correctly.',
        statusCode: 500,
      });
    } finally {
      if (isInsights) {
        setTtsLoadingInsights(false);
      } else {
        setTtsLoading(false);
      }
    }
  };

  // Helper function to get fact-check status
  // Uses shared results - both translation and insights show the same status
  const getFactCheckStatus = (isLoading: boolean): 'loading' | 'passed' | 'issues' | 'noResults' | null => {
    if (isLoading || factCheckLoading || factCheckLoadingInsights) return 'loading';
    
    // Use shared results (both sections use the same results)
    const results = factCheckResults || factCheckResultsInsights;
    
    if (results === null) return null; // Not checked yet
    if (results.length === 0) return 'noResults';
    
    // Check if any results have negative ratings (FALSE, MIXED, etc.)
    const hasIssues = results.some((result: any) => {
      const rating = result.rating?.toUpperCase() || '';
      return rating === 'FALSE' || rating === 'MIXED' || rating === 'MISLEADING' || rating === 'UNVERIFIED';
    });
    
    return hasIssues ? 'issues' : 'passed';
  };

  const handleFactCheck = async (textOrUrl: string, isInsights: boolean = false, isUrl: boolean = false) => {
    if (!textOrUrl || textOrUrl.trim().length === 0) {
      return;
    }

    if (isInsights) {
      setFactCheckLoadingInsights(true);
      setFactCheckResultsInsights(null);
    } else {
      setFactCheckLoading(true);
      setFactCheckResults(null);
    }

    try {
      // Send URL or text to API - let server handle extraction to avoid CORS issues
      const requestBody = isUrl 
        ? { url: textOrUrl }  // Send URL, server will extract content
        : { text: textOrUrl }; // Send text directly

      const response = await fetch('/api/fact-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Fact check failed');
      }

      const data = await response.json();
      const results = data.results || [];
      
      // Sync results across both translation and insights
      setFactCheckResults(results);
      setFactCheckResultsInsights(results);
    } catch (error) {
      console.error('Fact check error:', error);
      // Sync empty results across both sections
      setFactCheckResults([]);
      setFactCheckResultsInsights([]);
    } finally {
      if (isInsights) {
        setFactCheckLoadingInsights(false);
      } else {
        setFactCheckLoading(false);
      }
    }
  };

  const handlePlayPause = (isInsights: boolean = false) => {
    const audio = isInsights ? audioElementInsights : audioElement;
    if (!audio) return;

    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  };

  const handleReplay = (isInsights: boolean = false) => {
    const audio = isInsights ? audioElementInsights : audioElement;
    if (!audio) return;

    audio.currentTime = 0;
    audio.play();
  };

  const handleSpeedChange = (speed: number, isInsights: boolean = false) => {
    const audio = isInsights ? audioElementInsights : audioElement;
    if (!audio) return;

    audio.playbackRate = speed;
    if (isInsights) {
      setPlaybackRateInsights(speed);
    } else {
      setPlaybackRate(speed);
    }
  };

  return (
    <div>
      {loadingArticle && (
        <div style={{
          padding: 'var(--spacing-md)',
          background: 'var(--color-background-secondary)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--spacing-md)',
          textAlign: 'center',
          color: 'var(--color-text-secondary)'
        }}>
          {t('common.loading')}
        </div>
      )}
      <form onSubmit={handleSubmit} className="card">
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 'var(--spacing-sm)',
          marginBottom: 'var(--spacing-xl)'
        }}>
          <h2 style={{ margin: 0 }}>{t('processor.title')}</h2>
          <Helptip tooltip={t('processor.title.helptip')} />
        </div>
        
        {/* Headline and Sub-headline */}
        <div style={{ 
          marginBottom: 'var(--spacing-lg)'
        }}>
          <h3 style={{ 
            margin: '0 0 var(--spacing-sm) 0', 
            color: 'var(--color-text-primary)',
            fontSize: '1.25rem',
            fontWeight: 600,
            lineHeight: 1.3
          }}>
            {t('processor.headline')}
          </h3>
          <p style={{ 
            margin: 0,
            color: 'var(--color-text-secondary)',
            fontSize: '1rem',
            lineHeight: 1.5,
            opacity: 0.9
          }}>
            {t('processor.subheadline')}
          </p>
        </div>
        
        <div style={{ 
          display: 'flex', 
          gap: 'clamp(var(--spacing-xs), var(--spacing-lg), var(--spacing-lg))', 
          marginBottom: 'var(--spacing-lg)',
          padding: 'clamp(var(--spacing-xs), var(--spacing-md), var(--spacing-md))',
          background: 'var(--color-background-secondary)',
          borderRadius: 'var(--radius-md)',
          flexWrap: 'wrap'
        }}>
          <label style={{ 
            position: 'relative',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            cursor: 'pointer',
            flex: 1,
            padding: 'clamp(var(--spacing-xs), var(--spacing-sm), var(--spacing-sm))',
            borderRadius: 'var(--radius-sm)',
            background: inputType === 'url' ? 'var(--color-primary)' : 'var(--color-background-tertiary)',
            border: inputType === 'url' ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
            color: inputType === 'url' ? 'white' : 'var(--color-text-primary)',
            transition: 'all var(--transition-base)',
            textAlign: 'center',
            minWidth: '80px',
            fontSize: 'clamp(0.8125rem, 0.9375rem, 0.9375rem)',
            opacity: inputType === 'url' ? 1 : 0.9
          }}>
            <input
              type="radio"
              value="url"
              checked={inputType === 'url'}
              onChange={(e) => setInputType(e.target.value as 'url' | 'text' | 'video')}
              style={{ 
                position: 'absolute',
                opacity: 0,
                width: 0,
                height: 0,
                margin: 0,
                cursor: 'pointer'
              }}
            />
            <span style={{ width: '100%', textAlign: 'center' }}>{t('processor.input.url.full')}</span>
          </label>
          <label style={{ 
            position: 'relative',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            cursor: 'pointer',
            flex: 1,
            padding: 'var(--spacing-sm)',
            borderRadius: 'var(--radius-sm)',
            background: inputType === 'text' ? 'var(--color-primary)' : 'var(--color-background-tertiary)',
            border: inputType === 'text' ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
            color: inputType === 'text' ? 'white' : 'var(--color-text-primary)',
            transition: 'all var(--transition-base)',
            textAlign: 'center',
            opacity: inputType === 'text' ? 1 : 0.9
          }}>
            <input
              type="radio"
              value="text"
              checked={inputType === 'text'}
              onChange={(e) => setInputType(e.target.value as 'url' | 'text' | 'video')}
              style={{ 
                position: 'absolute',
                opacity: 0,
                width: 0,
                height: 0,
                margin: 0,
                cursor: 'pointer'
              }}
            />
            <span style={{ width: '100%', textAlign: 'center' }}>{t('processor.input.text')}</span>
          </label>
          <label style={{ 
            position: 'relative',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            cursor: 'pointer',
            flex: 1,
            padding: 'var(--spacing-sm)',
            borderRadius: 'var(--radius-sm)',
            background: inputType === 'video' ? 'var(--color-primary)' : 'var(--color-background-tertiary)',
            border: inputType === 'video' ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
            color: inputType === 'video' ? 'white' : 'var(--color-text-primary)',
            transition: 'all var(--transition-base)',
            textAlign: 'center',
            opacity: inputType === 'video' ? 1 : 0.9
          }}>
            <input
              type="radio"
              value="video"
              checked={inputType === 'video'}
              onChange={(e) => setInputType(e.target.value as 'url' | 'text' | 'video')}
              style={{ 
                position: 'absolute',
                opacity: 0,
                width: 0,
                height: 0,
                margin: 0,
                cursor: 'pointer'
              }}
            />
            <span style={{ width: '100%', textAlign: 'center' }}>{t('processor.input.video')}</span>
          </label>
        </div>

        {inputType === 'url' ? (
          <>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
              <input
                type="url"
                placeholder={t('processor.input.placeholder.url')}
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  // Clear format error when user starts typing
                  if (formatError) {
                    setFormatError(null);
                  }
                }}
                required
                style={{
                  borderColor: formatError ? 'var(--color-error)' : undefined,
                  flex: 1
                }}
              />
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => {
                    if (content && content.trim()) {
                      handleFactCheck(content, false, true);
                    }
                  }}
                  disabled={factCheckLoading || !content || !content.trim()}
                  style={{
                    padding: '0.375rem 0.75rem',
                    background: factCheckLoading || !content || !content.trim() ? 'var(--color-background-tertiary)' : 'var(--color-background-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-text-primary)',
                    cursor: factCheckLoading || !content || !content.trim() ? 'not-allowed' : 'pointer',
                    fontSize: '0.8125rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    opacity: factCheckLoading || !content || !content.trim() ? 0.6 : 1,
                    whiteSpace: 'nowrap'
                  }}
                  title={t('processor.factCheck')}
                >
                  {factCheckLoading ? (
                    <>
                      <span style={{ fontSize: '0.6875rem' }}>⏳</span>
                      {t('processor.factCheck.checking')}
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: '0.75rem' }}>✓</span>
                      {t('processor.factCheck')}
                    </>
                  )}
                </button>
                <Helptip tooltip={t('processor.factCheck.helptip')} />
              </div>
            </div>
            {formatError && (
              <div style={{
                marginTop: 'var(--spacing-xs)',
                fontSize: '0.875rem',
                color: 'var(--color-error)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-xs)'
              }}>
                <span>❌</span>
                <span>{formatError}</span>
              </div>
            )}
          </>
        ) : inputType === 'video' ? (
          <>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
              <input
                type="url"
                placeholder={t('processor.input.placeholder.video')}
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  // Clear format error when user starts typing
                  if (formatError) {
                    setFormatError(null);
                  }
                }}
                required
                style={{
                  borderColor: formatError ? 'var(--color-error)' : undefined,
                  flex: 1
                }}
              />
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => {
                    if (content && content.trim()) {
                      handleFactCheck(content, false, true);
                    }
                  }}
                  disabled={factCheckLoading || !content || !content.trim()}
                  style={{
                    padding: '0.375rem 0.75rem',
                    background: factCheckLoading || !content || !content.trim() ? 'var(--color-background-tertiary)' : 'var(--color-background-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-text-primary)',
                    cursor: factCheckLoading || !content || !content.trim() ? 'not-allowed' : 'pointer',
                    fontSize: '0.8125rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    opacity: factCheckLoading || !content || !content.trim() ? 0.6 : 1,
                    whiteSpace: 'nowrap'
                  }}
                  title={t('processor.factCheck')}
                >
                  {factCheckLoading ? (
                    <>
                      <span style={{ fontSize: '0.6875rem' }}>⏳</span>
                      {t('processor.factCheck.checking')}
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: '0.75rem' }}>✓</span>
                      {t('processor.factCheck')}
                    </>
                  )}
                </button>
                <Helptip tooltip={t('processor.factCheck.helptip')} />
              </div>
            </div>
            {formatError && (
              <div style={{
                marginTop: 'var(--spacing-xs)',
                fontSize: '0.875rem',
                color: 'var(--color-error)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-xs)'
              }}>
                <span>❌</span>
                <span>{formatError}</span>
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              <textarea
                placeholder={t('processor.input.placeholder.text')}
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  // Clear format error when user starts typing
                  if (formatError) {
                    setFormatError(null);
                  }
                }}
                required
                style={{
                  borderColor: formatError ? 'var(--color-error)' : undefined
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (content && content.trim()) {
                        handleFactCheck(content, false, false);
                      }
                    }}
                    disabled={factCheckLoading || !content || !content.trim()}
                    style={{
                      padding: '0.375rem 0.75rem',
                      background: factCheckLoading || !content || !content.trim() ? 'var(--color-background-tertiary)' : 'var(--color-background-secondary)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-text-primary)',
                      cursor: factCheckLoading || !content || !content.trim() ? 'not-allowed' : 'pointer',
                      fontSize: '0.8125rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      opacity: factCheckLoading || !content || !content.trim() ? 0.6 : 1,
                      whiteSpace: 'nowrap'
                    }}
                    title={t('processor.factCheck')}
                  >
                    {factCheckLoading ? (
                      <>
                        <span style={{ fontSize: '0.6875rem' }}>⏳</span>
                        {t('processor.factCheck.checking')}
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: '0.75rem' }}>✓</span>
                        {t('processor.factCheck')}
                      </>
                    )}
                  </button>
                  <Helptip tooltip={t('processor.factCheck.helptip')} />
                </div>
              </div>
            </div>
            {formatError && (
              <div style={{
                marginTop: 'var(--spacing-xs)',
                fontSize: '0.875rem',
                color: 'var(--color-error)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-xs)'
              }}>
                <span>❌</span>
                <span>{formatError}</span>
              </div>
            )}
          </>
        )}

        <div style={{ marginTop: 'var(--spacing-md)' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--spacing-md)',
            marginBottom: 'var(--spacing-sm)'
          }}>
            <label style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-xs)',
              flex: 1,
              fontWeight: 500,
              color: 'var(--color-text-primary)'
            }}>
              {t('processor.style.label')}
              <Helptip tooltip={t('processor.style.helptip')} />
            </label>
            <button
              type="button"
              onClick={() => openSettingsModal('voiceProfile')}
              style={{
                padding: '0.5rem 1rem',
                background: 'var(--color-background-secondary)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all var(--transition-base)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-background-tertiary)';
                e.currentTarget.style.borderColor = 'var(--color-border-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--color-background-secondary)';
                e.currentTarget.style.borderColor = 'var(--color-border)';
              }}
            >
              + {language === 'en' ? 'Add Your Thinking Style' : '添加您的思维风格'}
            </button>
          </div>
          <select
            value={voiceProfileId ? `voice_${voiceProfileId}` : style}
            onChange={(e) => {
              const value = e.target.value;
              if (value.startsWith('voice_')) {
                const profileId = value.replace('voice_', '');
                // Verify profile exists before setting
                const profileExists = voiceProfiles.some(p => p.id === profileId);
                if (profileExists) {
                  setVoiceProfileId(profileId);
                  setStyle(getDefaultStyle()); // Reset to default when using voice profile
                } else {
                  // Profile doesn't exist, reset to default style
                  setVoiceProfileId(null);
                  setStyle(getDefaultStyle());
                  setError({
                    code: 'VOICE_PROFILE_NOT_FOUND',
                    message: 'Selected author profile no longer exists',
                    userMessage: 'The selected author profile was deleted. Please select a different profile.',
                    statusCode: 404,
                  });
                }
              } else {
                setVoiceProfileId(null);
                setStyle(value as StyleArchetype);
              }
            }}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '1rem',
              background: 'var(--color-background)',
              color: 'var(--color-text-primary)',
              cursor: 'pointer'
            }}
          >
            {/* Custom voice profiles always shown first */}
            {voiceProfiles.length > 0 && (
              <optgroup label={language === 'en' ? 'Your Thinking Styles' : '您的思维风格'}>
                {voiceProfiles.map((profile) => (
                  <option key={profile.id} value={`voice_${profile.id}`}>
                    🎤 {profile.name}
                  </option>
                ))}
              </optgroup>
            )}
            {/* Default styles filtered by user preferences */}
            {Object.entries(styleArchetypes)
              .filter(([key]) => {
                // If enabledThinkingStyles is null, show all (default)
                if (enabledThinkingStyles === null) return true;
                // Otherwise, only show enabled styles
                return enabledThinkingStyles.includes(key);
              })
              .map(([key, config]) => (
                <option key={key} value={key}>
                  {language === 'en' ? config.nameEn : config.name}
                </option>
              ))}
          </select>
        </div>

        <div style={{ marginTop: 'var(--spacing-md)' }}>
          <label style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-xs)',
            marginBottom: 'var(--spacing-sm)',
            fontWeight: 500,
            color: 'var(--color-text-primary)'
          }}>
            {t('processor.rewritingLevel.label')}
            <Helptip tooltip={t('processor.rewritingLevel.helptip')} />
          </label>
          <select
            value={rewritingLevel}
            onChange={(e) => setRewritingLevel(e.target.value as RewritingLevel)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '1rem',
              background: 'var(--color-background)',
              color: 'var(--color-text-primary)',
              cursor: 'pointer'
            }}
          >
            <option value="light">{t('processor.rewritingLevel.light')}</option>
            <option value="medium">{t('processor.rewritingLevel.medium')}</option>
            <option value="heavy">{t('processor.rewritingLevel.heavy')}</option>
          </select>
        </div>

        <div style={{ marginTop: 'var(--spacing-md)' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--spacing-sm)',
            marginBottom: 'var(--spacing-sm)'
          }}>
            <label style={{ 
              display: 'block',
              fontWeight: 500,
              color: 'var(--color-text-primary)'
            }}>
              {t('processor.language.label')}
            </label>
            <Helptip tooltip={t('processor.language.helptip')} />
          </div>
          <select
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '1rem',
              background: 'var(--color-background)',
              color: 'var(--color-text-primary)',
              cursor: 'pointer'
            }}
          >
            <option value="zh">{language === 'en' ? 'Simplified Chinese' : '简体中文'}</option>
            <option value="en">English</option>
            <option value="es">Español (Spanish)</option>
            <option value="fr">Français (French)</option>
            <option value="de">Deutsch (German)</option>
            <option value="ja">日本語 (Japanese)</option>
            <option value="ko">한국어 (Korean)</option>
            <option value="pt">Português (Portuguese)</option>
            <option value="it">Italiano (Italian)</option>
            <option value="ru">Русский (Russian)</option>
            <option value="ar">العربية (Arabic)</option>
          </select>
        </div>

        {/* Progress and countdown display */}
        {loading && (
          <div style={{
            marginTop: 'var(--spacing-md)',
            padding: 'var(--spacing-md)',
            background: 'var(--color-background-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)'
          }}>
            {currentStage && (
              <div style={{
                marginBottom: 'var(--spacing-sm)',
                color: 'var(--color-text-primary)',
                fontSize: '0.875rem'
              }}>
                {currentStage}
              </div>
            )}
            {progress > 0 && (
              <div style={{
                width: '100%',
                height: '8px',
                background: 'var(--color-background)',
                borderRadius: '4px',
                overflow: 'hidden',
                marginBottom: 'var(--spacing-sm)'
              }}>
                <div style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'var(--color-primary)',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            )}
            {timeRemaining !== null && timeRemaining > 0 && (
              <div style={{
                color: 'var(--color-text-secondary)',
                fontSize: '0.75rem',
                textAlign: 'center'
              }}>
                Estimated time remaining: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
              </div>
            )}
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading || !!formatError} 
          style={{ 
            marginTop: 'var(--spacing-xl)',
            width: '100%',
            padding: 'var(--spacing-lg) var(--spacing-xl)',
            fontSize: '1.125rem',
            fontWeight: 600,
            background: loading 
              ? 'var(--color-background-secondary)' 
              : 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-lg)',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all var(--transition-base)',
            boxShadow: loading 
              ? 'none' 
              : '0 4px 12px rgba(99, 102, 241, 0.4)',
            opacity: (loading || formatError) ? 0.6 : 1
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.5)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.4)';
            }
          }}
        >
          {loading ? t('processor.processing') : (() => {
            const processKey = `processor.process.${inputType}`;
            return t(processKey) || t('processor.process');
          })()}
        </button>

        {error && (
          <div style={{ 
            marginTop: 'var(--spacing-lg)',
            padding: 'var(--spacing-lg)',
            background: error.code === 'TOKEN_LIMIT_REACHED' || error.code === 'INSUFFICIENT_TOKENS' 
              ? 'rgba(245, 158, 11, 0.1)' 
              : 'rgba(239, 68, 68, 0.1)',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${error.code === 'TOKEN_LIMIT_REACHED' || error.code === 'INSUFFICIENT_TOKENS' 
              ? 'var(--color-warning)' 
              : 'var(--color-error)'}`,
            position: 'relative'
          }}>
            <button
              onClick={() => setError(null)}
              style={{
                position: 'absolute',
                top: 'var(--spacing-md)',
                right: 'var(--spacing-md)',
                background: 'transparent',
                border: 'none',
                color: error.code === 'TOKEN_LIMIT_REACHED' || error.code === 'INSUFFICIENT_TOKENS'
                  ? 'var(--color-warning)'
                  : 'var(--color-error)',
                cursor: 'pointer',
                fontSize: '1.25rem',
                padding: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--radius-sm)',
                transition: 'background var(--transition-base)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
              title="Dismiss"
            >
              ×
            </button>
            <div style={{ 
              marginBottom: 'var(--spacing-md)',
              fontWeight: 500,
              color: error.code === 'TOKEN_LIMIT_REACHED' || error.code === 'INSUFFICIENT_TOKENS'
                ? 'var(--color-warning)'
                : 'var(--color-error)'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 'var(--spacing-sm)',
                marginBottom: 'var(--spacing-sm)',
                paddingRight: '2rem'
              }}>
                <span>{error.code === 'TOKEN_LIMIT_REACHED' || error.code === 'INSUFFICIENT_TOKENS' ? '⚠️' : '❌'}</span>
                <strong>{error.userMessage}</strong>
              </div>
            </div>
            {error.actionable && (
              <div style={{ 
                color: 'var(--color-text-secondary)',
                fontSize: '0.875rem',
                marginBottom: 'var(--spacing-md)'
              }}>
                💡 {error.actionable}
              </div>
            )}
            {(error.code === 'TOKEN_LIMIT_REACHED' || error.code === 'INSUFFICIENT_TOKENS') && (
              <button
                onClick={() => {
                  // Scroll to Paid Plan Benefits section on home page
                  window.location.href = '/#paid-plan';
                }}
                style={{ marginTop: 'var(--spacing-md)' }}
              >
                {t('userhome.upgradeToPaidPlan')}
              </button>
            )}
          </div>
        )}
      </form>

      {subscriptionUrl && (
        <SubscriptionRequired 
          url={subscriptionUrl} 
          onContentPasted={handleContentPasted}
        />
      )}

      {/* Show streaming content or final result */}
      {(streamingTranslation || streamingInsights || result) && (
        <>
          <div className="card" style={{ marginTop: 'var(--spacing-xl)' }}>
            <div style={{ 
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--spacing-lg)',
              paddingBottom: 'var(--spacing-md)',
              borderBottom: '2px solid var(--color-border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', flex: 1 }}>
                <h2 style={{ margin: 0 }}>
                  {t('processor.translation.title')}
                  {streamingTranslation && !result && (
                    <span style={{
                      marginLeft: 'var(--spacing-sm)',
                      fontSize: '0.875rem',
                      color: 'var(--color-text-secondary)',
                      fontWeight: 'normal'
                    }}>
                      {t('processor.translation.generating')}
                    </span>
                  )}
                </h2>
                <button
                  type="button"
                  onClick={() => setTranslationCollapsed(!translationCollapsed)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    background: 'transparent',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-text-primary)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  {translationCollapsed ? t('processor.expand') : t('processor.collapse')}
                  <span style={{ fontSize: '0.75rem' }}>{translationCollapsed ? '▼' : '▲'}</span>
                </button>
              </div>
              {result?.translation && (
                <div ref={translationExportRef} style={{ position: 'relative', display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Fact Check Button with Status Badge */}
                  <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const cleanedTranslation = (result?.translation || streamingTranslation || '').replace(/^#{1,4}\s+/gm, '');
                          handleFactCheck(cleanedTranslation, false, false);
                        }}
                        disabled={factCheckLoading}
                        style={{
                          padding: '0.5rem 1rem',
                          background: factCheckLoading ? 'var(--color-background-tertiary)' : 'var(--color-background-secondary)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--color-text-primary)',
                          cursor: factCheckLoading ? 'not-allowed' : 'pointer',
                          fontSize: '0.875rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          opacity: factCheckLoading ? 0.6 : 1
                        }}
                        title={t('processor.factCheck')}
                      >
                        {factCheckLoading ? (
                          <>
                            <span style={{ fontSize: '0.75rem' }}>⏳</span>
                            {t('processor.factCheck.checking')}
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: '0.875rem' }}>✓</span>
                            {t('processor.factCheck')}
                          </>
                        )}
                      </button>
                      <Helptip tooltip={t('processor.factCheck.helptip')} />
                    </div>
                    {/* Status Badge */}
                    {(() => {
                      const status = getFactCheckStatus(factCheckLoading);
                      if (!status || status === 'loading') return null;
                      
                      const statusConfig = {
                        passed: { icon: '✅', text: t('processor.factCheck.status.passed'), color: 'var(--color-success)', bg: 'rgba(16, 185, 129, 0.1)' },
                        issues: { icon: '⚠️', text: t('processor.factCheck.status.issues'), color: 'var(--color-warning)', bg: 'rgba(245, 158, 11, 0.1)' },
                        noResults: { icon: 'ℹ️', text: t('processor.factCheck.status.noResults'), color: 'var(--color-text-secondary)', bg: 'var(--color-background-tertiary)' }
                      };
                      
                      const config = statusConfig[status];
                      if (!config) return null;
                      
                      return (
                        <div style={{
                          padding: '0.25rem 0.5rem',
                          background: config.bg,
                          border: `1px solid ${config.color}`,
                          borderRadius: 'var(--radius-sm)',
                          color: config.color,
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          whiteSpace: 'nowrap'
                        }}>
                          <span>{config.icon}</span>
                          <span>{config.text}</span>
                        </div>
                      );
                    })()}
                  </div>
                  {!audioUrl ? (
                    <button
                      type="button"
                      onClick={() => handleTextToSpeech(result.translation || streamingTranslation || '', false)}
                      disabled={ttsLoading}
                      style={{
                        padding: '0.5rem 1rem',
                        background: ttsLoading ? 'var(--color-background-tertiary)' : 'var(--color-background-secondary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--color-text-primary)',
                        cursor: ttsLoading ? 'not-allowed' : 'pointer',
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        opacity: ttsLoading ? 0.6 : 1
                      }}
                      title={t('processor.textToSpeech')}
                    >
                      {ttsLoading ? (
                        <>
                          <span style={{ fontSize: '0.75rem' }}>⏳</span>
                          {t('processor.textToSpeech.generating')}
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: '0.875rem' }}>🔊</span>
                          {t('processor.textToSpeech')}
                        </>
                      )}
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center', padding: '0.5rem', background: 'var(--color-background-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                      <button
                        type="button"
                        onClick={() => handlePlayPause(false)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-text-primary)',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title={isPlaying ? 'Pause' : 'Play'}
                      >
                        {isPlaying ? '⏸️' : '▶️'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReplay(false)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-text-primary)',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Replay"
                      >
                        🔄
                      </button>
                      <select
                        value={playbackRate}
                        onChange={(e) => handleSpeedChange(parseFloat(e.target.value), false)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          background: 'var(--color-background)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--color-text-primary)',
                          cursor: 'pointer',
                          fontSize: '0.75rem'
                        }}
                        title="Playback Speed"
                      >
                        <option value="0.5">0.5x</option>
                        <option value="0.75">0.75x</option>
                        <option value="1">1x</option>
                        <option value="1.25">1.25x</option>
                        <option value="1.5">1.5x</option>
                        <option value="2">2x</option>
                      </select>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setTranslationExportOpen(!translationExportOpen)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'var(--color-background-secondary)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-text-primary)',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    {t('processor.download')}
                    <span style={{ fontSize: '0.75rem' }}>▼</span>
                  </button>
                  {translationExportOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '0.5rem',
                      background: 'var(--color-background)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      zIndex: 1000,
                      minWidth: '120px'
                    }}>
                      {(['txt', 'docx', 'pdf', 'md'] as ExportFormat[]).map((format) => (
                        <button
                          key={format}
                          type="button"
                          onClick={() => {
                            const content = result?.translation || streamingTranslation || '';
                            const title = 'Translation';
                            handleExport(content, format, title);
                            setTranslationExportOpen(false);
                          }}
                          style={{
                            display: 'block',
                            width: '100%',
                            padding: '0.75rem 1rem',
                            textAlign: 'left',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-text-primary)',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            transition: 'background var(--transition-base)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--color-background-secondary)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          {format.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {!translationCollapsed && (
              <>
                <div style={{ 
                  whiteSpace: 'pre-wrap', 
                  lineHeight: '1.8',
                  color: 'var(--color-text-primary)',
                  fontSize: '1.0625rem'
                }}>
                  {result?.translation || streamingTranslation || ''}
                </div>
                
                {/* Fact Check Results Display - Shared with Insights */}
                {(factCheckResults !== null || factCheckResultsInsights !== null) && (
                  <div style={{
                    marginTop: 'var(--spacing-lg)',
                    padding: 'var(--spacing-md)',
                    background: 'var(--color-background-secondary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)'
                  }}>
                    <h3 style={{ 
                      margin: '0 0 var(--spacing-md) 0', 
                      fontSize: '0.9375rem',
                      fontWeight: 600,
                      color: 'var(--color-text-primary)'
                    }}>
                      {t('processor.factCheck.results.title')}
                    </h3>
                    {(() => {
                      // Use shared results (both sections show the same results)
                      const sharedResults = factCheckResults || factCheckResultsInsights || [];
                      return sharedResults.length === 0 ? (
                      <div style={{
                        color: 'var(--color-text-secondary)',
                        fontSize: '0.875rem',
                        padding: 'var(--spacing-sm) 0'
                      }}>
                        {t('processor.factCheck.results.noResults')}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        {sharedResults.map((result: any, index: number) => {
                          const rating = result.rating?.toUpperCase() || 'UNKNOWN';
                          const ratingColor = rating === 'TRUE' || rating === 'VERIFIED' 
                            ? 'var(--color-success)'
                            : rating === 'FALSE' || rating === 'MISLEADING'
                            ? 'var(--color-error)'
                            : rating === 'MIXED'
                            ? 'var(--color-warning)'
                            : 'var(--color-text-secondary)';
                          
                          return (
                            <div
                              key={index}
                              style={{
                                padding: 'var(--spacing-md)',
                                background: 'var(--color-background-tertiary)',
                                borderRadius: 'var(--radius-sm)',
                                border: `1px solid var(--color-border)`
                              }}
                            >
                              {result.claim && (
                                <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                                  <strong style={{ color: 'var(--color-text-primary)', fontSize: '0.875rem' }}>
                                    {t('processor.factCheck.results.claim')}:
                                  </strong>
                                  <div style={{ 
                                    color: 'var(--color-text-secondary)', 
                                    fontSize: '0.875rem',
                                    marginTop: '0.25rem',
                                    lineHeight: 1.5
                                  }}>
                                    {result.claim}
                                  </div>
                                </div>
                              )}
                              <div style={{ 
                                display: 'flex', 
                                flexWrap: 'wrap',
                                gap: 'var(--spacing-md)',
                                alignItems: 'center',
                                fontSize: '0.8125rem'
                              }}>
                                {result.rating && (
                                  <div>
                                    <strong style={{ color: 'var(--color-text-primary)' }}>
                                      {t('processor.factCheck.results.rating')}:
                                    </strong>
                                    <span style={{ 
                                      color: ratingColor, 
                                      marginLeft: '0.25rem',
                                      fontWeight: 600
                                    }}>
                                      {result.rating}
                                    </span>
                                  </div>
                                )}
                                {result.publisher && (
                                  <div>
                                    <strong style={{ color: 'var(--color-text-primary)' }}>
                                      {t('processor.factCheck.results.publisher')}:
                                    </strong>
                                    <span style={{ color: 'var(--color-text-secondary)', marginLeft: '0.25rem' }}>
                                      {result.publisher}
                                    </span>
                                  </div>
                                )}
                                {result.date && (
                                  <div>
                                    <strong style={{ color: 'var(--color-text-primary)' }}>
                                      {t('processor.factCheck.results.date')}:
                                    </strong>
                                    <span style={{ color: 'var(--color-text-secondary)', marginLeft: '0.25rem' }}>
                                      {new Date(result.date).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}
                                {result.url && (
                                  <a
                                    href={result.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      color: 'var(--color-primary)',
                                      textDecoration: 'none',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      fontSize: '0.8125rem'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.textDecoration = 'underline';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.textDecoration = 'none';
                                    }}
                                  >
                                    {t('processor.factCheck.results.viewSource')} →
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                    })()}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="card" style={{ marginTop: 'var(--spacing-xl)' }}>
            <div style={{ 
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--spacing-lg)',
              paddingBottom: 'var(--spacing-md)',
              borderBottom: '2px solid var(--color-border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', flex: 1 }}>
                <h2 style={{ margin: 0 }}>
                  {t('processor.insights.title')}
                  {streamingInsights && !result && (
                    <span style={{
                      marginLeft: 'var(--spacing-sm)',
                      fontSize: '0.875rem',
                      color: 'var(--color-text-secondary)',
                      fontWeight: 'normal'
                    }}>
                      {t('processor.insights.generating')}
                    </span>
                  )}
                </h2>
                <button
                  type="button"
                  onClick={() => setInsightsCollapsed(!insightsCollapsed)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    background: 'transparent',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-text-primary)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  {insightsCollapsed ? t('processor.expand') : t('processor.collapse')}
                  <span style={{ fontSize: '0.75rem' }}>{insightsCollapsed ? '▼' : '▲'}</span>
                </button>
              </div>
              {result?.insights && (
                <div ref={insightsExportRef} style={{ position: 'relative', display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Fact Check Button with Status Badge */}
                  <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const cleanedInsights = (result?.insights || streamingInsights || '').replace(/^#{1,4}\s+/gm, '');
                          handleFactCheck(cleanedInsights, true, false);
                        }}
                        disabled={factCheckLoadingInsights}
                        style={{
                          padding: '0.5rem 1rem',
                          background: factCheckLoadingInsights ? 'var(--color-background-tertiary)' : 'var(--color-background-secondary)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--color-text-primary)',
                          cursor: factCheckLoadingInsights ? 'not-allowed' : 'pointer',
                          fontSize: '0.875rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          opacity: factCheckLoadingInsights ? 0.6 : 1
                        }}
                        title={t('processor.factCheck')}
                      >
                        {factCheckLoadingInsights ? (
                          <>
                            <span style={{ fontSize: '0.75rem' }}>⏳</span>
                            {t('processor.factCheck.checking')}
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: '0.875rem' }}>✓</span>
                            {t('processor.factCheck')}
                          </>
                        )}
                      </button>
                      <Helptip tooltip={t('processor.factCheck.helptip')} />
                    </div>
                    {/* Status Badge */}
                    {(() => {
                      const status = getFactCheckStatus(factCheckLoadingInsights);
                      if (!status || status === 'loading') return null;
                      
                      const statusConfig = {
                        passed: { icon: '✅', text: t('processor.factCheck.status.passed'), color: 'var(--color-success)', bg: 'rgba(16, 185, 129, 0.1)' },
                        issues: { icon: '⚠️', text: t('processor.factCheck.status.issues'), color: 'var(--color-warning)', bg: 'rgba(245, 158, 11, 0.1)' },
                        noResults: { icon: 'ℹ️', text: t('processor.factCheck.status.noResults'), color: 'var(--color-text-secondary)', bg: 'var(--color-background-tertiary)' }
                      };
                      
                      const config = statusConfig[status];
                      if (!config) return null;
                      
                      return (
                        <div style={{
                          padding: '0.25rem 0.5rem',
                          background: config.bg,
                          border: `1px solid ${config.color}`,
                          borderRadius: 'var(--radius-sm)',
                          color: config.color,
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          whiteSpace: 'nowrap'
                        }}>
                          <span>{config.icon}</span>
                          <span>{config.text}</span>
                        </div>
                      );
                    })()}
                  </div>
                  {!audioUrlInsights ? (
                    <button
                      type="button"
                      onClick={() => {
                        const cleanedInsights = (result?.insights || streamingInsights || '').replace(/^#{1,4}\s+/gm, '');
                        handleTextToSpeech(cleanedInsights, true);
                      }}
                      disabled={ttsLoadingInsights}
                      style={{
                        padding: '0.5rem 1rem',
                        background: ttsLoadingInsights ? 'var(--color-background-tertiary)' : 'var(--color-background-secondary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--color-text-primary)',
                        cursor: ttsLoadingInsights ? 'not-allowed' : 'pointer',
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        opacity: ttsLoadingInsights ? 0.6 : 1
                      }}
                      title={t('processor.textToSpeech')}
                    >
                      {ttsLoadingInsights ? (
                        <>
                          <span style={{ fontSize: '0.75rem' }}>⏳</span>
                          {t('processor.textToSpeech.generating')}
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: '0.875rem' }}>🔊</span>
                          {t('processor.textToSpeech')}
                        </>
                      )}
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center', padding: '0.5rem', background: 'var(--color-background-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                      <button
                        type="button"
                        onClick={() => handlePlayPause(true)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-text-primary)',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title={isPlayingInsights ? 'Pause' : 'Play'}
                      >
                        {isPlayingInsights ? '⏸️' : '▶️'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReplay(true)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-text-primary)',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Replay"
                      >
                        🔄
                      </button>
                      <select
                        value={playbackRateInsights}
                        onChange={(e) => handleSpeedChange(parseFloat(e.target.value), true)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          background: 'var(--color-background)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--color-text-primary)',
                          cursor: 'pointer',
                          fontSize: '0.75rem'
                        }}
                        title="Playback Speed"
                      >
                        <option value="0.5">0.5x</option>
                        <option value="0.75">0.75x</option>
                        <option value="1">1x</option>
                        <option value="1.25">1.25x</option>
                        <option value="1.5">1.5x</option>
                        <option value="2">2x</option>
                      </select>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setInsightsExportOpen(!insightsExportOpen)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'var(--color-background-secondary)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-text-primary)',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    {t('processor.download')}
                    <span style={{ fontSize: '0.75rem' }}>▼</span>
                  </button>
                  {insightsExportOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '0.5rem',
                      background: 'var(--color-background)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      zIndex: 1000,
                      minWidth: '120px'
                    }}>
                      {(['txt', 'docx', 'pdf', 'md'] as ExportFormat[]).map((format) => (
                        <button
                          key={format}
                          type="button"
                          onClick={() => {
                            const content = (result?.insights || streamingInsights || '').replace(/^#{1,4}\s+/gm, '');
                            const title = 'Insights and Interpretation';
                            handleExport(content, format, title);
                            setInsightsExportOpen(false);
                          }}
                          style={{
                            display: 'block',
                            width: '100%',
                            padding: '0.75rem 1rem',
                            textAlign: 'left',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-text-primary)',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            transition: 'background var(--transition-base)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--color-background-secondary)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          {format.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {!insightsCollapsed && (
              <>
                <div style={{ 
                  whiteSpace: 'pre-wrap', 
                  lineHeight: '1.8',
                  color: 'var(--color-text-primary)',
                  fontSize: '1.0625rem'
                }}>
                  {(result?.insights || streamingInsights || '').replace(/^#{1,4}\s+/gm, '')}
                </div>
                
                {/* Fact Check Results Display - Shared with Translation */}
                {(factCheckResults !== null || factCheckResultsInsights !== null) && (
                  <div style={{
                    marginTop: 'var(--spacing-lg)',
                    padding: 'var(--spacing-md)',
                    background: 'var(--color-background-secondary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)'
                  }}>
                    <h3 style={{ 
                      margin: '0 0 var(--spacing-md) 0', 
                      fontSize: '0.9375rem',
                      fontWeight: 600,
                      color: 'var(--color-text-primary)'
                    }}>
                      {t('processor.factCheck.results.title')}
                    </h3>
                    {(() => {
                      // Use shared results (both sections show the same results)
                      const sharedResults = factCheckResults || factCheckResultsInsights || [];
                      return sharedResults.length === 0 ? (
                        <div style={{
                          color: 'var(--color-text-secondary)',
                          fontSize: '0.875rem',
                          padding: 'var(--spacing-sm) 0'
                        }}>
                          {t('processor.factCheck.results.noResults')}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                          {sharedResults.map((result: any, index: number) => {
                          const rating = result.rating?.toUpperCase() || 'UNKNOWN';
                          const ratingColor = rating === 'TRUE' || rating === 'VERIFIED' 
                            ? 'var(--color-success)'
                            : rating === 'FALSE' || rating === 'MISLEADING'
                            ? 'var(--color-error)'
                            : rating === 'MIXED'
                            ? 'var(--color-warning)'
                            : 'var(--color-text-secondary)';
                          
                          return (
                            <div
                              key={index}
                              style={{
                                padding: 'var(--spacing-md)',
                                background: 'var(--color-background-tertiary)',
                                borderRadius: 'var(--radius-sm)',
                                border: `1px solid var(--color-border)`
                              }}
                            >
                              {result.claim && (
                                <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                                  <strong style={{ color: 'var(--color-text-primary)', fontSize: '0.875rem' }}>
                                    {t('processor.factCheck.results.claim')}:
                                  </strong>
                                  <div style={{ 
                                    color: 'var(--color-text-secondary)', 
                                    fontSize: '0.875rem',
                                    marginTop: '0.25rem',
                                    lineHeight: 1.5
                                  }}>
                                    {result.claim}
                                  </div>
                                </div>
                              )}
                              <div style={{ 
                                display: 'flex', 
                                flexWrap: 'wrap',
                                gap: 'var(--spacing-md)',
                                alignItems: 'center',
                                fontSize: '0.8125rem'
                              }}>
                                {result.rating && (
                                  <div>
                                    <strong style={{ color: 'var(--color-text-primary)' }}>
                                      {t('processor.factCheck.results.rating')}:
                                    </strong>
                                    <span style={{ 
                                      color: ratingColor, 
                                      marginLeft: '0.25rem',
                                      fontWeight: 600
                                    }}>
                                      {result.rating}
                                    </span>
                                  </div>
                                )}
                                {result.publisher && (
                                  <div>
                                    <strong style={{ color: 'var(--color-text-primary)' }}>
                                      {t('processor.factCheck.results.publisher')}:
                                    </strong>
                                    <span style={{ color: 'var(--color-text-secondary)', marginLeft: '0.25rem' }}>
                                      {result.publisher}
                                    </span>
                                  </div>
                                )}
                                {result.date && (
                                  <div>
                                    <strong style={{ color: 'var(--color-text-primary)' }}>
                                      {t('processor.factCheck.results.date')}:
                                    </strong>
                                    <span style={{ color: 'var(--color-text-secondary)', marginLeft: '0.25rem' }}>
                                      {new Date(result.date).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}
                                {result.url && (
                                  <a
                                    href={result.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      color: 'var(--color-primary)',
                                      textDecoration: 'none',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      fontSize: '0.8125rem'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.textDecoration = 'underline';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.textDecoration = 'none';
                                    }}
                                  >
                                    {t('processor.factCheck.results.viewSource')} →
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                    })()}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

