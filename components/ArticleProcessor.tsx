'use client';

import { useState } from 'react';
import { parseError, AppError } from '@/lib/error-handler';
import SubscriptionRequired from './SubscriptionRequired';
import { StyleArchetype, styleArchetypes, getDefaultStyle } from '@/lib/prompt-styles';

interface ProcessResult {
  translation: string;
  insights: string;
  requiresSubscription?: boolean;
  style?: StyleArchetype;
}

export default function ArticleProcessor() {
  const [inputType, setInputType] = useState<'url' | 'text'>('url');
  const [content, setContent] = useState('');
  const [style, setStyle] = useState<StyleArchetype>(getDefaultStyle());
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [subscriptionUrl, setSubscriptionUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setSubscriptionUrl(null);

    try {
      const response = await fetch('/api/process-article', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputType,
          content,
          style,
        }),
      });

      // Read response as text first to handle both JSON and HTML responses
      const text = await response.text();
      
      if (!response.ok) {
        let errorData: any = null;
        try {
          errorData = JSON.parse(text);
        } catch {
          // If response is HTML (like a redirect page)
          if (text.includes('<!DOCTYPE') || text.includes('<html')) {
            const parsedError = parseError({ 
              message: 'Server returned an error page. Please check if you are authenticated and try again.',
              error: 'SERVER_ERROR'
            });
            setError(parsedError);
            return;
          } else {
            const parsedError = parseError({ 
              message: text.substring(0, 200) || 'An unexpected error occurred',
              error: 'UNKNOWN_ERROR'
            });
            setError(parsedError);
            return;
          }
        }
        
        // Parse error using error handler
        const parsedError = parseError(errorData);
        
        // Handle subscription required specially
        if (parsedError.code === 'SUBSCRIPTION_REQUIRED' && inputType === 'url') {
          setSubscriptionUrl(content);
          setError(null);
          return;
        }
        
        // Handle authentication errors - redirect to sign in
        if (parsedError.code === 'UNAUTHORIZED' || response.status === 401) {
          parsedError.userMessage = 'Your session has expired. Please sign in again.';
          parsedError.actionable = 'Sign in to continue';
          setError(parsedError);
          // Optionally redirect to sign in after a delay
          setTimeout(() => {
            window.location.href = '/auth/signin?callbackUrl=' + encodeURIComponent(window.location.pathname);
          }, 2000);
          return;
        }
        
        // Add additional context for token errors
        if (parsedError.code === 'TOKEN_LIMIT_REACHED' || parsedError.code === 'INSUFFICIENT_TOKENS') {
          parsedError.userMessage = errorData.message || errorData.userMessage || parsedError.userMessage;
          if (errorData.tokensUsed !== undefined && errorData.limit !== undefined) {
            parsedError.userMessage = `${parsedError.userMessage} (${errorData.tokensUsed.toLocaleString()}/${errorData.limit.toLocaleString()} tokens used)`;
          }
        }
        
        setError(parsedError);
        return;
      }

      // Parse the successful JSON response
      const data = JSON.parse(text);
      
      // Check if subscription is required in the response
      if (data.requiresSubscription && inputType === 'url') {
        setSubscriptionUrl(content);
        setResult(null);
      } else {
        setResult(data);
        setSubscriptionUrl(null);
      }
    } catch (err) {
      const parsedError = parseError(err);
      setError(parsedError);
    } finally {
      setLoading(false);
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

  return (
    <div>
      <form onSubmit={handleSubmit} className="card">
        <h2>Process Article</h2>
        
        <div style={{ 
          display: 'flex', 
          gap: 'var(--spacing-lg)', 
          marginBottom: 'var(--spacing-lg)',
          padding: 'var(--spacing-md)',
          background: 'var(--color-background-secondary)',
          borderRadius: 'var(--radius-md)'
        }}>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--spacing-sm)',
            cursor: 'pointer',
            flex: 1,
            padding: 'var(--spacing-sm)',
            borderRadius: 'var(--radius-sm)',
            background: inputType === 'url' ? 'var(--color-primary)' : 'transparent',
            color: inputType === 'url' ? 'white' : 'var(--color-text-primary)',
            transition: 'all var(--transition-base)'
          }}>
            <input
              type="radio"
              value="url"
              checked={inputType === 'url'}
              onChange={(e) => setInputType(e.target.value as 'url' | 'text')}
              style={{ margin: 0, cursor: 'pointer' }}
            />
            URL
          </label>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--spacing-sm)',
            cursor: 'pointer',
            flex: 1,
            padding: 'var(--spacing-sm)',
            borderRadius: 'var(--radius-sm)',
            background: inputType === 'text' ? 'var(--color-primary)' : 'transparent',
            color: inputType === 'text' ? 'white' : 'var(--color-text-primary)',
            transition: 'all var(--transition-base)'
          }}>
            <input
              type="radio"
              value="text"
              checked={inputType === 'text'}
              onChange={(e) => setInputType(e.target.value as 'url' | 'text')}
              style={{ margin: 0, cursor: 'pointer' }}
            />
            Raw Text
          </label>
        </div>

        {inputType === 'url' ? (
          <input
            type="url"
            placeholder="Enter article URL"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
        ) : (
          <textarea
            placeholder="Paste article text here"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
        )}

        <div style={{ marginTop: 'var(--spacing-md)' }}>
          <label style={{ 
            display: 'block',
            marginBottom: 'var(--spacing-sm)',
            fontWeight: 500,
            color: 'var(--color-text-primary)'
          }}>
            Writing Style (写作风格):
          </label>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value as StyleArchetype)}
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
            {Object.entries(styleArchetypes).map(([key, config]) => (
              <option key={key} value={key}>
                {config.name} - {config.description}
              </option>
            ))}
          </select>
          <p style={{ 
            fontSize: '0.875rem', 
            color: 'var(--color-text-secondary)',
            marginTop: 'var(--spacing-xs)'
          }}>
            {styleArchetypes[style].description}
          </p>
        </div>

        <button type="submit" disabled={loading} style={{ marginTop: 'var(--spacing-md)' }}>
          {loading ? 'Processing...' : 'Process Article'}
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
              : 'var(--color-error)'}`
          }}>
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
                marginBottom: 'var(--spacing-sm)'
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
                onClick={() => window.location.href = '/upgrade'}
                style={{ marginTop: 'var(--spacing-md)' }}
              >
                Upgrade to Paid Plan
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

      {result && (
        <>
          <div className="card" style={{ marginTop: 'var(--spacing-xl)' }}>
            <h2 style={{ 
              marginBottom: 'var(--spacing-lg)',
              paddingBottom: 'var(--spacing-md)',
              borderBottom: '2px solid var(--color-border)'
            }}>
              Translation (中文翻译)
            </h2>
            <div style={{ 
              whiteSpace: 'pre-wrap', 
              lineHeight: '1.8',
              color: 'var(--color-text-primary)',
              fontSize: '1.0625rem'
            }}>
              {result.translation}
            </div>
          </div>

          <div className="card" style={{ marginTop: 'var(--spacing-xl)' }}>
            <h2 style={{ 
              marginBottom: 'var(--spacing-lg)',
              paddingBottom: 'var(--spacing-md)',
              borderBottom: '2px solid var(--color-border)'
            }}>
              Insights & Interpretation (深度解读)
            </h2>
            <div style={{ 
              whiteSpace: 'pre-wrap', 
              lineHeight: '1.8',
              color: 'var(--color-text-primary)',
              fontSize: '1.0625rem'
            }}>
              {result.insights}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

