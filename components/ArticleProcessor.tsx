'use client';

import { useState } from 'react';

interface ProcessResult {
  translation: string;
  insights: string;
  requiresSubscription?: boolean;
}

export default function ArticleProcessor() {
  const [inputType, setInputType] = useState<'url' | 'text'>('url');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/process-article', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputType,
          content,
        }),
      });

      // Read response as text first to handle both JSON and HTML responses
      const text = await response.text();
      
      if (!response.ok) {
        // Try to parse as JSON, fallback to text if it fails
        let errorMessage = 'Failed to process article';
        let errorData: any = null;
        try {
          errorData = JSON.parse(text);
          errorMessage = errorData.message || errorData.error || errorMessage;
          
          // Handle token limit error specifically
          if (errorData.upgradeRequired) {
            errorMessage = `${errorMessage}\n\nYou have used ${errorData.tokensUsed?.toLocaleString()} of ${errorData.limit?.toLocaleString()} tokens. Please upgrade to continue.`;
          }
        } catch {
          // If response is HTML (like a redirect page), show a more helpful error
          if (text.includes('<!DOCTYPE') || text.includes('<html')) {
            errorMessage = 'Server returned an error page. Please check if you are authenticated and try again.';
          } else {
            errorMessage = text.substring(0, 200) || errorMessage;
          }
        }
        
        const error = new Error(errorMessage);
        (error as any).upgradeRequired = errorData?.upgradeRequired;
        throw error;
      }

      // Parse the successful JSON response
      const data = JSON.parse(text);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
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

        <button type="submit" disabled={loading}>
          {loading ? 'Processing...' : 'Process Article'}
        </button>

        {error && (
          <div style={{ 
            color: 'var(--color-error)', 
            marginTop: 'var(--spacing-lg)',
            padding: 'var(--spacing-lg)',
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-error)'
          }}>
            <div style={{ marginBottom: 'var(--spacing-md)', fontWeight: 500 }}>
              <strong>Error:</strong> {error}
            </div>
            {(error as any).upgradeRequired && (
              <button
                onClick={() => window.location.href = '/upgrade'}
                style={{ marginTop: 'var(--spacing-md)' }}
              >
                Upgrade to Paid
              </button>
            )}
          </div>
        )}

        {result?.requiresSubscription && (
          <div style={{ 
            color: 'var(--color-warning)', 
            marginTop: 'var(--spacing-lg)',
            padding: 'var(--spacing-md)',
            background: 'rgba(245, 158, 11, 0.1)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-warning)'
          }}>
            ⚠️ This URL appears to require a subscription. Content extraction may be limited.
          </div>
        )}
      </form>

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

