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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if mobile on mount and resize
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // On mobile, collapse sidebar by default
      if (window.innerWidth < 768) {
        setIsHistoryCollapsed(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
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
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('preferencesUpdated', handlePreferencesUpdate);
    };
  }, []);


  const handleArticleProcessed = () => {
    // Refresh article history after new article is processed
    setRefreshTrigger(prev => prev + 1);
    setSelectedArticleId(null); // Clear selection to show new article
  };

  const handleCollapseHistory = () => {
    setIsHistoryCollapsed(prev => !prev);
  };

  const handleArticleSelect = (articleId: string) => {
    setSelectedArticleId(articleId || null);
    // On mobile, close drawer after selecting article
    if (isMobile) {
      setIsHistoryCollapsed(true);
    }
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
      {/* Mobile: Hamburger menu button */}
      {isMobile && isHistoryCollapsed && (
        <button
          onClick={handleCollapseHistory}
          style={{
            position: 'fixed',
            top: '90px',
            left: 'var(--spacing-md)',
            padding: '0.75rem',
            background: 'var(--color-background-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-primary)',
            cursor: 'pointer',
            fontSize: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all var(--transition-base)',
            width: '44px',
            height: '44px',
            zIndex: 1001,
            boxShadow: 'var(--shadow-md)'
          }}
          aria-label="Open menu"
        >
          ☰
        </button>
      )}

      {/* Desktop: Expand Button - shown when sidebar is collapsed */}
      {!isMobile && isHistoryCollapsed && (
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

      {/* Mobile: Overlay backdrop when drawer is open */}
      {isMobile && !isHistoryCollapsed && (
        <div
          onClick={handleCollapseHistory}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
            transition: 'opacity var(--transition-base)'
          }}
        />
      )}

      {/* Sidebar - Article History */}
      {!isHistoryCollapsed && (
        <div
          style={{
            ...(isMobile ? {
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: '85%',
              maxWidth: '320px',
              zIndex: 1000,
              transform: 'translateX(0)',
              transition: 'transform var(--transition-base)',
              boxShadow: '2px 0 12px rgba(0, 0, 0, 0.3)'
            } : {})
          }}
        >
          <ArticleHistory 
            onSelectArticle={handleArticleSelect} 
            selectedArticleId={selectedArticleId}
            refreshTrigger={refreshTrigger}
            onCollapse={handleCollapseHistory}
          />
        </div>
      )}

      {/* Main Content */}
      <div style={{ 
        flex: 1, 
        padding: isMobile ? 'var(--spacing-md)' : 'var(--spacing-xl)',
        width: isMobile && !isHistoryCollapsed ? '100%' : 'auto',
        transition: 'padding var(--transition-base)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: 'var(--spacing-md)',
            flexWrap: 'wrap',
            gap: 'var(--spacing-sm)'
          }}>
            <div style={{ flex: 1 }}></div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 'var(--spacing-sm)',
              flexWrap: 'wrap'
            }}>
              {showLanguageToggle && <LanguageToggle />}
              <button
                onClick={() => setShowSupport(true)}
                className="outline"
                style={{ 
                  fontSize: isMobile ? '0.8125rem' : '0.875rem',
                  padding: isMobile ? '0.5rem 0.75rem' : '0.5rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {isMobile ? 'Support' : 'Contact Support'}
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

