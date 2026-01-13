'use client';

import { useState, useEffect } from 'react';
import { TokenUsage } from '@/components/TokenUsage';
import ArticleProcessor from '@/components/ArticleProcessor';
import { PaidPlanBenefits } from '@/components/PaidPlanBenefits';
import { ArticleHistory } from '@/components/ArticleHistory';
import { SupportForm } from '@/components/SupportForm';
import { LanguageToggle } from '@/components/LanguageToggle';
import { AutoSignOut } from '@/components/AutoSignOut';

export function UserHomePage() {
  const [userType, setUserType] = useState<'trial' | 'paid' | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showSupport, setShowSupport] = useState(false);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
  const [showLanguageToggle, setShowLanguageToggle] = useState(true);

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

    // Load user preferences
    const loadPreferences = async () => {
      try {
        const response = await fetch('/api/user-preferences');
        if (response.ok) {
          const data = await response.json();
          setShowLanguageToggle(data.showLanguageToggle !== undefined ? data.showLanguageToggle : true);
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    };

    fetchUserType();
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
      <div style={{ 
        display: 'flex', 
        minHeight: 'calc(100vh - 80px)',
        position: 'relative'
      }}>
        {/* Sidebar skeleton */}
        <div style={{ 
          width: '300px',
          borderRight: '1px solid var(--color-border)',
          background: 'var(--color-background-secondary)'
        }}></div>
        {/* Main content skeleton */}
        <div style={{ 
          flex: 1, 
          padding: 'var(--spacing-xl)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 80px)', position: 'relative' }}>
      {/* Expand Button - shown when sidebar is collapsed */}
      {isHistoryCollapsed && (
        <button
          onClick={handleCollapseHistory}
          style={{
            position: 'fixed',
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            padding: '1rem 0.5rem',
            background: 'var(--color-background-secondary)',
            border: '1px solid var(--color-border)',
            borderLeft: 'none',
            borderTopRightRadius: 'var(--radius-md)',
            borderBottomRightRadius: 'var(--radius-md)',
            color: 'var(--color-text-primary)',
            cursor: 'pointer',
            fontSize: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all var(--transition-base)',
            minWidth: '48px',
            height: '80px',
            zIndex: 1000,
            boxShadow: '2px 0 8px rgba(0, 0, 0, 0.2)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-background-tertiary)';
            e.currentTarget.style.borderColor = 'var(--color-border-hover)';
            e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
            e.currentTarget.style.boxShadow = '2px 0 12px rgba(0, 0, 0, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--color-background-secondary)';
            e.currentTarget.style.borderColor = 'var(--color-border)';
            e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
            e.currentTarget.style.boxShadow = '2px 0 8px rgba(0, 0, 0, 0.2)';
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
        padding: 'var(--spacing-xl)',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
            <div style={{ flex: 1 }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
              {showLanguageToggle && <LanguageToggle />}
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
      
      {/* Auto Sign Out Warning */}
      <AutoSignOut />
    </div>
  );
}

