'use client';

import { useState } from 'react';

interface SubscriptionRequiredProps {
  url: string;
  onContentPasted: (content: string) => void;
}

export default function SubscriptionRequired({ url, onContentPasted }: SubscriptionRequiredProps) {
  const [showInstructions, setShowInstructions] = useState(false);
  const [pastedContent, setPastedContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleOpenUrl = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handlePasteContent = async () => {
    if (!pastedContent.trim()) {
      return;
    }
    setIsProcessing(true);
    try {
      onContentPasted(pastedContent);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="card" style={{ 
      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
      border: '2px solid var(--color-primary)',
      marginTop: 'var(--spacing-lg)'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'flex-start', 
        gap: 'var(--spacing-md)',
        marginBottom: 'var(--spacing-lg)'
      }}>
        <div style={{ 
          fontSize: '1.5rem',
          flexShrink: 0
        }}>🔒</div>
        <div style={{ flex: 1 }}>
          <h3 style={{ 
            marginBottom: 'var(--spacing-sm)',
            color: 'var(--color-text-primary)'
          }}>
            Subscription Required
          </h3>
          <p style={{ 
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--spacing-md)'
          }}>
            This article requires a subscription to access. To translate it, you'll need to sign in to the website and copy the article content.
          </p>
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        gap: 'var(--spacing-md)',
        flexWrap: 'wrap',
        marginBottom: 'var(--spacing-lg)'
      }}>
        <button onClick={handleOpenUrl}>
          Open Article in New Tab
        </button>
        <button 
          className="outline" 
          onClick={() => setShowInstructions(!showInstructions)}
        >
          {showInstructions ? 'Hide' : 'Show'} Instructions
        </button>
      </div>

      {showInstructions && (
        <div style={{ 
          background: 'var(--color-background)',
          padding: 'var(--spacing-lg)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--spacing-lg)',
          border: '1px solid var(--color-border)'
        }}>
          <h4 style={{ marginBottom: 'var(--spacing-md)' }}>How to copy the article:</h4>
          <ol style={{ 
            paddingLeft: 'var(--spacing-lg)',
            color: 'var(--color-text-secondary)',
            lineHeight: '1.8'
          }}>
            <li>Click "Open Article in New Tab" above</li>
            <li>Sign in to the website if prompted</li>
            <li>Select all the article text (Ctrl+A or Cmd+A)</li>
            <li>Copy the text (Ctrl+C or Cmd+C)</li>
            <li>Come back here and paste it in the box below</li>
          </ol>
        </div>
      )}

      <div>
        <label style={{ 
          display: 'block',
          marginBottom: 'var(--spacing-sm)',
          fontWeight: 500,
          color: 'var(--color-text-primary)'
        }}>
          Paste Article Content Here:
        </label>
        <textarea
          value={pastedContent}
          onChange={(e) => setPastedContent(e.target.value)}
          placeholder="Paste the article content here after copying it from the website..."
          style={{ 
            minHeight: '200px',
            marginBottom: 'var(--spacing-md)'
          }}
        />
        <button 
          onClick={handlePasteContent}
          disabled={!pastedContent.trim() || isProcessing}
          style={{ width: '100%' }}
        >
          {isProcessing ? 'Processing...' : 'Process Pasted Content'}
        </button>
      </div>
    </div>
  );
}

