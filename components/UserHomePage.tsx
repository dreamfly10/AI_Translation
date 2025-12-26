'use client';

import { useState, useEffect } from 'react';
import { TokenUsage } from '@/components/TokenUsage';
import ArticleProcessor from '@/components/ArticleProcessor';
import { PaidPlanBenefits } from '@/components/PaidPlanBenefits';
import { ArticleHistory } from '@/components/ArticleHistory';
import { SupportForm } from '@/components/SupportForm';

export function UserHomePage() {
  const [userType, setUserType] = useState<'trial' | 'paid' | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showSupport, setShowSupport] = useState(false);

  useEffect(() => {
    // Fetch user type from token usage API
    const fetchUserType = async () => {
      try {
        const response = await fetch('/api/token-usage');
        if (response.ok) {
          const data = await response.json();
          setUserType(data.userType || 'trial');
        }
      } catch (error) {
        console.error('Error fetching user type:', error);
        // Default to trial if fetch fails
        setUserType('trial');
      } finally {
        setLoading(false);
      }
    };

    fetchUserType();
  }, []);

  const handleArticleSelect = (articleId: string) => {
    setSelectedArticleId(articleId || null);
  };

  const handleArticleProcessed = () => {
    // Refresh article history after new article is processed
    setRefreshTrigger(prev => prev + 1);
    setSelectedArticleId(null); // Clear selection to show new article
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: 'calc(100vh - 80px)' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 80px)', overflow: 'hidden' }}>
      {/* Sidebar - Article History */}
      <ArticleHistory 
        onSelectArticle={handleArticleSelect} 
        selectedArticleId={selectedArticleId}
        refreshTrigger={refreshTrigger}
      />

      {/* Main Content */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto',
        padding: 'var(--spacing-xl)',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
            <div style={{ flex: 1 }}></div>
            <button
              onClick={() => setShowSupport(true)}
              className="outline"
              style={{ 
                fontSize: '0.875rem',
                padding: '0.5rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              💬 Contact Support
            </button>
          </div>
          <TokenUsage />
          <ArticleProcessor 
            selectedArticleId={selectedArticleId}
            onArticleProcessed={handleArticleProcessed}
          />
          {/* Only show PaidPlanBenefits for trial users */}
          {userType === 'trial' && <PaidPlanBenefits />}
        </div>
      </div>
      
      {/* Support Form Modal */}
      <SupportForm isOpen={showSupport} onClose={() => setShowSupport(false)} />
    </div>
  );
}

