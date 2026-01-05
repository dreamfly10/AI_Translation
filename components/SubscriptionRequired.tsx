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
    <div className="card mt-6 border-2 border-primary bg-gradient-to-br from-primary/10 to-secondary/10">
      <div className="mb-6 flex items-start gap-4">
        <div className="flex-shrink-0 text-2xl">🔒</div>
        <div className="flex-1">
          <h3 className="mb-2 text-lg font-semibold text-text-primary">
            Subscription Required
          </h3>
          <p className="mb-0 text-sm text-text-secondary">
            This article requires a subscription to access. To translate it, you'll need to sign in to the website and copy the article content.
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={handleOpenUrl}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-hover hover:shadow-md"
        >
          Open Article in New Tab
        </button>
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="rounded-md border border-border bg-transparent px-4 py-2 text-sm font-medium text-text-primary transition-all hover:bg-background-secondary"
        >
          {showInstructions ? 'Hide' : 'Show'} Instructions
        </button>
      </div>

      {showInstructions && (
        <div className="mb-6 rounded-md border border-border bg-background p-6">
          <h4 className="mb-4 text-base font-semibold text-text-primary">How to copy the article:</h4>
          <ol className="list-inside list-decimal space-y-2 pl-4 text-sm leading-relaxed text-text-secondary">
            <li>Click "Open Article in New Tab" above</li>
            <li>Sign in to the website if prompted</li>
            <li>Select all the article text (Ctrl+A or Cmd+A)</li>
            <li>Copy the text (Ctrl+C or Cmd+C)</li>
            <li>Come back here and paste it in the box below</li>
          </ol>
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-medium text-text-primary">
          Paste Article Content Here:
        </label>
        <textarea
          value={pastedContent}
          onChange={(e) => setPastedContent(e.target.value)}
          placeholder="Paste the article content here after copying it from the website..."
          rows={8}
          className="mb-4 w-full rounded-md border border-border bg-background px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y min-h-[200px]"
        />
        <button
          onClick={handlePasteContent}
          disabled={!pastedContent.trim() || isProcessing}
          className="w-full rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-primary-hover hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Processing...' : 'Process Pasted Content'}
        </button>
      </div>
    </div>
  );
}

