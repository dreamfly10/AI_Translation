'use client';

import { useState, useEffect } from 'react';
import { TokenUsage } from '@/components/TokenUsage';
import ArticleProcessor from '@/components/ArticleProcessor';
import { PaidPlanBenefits } from '@/components/PaidPlanBenefits';
import { ArticleHistory } from '@/components/ArticleHistory';
import { SupportForm } from '@/components/SupportForm';
import { LanguageToggle } from '@/components/LanguageToggle';

export function UserHomePage() {
  const [userType, setUserType] = useState<'trial' | 'paid' | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showSupport, setShowSupport] = useState(false);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);

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

  const handleCollapseHistory = () => {
    setIsHistoryCollapsed(prev => !prev);
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
    <div style={{ display: 'flex', height: 'calc(100vh - 80px)', overflow: 'hidden', position: 'relative' }}>
      {/* Expand Button - shown when sidebar is collapsed */}
      {isHistoryCollapsed && (
        <button
          onClick={handleCollapseHistory}
          style={{
            position: 'absolute',
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            padding: '0.5rem 0.25rem',
            background: 'var(--color-background-secondary)',
            border: '1px solid var(--color-border)',
            borderLeft: 'none',
            borderTopRightRadius: 'var(--radius-sm)',
            borderBottomRightRadius: 'var(--radius-sm)',
            color: 'var(--color-text-primary)',
            cursor: 'pointer',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all var(--transition-base)',
            minWidth: '24px',
            height: '48px',
            zIndex: 10,
            boxShadow: '2px 0 4px rgba(0, 0, 0, 0.1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-background-tertiary)';
            e.currentTarget.style.borderColor = 'var(--color-border-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--color-background-secondary)';
            e.currentTarget.style.borderColor = 'var(--color-border)';
          }}
          title="Expand sidebar"
        >
          ▶
        </button>
      )}

      {/* Sidebar - Article History */}
      {!isHistoryCollapsed && (
        <ArticleHistory 
          onSelectArticle={handleArticleSelect} 
          selectedArticleId={selectedArticleId}
          refreshTrigger={refreshTrigger}
          onCollapse={handleCollapseHistory}
        />
      )}

      {/* Main Content */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto',
        padding: 'var(--spacing-xl)',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
            <div style={{ flex: 1 }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
              <LanguageToggle />
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
                Contact Support
              </button>
            </div>
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

