'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/contexts/LanguageContext';
import { VoiceProfileModal } from './VoiceProfileModal';
import { useSettingsModal } from '@/contexts/SettingsModalContext';
import { styleArchetypes, styleArchetypeKeys, getAllDefaultStyles } from '@/lib/prompt-styles';
import Link from 'next/link';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { data: session } = useSession();
  const { t, language, setLanguage } = useLanguage();
  const { initialSection } = useSettingsModal();
  const [activeSection, setActiveSection] = useState<'userInfo' | 'subscription' | 'paymentHistory' | 'voiceProfile' | 'preferences'>(initialSection || 'userInfo');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showVoiceProfileModal, setShowVoiceProfileModal] = useState(false);
  const [voiceProfiles, setVoiceProfiles] = useState<any[]>([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [userType, setUserType] = useState<'trial' | 'paid'>('trial');
  const [showTokenPurchase, setShowTokenPurchase] = useState(false);
  const [loadingTokenPurchase, setLoadingTokenPurchase] = useState<string | null>(null);
  const [tokenPrices, setTokenPrices] = useState<{ '10k': string | null; '50k': string | null }>({ '10k': null, '50k': null });
  const [subscriptionStartDate, setSubscriptionStartDate] = useState<Date | null>(null);
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<Date | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'active' | 'expired' | 'cancelled' | null>(null);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);
  const [expandedProfileId, setExpandedProfileId] = useState<string | null>(null);
  const [profileSamples, setProfileSamples] = useState<Record<string, any[]>>({});
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loadingPaymentHistory, setLoadingPaymentHistory] = useState(false);
  const [preferences, setPreferences] = useState({
    defaultWritingStyle: null as string | null,
    enabledThinkingStyles: null as string[] | null,
    defaultExpressionVariation: null as string | null,
    defaultTargetLanguage: 'zh' as string,
    showLanguageToggle: true,
    defaultUILanguage: 'en' as 'en' | 'zh',
  });
  const [previousUILanguage, setPreviousUILanguage] = useState<'en' | 'zh'>('en');
  const [loadingPreferences, setLoadingPreferences] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update active section when initialSection changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialSection) {
        setActiveSection(initialSection);
      } else {
        // Default to userInfo when modal opens without a specific section
        setActiveSection('userInfo');
      }
    } else {
      // Clear error when modal closes
      setError(null);
    }
  }, [initialSection, isOpen]);

  // Clear error when navigating between sections
  useEffect(() => {
    setError(null);
  }, [activeSection]);

  // Fetch user info on mount
  useEffect(() => {
    if (isOpen && session) {
      fetchUserInfo();
      fetchUserType();
      fetchTokenPrices();
      fetchVoiceProfiles();
      fetchIsAdmin();
    }
  }, [isOpen, session]);

  const fetchIsAdmin = async () => {
    try {
      const response = await fetch('/api/admin/me');
      if (response.ok) {
        const data = await response.json();
        setIsAdmin(!!data?.isAdmin);
      }
    } catch (err) {
      setIsAdmin(false);
    }
  };

  // Fetch preferences when preferences section is active
  useEffect(() => {
    if (isOpen && session && activeSection === 'preferences') {
      fetchPreferences();
    }
  }, [isOpen, session, activeSection]);

  // Fetch payment history when paymentHistory section is active
  useEffect(() => {
    if (isOpen && session && activeSection === 'paymentHistory') {
      fetchPaymentHistory();
    }
  }, [isOpen, session, activeSection]);

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

  const fetchProfileSamples = async (profileId: string) => {
    try {
      const response = await fetch(`/api/voice-profiles/${profileId}`);
      if (response.ok) {
        const data = await response.json();
        setProfileSamples(prev => ({
          ...prev,
          [profileId]: data.profile.samples || []
        }));
      }
    } catch (err) {
      console.error('Error fetching profile samples:', err);
    }
  };

  const handleToggleProfile = (profileId: string) => {
    if (expandedProfileId === profileId) {
      setExpandedProfileId(null);
    } else {
      setExpandedProfileId(profileId);
      if (!profileSamples[profileId]) {
        fetchProfileSamples(profileId);
      }
    }
  };

  const handleDeleteSample = async (sampleId: string, profileId: string) => {
    if (!confirm(language === 'en' 
      ? 'Delete this writing sample? The profile must have at least 3 samples.' 
      : '删除此写作样本？配置文件必须至少包含 3 个样本。')) {
      return;
    }

    try {
      const response = await fetch(`/api/voice-samples/${sampleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.error === 'INSUFFICIENT_SAMPLES') {
          alert(language === 'en' 
            ? 'Cannot delete sample. A profile must have at least 3 samples.' 
            : '无法删除样本。配置文件必须至少包含 3 个样本。');
          return;
        }
        throw new Error(data.message || 'Failed to delete sample');
      }

      // Refresh samples and profiles
      fetchProfileSamples(profileId);
      fetchVoiceProfiles();
      // Dispatch event to notify ArticleProcessor
      window.dispatchEvent(new CustomEvent('voiceProfileUpdated'));
    } catch (err) {
      console.error('Error deleting sample:', err);
      alert(language === 'en' 
        ? 'Failed to delete sample. Please try again.' 
        : '删除样本失败。请重试。');
    }
  };

  const fetchPreferences = async () => {
    if (!session?.user?.id) return;
    setLoadingPreferences(true);
    try {
      const response = await fetch('/api/user-preferences');
      if (response.ok) {
        const data = await response.json();
        const fetchedUILanguage = data.defaultUILanguage || 'en';
        setPreferences({
          defaultWritingStyle: data.defaultWritingStyle || null,
          defaultExpressionVariation: data.defaultExpressionVariation || null,
          defaultTargetLanguage: data.defaultTargetLanguage || 'zh',
          showLanguageToggle: data.showLanguageToggle !== undefined ? data.showLanguageToggle : true,
          defaultUILanguage: fetchedUILanguage,
          enabledThinkingStyles: data.enabledThinkingStyles || null,
        });
        setPreviousUILanguage(fetchedUILanguage);
      }
    } catch (err) {
      console.error('Error fetching preferences:', err);
    } finally {
      setLoadingPreferences(false);
    }
  };

  const savePreferences = async () => {
    if (!session?.user?.id) return;
    setSavingPreferences(true);
    setError(null);
    setSuccess(false);
    try {
      // Prepare data: convert empty strings to null, ensure targetLanguage has a value
      const dataToSave = {
        defaultWritingStyle: preferences.defaultWritingStyle || null,
        defaultExpressionVariation: preferences.defaultExpressionVariation || null,
        defaultTargetLanguage: preferences.defaultTargetLanguage || 'zh',
        showLanguageToggle: preferences.showLanguageToggle,
        defaultUILanguage: preferences.defaultUILanguage || 'en',
        enabledThinkingStyles: preferences.enabledThinkingStyles,
      };
      
      const response = await fetch('/api/user-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave),
      });
      if (response.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        
        // If defaultUILanguage changed, update language immediately
        const newUILanguage = preferences.defaultUILanguage || 'en';
        if (newUILanguage !== previousUILanguage) {
          setLanguage(newUILanguage);
          localStorage.setItem('language', newUILanguage);
          setPreviousUILanguage(newUILanguage);
        }
        
        // Dispatch event to notify ArticleProcessor and UserHomePage
        window.dispatchEvent(new CustomEvent('preferencesUpdated'));
      } else {
        const data = await response.json();
        // Show more detailed error message
        let errorMessage = data.message || 'Failed to save preferences';
        if (data.error === 'DATABASE_SCHEMA_ERROR') {
          errorMessage = language === 'en' 
            ? 'Database column missing. Please run the migration script in Supabase SQL Editor: supabase/migrations/add_user_preferences.sql'
            : '数据库列缺失。请在 Supabase SQL 编辑器中运行迁移脚本：supabase/migrations/add_user_preferences.sql';
        } else if (data.details) {
          // Handle both string and array details
          const detailsStr = typeof data.details === 'string' 
            ? data.details 
            : Array.isArray(data.details)
            ? data.details.map((d: any) => typeof d === 'string' ? d : `${d.path || ''}: ${d.message || ''}`).join('; ')
            : String(data.details);
          errorMessage = detailsStr.includes('Invalid preferences data') 
            ? detailsStr 
            : `${errorMessage}: ${detailsStr}`;
        }
        setError(errorMessage);
      }
    } catch (err) {
      console.error('Error saving preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setSavingPreferences(false);
    }
  };

  const fetchPaymentHistory = async () => {
    setLoadingPaymentHistory(true);
    try {
      const response = await fetch('/api/payment-history');
      if (response.ok) {
        const data = await response.json();
        setPaymentHistory(data.invoices || []);
      } else {
        const data = await response.json();
        console.error('Error fetching payment history:', data);
        setPaymentHistory([]);
      }
    } catch (err) {
      console.error('Error fetching payment history:', err);
      setPaymentHistory([]);
    } finally {
      setLoadingPaymentHistory(false);
    }
  };

  const fetchUserInfo = async () => {
    if (!session?.user?.id) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        // Parse name if it exists
        if (data.name) {
          const nameParts = data.name.split(' ');
          setFirstName(nameParts[0] || '');
          setLastName(nameParts.slice(1).join(' ') || '');
        }
      }
    } catch (err) {
      console.error('Error fetching user info:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserType = async () => {
    try {
      const response = await fetch('/api/token-usage');
      if (response.ok) {
        const data = await response.json();
        setUserType(data.userType || 'trial');
        if (data.subscriptionStartDate) {
          setSubscriptionStartDate(new Date(data.subscriptionStartDate));
        }
        if (data.subscriptionExpiresAt) {
          setSubscriptionExpiresAt(new Date(data.subscriptionExpiresAt));
        }
        if (data.subscriptionStatus) {
          setSubscriptionStatus(data.subscriptionStatus);
        }
      }
    } catch (err) {
      console.error('Error fetching user type:', err);
    }
  };

  const fetchTokenPrices = async () => {
    try {
      // Fetch prices from Stripe API
      const response = await fetch('/api/buy-tokens/prices');
      if (response.ok) {
        const data = await response.json();
        setTokenPrices({
          '10k': data.price10k || null,
          '50k': data.price50k || null,
        });
      }
    } catch (err) {
      console.error('Error fetching token prices:', err);
    }
  };

  const handleBuyTokens = async (amount: '10k' | '50k') => {
    setLoadingTokenPurchase(amount);
    setError(null);

    try {
      const response = await fetch('/api/buy-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || data.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to purchase tokens');
      setLoadingTokenPurchase(null);
    }
  };

  const handleSaveUserInfo = async () => {
    if (!session?.user?.id) return;
    
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fullName || null }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update profile');
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        window.location.reload(); // Reload to update session
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upgrade');
    }
  };

  const handleManageBilling = async () => {
    setLoadingBilling(true);
    setError(null);
    try {
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('Portal session error:', data);
        throw new Error(data.message || data.error || 'Failed to create portal session');
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (err) {
      console.error('Error managing billing:', err);
      setError(err instanceof Error ? err.message : 'Failed to open billing portal. Please ensure you have an active subscription.');
    } finally {
      setLoadingBilling(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm(language === 'en' 
      ? 'Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.'
      : '您确定要取消订阅吗？在计费周期结束时，您将失去对高级功能的访问权限。')) {
      return;
    }

    setCancellingSubscription(true);
    setError(null);
    try {
      const response = await fetch('/api/cancel-subscription', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || data.error || 'Failed to cancel subscription');
      }

      // Refresh user data
      await fetchUserType();
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
      setCancellingSubscription(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: isMobile ? 'var(--color-background)' : 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: isMobile ? '0' : '2rem',
        overflowY: 'auto',
      }}
      onClick={isMobile ? undefined : onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: isMobile ? '100%' : '900px',
          width: '100%',
          height: isMobile ? '100vh' : 'calc(100vh - 4rem)',
          maxHeight: isMobile ? '100vh' : 'calc(100vh - 4rem)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          position: 'relative',
          boxSizing: 'border-box',
          margin: 'auto',
          borderRadius: isMobile ? '0' : 'var(--radius-lg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 'var(--spacing-md)',
            right: 'var(--spacing-md)',
            background: 'transparent',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: 'var(--color-text-secondary)',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-sm)',
            transition: 'background var(--transition-base)',
            zIndex: 1
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-background-secondary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          ×
        </button>

        {/* Left Navigation */}
        <div style={{
          width: isMobile ? '100%' : '200px',
          minWidth: isMobile ? 'auto' : '200px',
          borderRight: isMobile ? 'none' : '1px solid var(--color-border)',
          borderBottom: isMobile ? '1px solid var(--color-border)' : 'none',
          padding: 'var(--spacing-lg)',
          display: 'flex',
          flexDirection: isMobile ? 'row' : 'column',
          gap: isMobile ? 'var(--spacing-xs)' : 'var(--spacing-md)',
          background: 'var(--color-background-secondary)',
          flexShrink: 0,
          overflowX: isMobile ? 'auto' : 'visible',
          overflowY: isMobile ? 'visible' : 'auto',
          maxHeight: isMobile ? 'auto' : 'calc(100vh - 4rem)',
          boxSizing: 'border-box',
          height: isMobile ? 'auto' : '100%'
        }}>
          <h3 style={{ margin: '0 0 var(--spacing-md) 0', fontSize: '1rem', fontWeight: 600 }}>
            {language === 'en' ? 'Settings' : '设置'}
          </h3>
          <button
            onClick={() => setActiveSection('userInfo')}
            style={{
              padding: 'var(--spacing-sm) var(--spacing-md)',
              paddingLeft: 'var(--spacing-md)',
              background: activeSection === 'userInfo' ? 'var(--color-primary)' : 'transparent',
              color: activeSection === 'userInfo' ? 'white' : 'var(--color-text-primary)',
              border: activeSection === 'userInfo' ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: 'clamp(0.75rem, 0.875rem, 0.875rem)',
              fontWeight: 600,
              transition: 'all var(--transition-base)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-sm)',
              height: isMobile ? 'auto' : '40px',
              minHeight: isMobile ? '44px' : '40px',
              justifyContent: 'flex-start',
              whiteSpace: isMobile ? 'nowrap' : 'normal'
            }}
          >
            👤 {language === 'en' ? 'User Info' : '用户信息'}
          </button>
          <button
            onClick={() => setActiveSection('subscription')}
            style={{
              padding: 'var(--spacing-sm) var(--spacing-md)',
              paddingLeft: 'var(--spacing-md)',
              background: activeSection === 'subscription' ? 'var(--color-primary)' : 'transparent',
              color: activeSection === 'subscription' ? 'white' : 'var(--color-text-primary)',
              border: activeSection === 'subscription' ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: 'clamp(0.75rem, 0.875rem, 0.875rem)',
              fontWeight: 600,
              transition: 'all var(--transition-base)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-sm)',
              height: isMobile ? 'auto' : '40px',
              minHeight: isMobile ? '44px' : '40px',
              justifyContent: 'flex-start',
              whiteSpace: isMobile ? 'nowrap' : 'normal'
            }}
          >
            💳 {language === 'en' ? 'Subscription' : '订阅'}
          </button>
          <button
            onClick={() => setActiveSection('paymentHistory')}
            style={{
              padding: 'var(--spacing-sm) var(--spacing-md)',
              paddingLeft: 'var(--spacing-md)',
              background: activeSection === 'paymentHistory' ? 'var(--color-primary)' : 'transparent',
              color: activeSection === 'paymentHistory' ? 'white' : 'var(--color-text-primary)',
              border: activeSection === 'paymentHistory' ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '0.875rem',
              fontWeight: 600,
              transition: 'all var(--transition-base)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-sm)',
              whiteSpace: 'nowrap',
              height: '40px',
              minHeight: '40px',
              justifyContent: 'flex-start'
            }}
          >
            📄 {language === 'en' ? 'Payment History' : '付款历史'}
          </button>
          <button
            onClick={() => setActiveSection('voiceProfile')}
            style={{
              padding: 'var(--spacing-sm) var(--spacing-md)',
              paddingLeft: 'var(--spacing-md)',
              background: activeSection === 'voiceProfile' ? 'var(--color-primary)' : 'transparent',
              color: activeSection === 'voiceProfile' ? 'white' : 'var(--color-text-primary)',
              border: activeSection === 'voiceProfile' ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: 'clamp(0.75rem, 0.875rem, 0.875rem)',
              fontWeight: 600,
              transition: 'all var(--transition-base)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-sm)',
              height: isMobile ? 'auto' : '40px',
              minHeight: isMobile ? '44px' : '40px',
              justifyContent: 'flex-start',
              whiteSpace: isMobile ? 'nowrap' : 'normal'
            }}
          >
            🎤 {language === 'en' ? 'Add Your Thinking Style' : '添加您的思维风格'}
          </button>
          <button
            onClick={() => setActiveSection('preferences')}
            style={{
              padding: 'var(--spacing-sm) var(--spacing-md)',
              paddingLeft: 'var(--spacing-md)',
              background: activeSection === 'preferences' ? 'var(--color-primary)' : 'transparent',
              color: activeSection === 'preferences' ? 'white' : 'var(--color-text-primary)',
              border: activeSection === 'preferences' ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: 'clamp(0.75rem, 0.875rem, 0.875rem)',
              fontWeight: 600,
              transition: 'all var(--transition-base)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-sm)',
              height: isMobile ? 'auto' : '40px',
              minHeight: isMobile ? '44px' : '40px',
              justifyContent: 'flex-start',
              whiteSpace: isMobile ? 'nowrap' : 'normal'
            }}
          >
            ⚙️ {language === 'en' ? 'Preferences' : '偏好设置'}
          </button>

          {isAdmin && (
            <Link
              href="/admin"
              style={{
                padding: 'var(--spacing-sm) var(--spacing-md)',
                background: 'transparent',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '0.875rem',
                fontWeight: 600,
                transition: 'all var(--transition-base)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
                whiteSpace: 'nowrap',
                height: '40px',
                minHeight: '40px',
                justifyContent: 'flex-start',
                textDecoration: 'none'
              }}
              onClick={onClose}
              title="Admin"
            >
              🛡️ Admin
            </Link>
          )}
        </div>

        {/* Right Content */}
        <div style={{
          flex: 1,
          padding: 'var(--spacing-xl)',
          overflowY: 'auto',
          overflowX: 'hidden',
          minWidth: 0,
          height: 'calc(100vh - 4rem)',
          maxHeight: 'calc(100vh - 4rem)',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {activeSection === 'userInfo' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <h2 style={{ margin: '0 0 var(--spacing-lg) 0' }}>
                {language === 'en' ? 'User Info' : '用户信息'}
              </h2>
              
              {success && (
                <div style={{
                  padding: 'var(--spacing-md)',
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: 'var(--color-success)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 'var(--spacing-lg)',
                  border: '1px solid var(--color-success)',
                }}>
                  ✅ {language === 'en' ? 'Profile updated successfully!' : '个人资料更新成功！'}
                </div>
              )}

              {error && (
                <div style={{
                  padding: 'var(--spacing-md)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: 'var(--color-error)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 'var(--spacing-lg)',
                  border: '1px solid var(--color-error)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--spacing-md)'
                }}>
                  <span>❌ {error}</span>
                  <button
                    onClick={() => setError(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-error)',
                      cursor: 'pointer',
                      padding: '0.25rem 0.5rem',
                      fontSize: '1.25rem',
                      lineHeight: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 'var(--radius-sm)',
                      transition: 'background var(--transition-base)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                    title={language === 'en' ? 'Dismiss' : '关闭'}
                  >
                    ×
                  </button>
                </div>
              )}

              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{
                  display: 'block',
                  marginBottom: 'var(--spacing-sm)',
                  fontWeight: 500,
                  color: 'var(--color-text-primary)'
                }}>
                  {language === 'en' ? 'Email' : '邮箱'}
                </label>
                <input
                  type="email"
                  value={session?.user?.email || ''}
                  disabled
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '1rem',
                    background: 'var(--color-background-tertiary)',
                    color: 'var(--color-text-secondary)',
                    cursor: 'not-allowed'
                  }}
                />
              </div>

              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{
                  display: 'block',
                  marginBottom: 'var(--spacing-sm)',
                  fontWeight: 500,
                  color: 'var(--color-text-primary)'
                }}>
                  {language === 'en' ? 'First Name' : '名'}
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={language === 'en' ? 'Enter your first name' : '输入您的名'}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '1rem',
                    background: 'var(--color-background)',
                    color: 'var(--color-text-primary)'
                  }}
                />
              </div>

              <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <label style={{
                  display: 'block',
                  marginBottom: 'var(--spacing-sm)',
                  fontWeight: 500,
                  color: 'var(--color-text-primary)'
                }}>
                  {language === 'en' ? 'Last Name' : '姓'}
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={language === 'en' ? 'Enter your last name' : '输入您的姓'}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '1rem',
                    background: 'var(--color-background)',
                    color: 'var(--color-text-primary)'
                  }}
                />
              </div>

              <button
                onClick={handleSaveUserInfo}
                disabled={saving}
                style={{
                  padding: 'var(--spacing-md) var(--spacing-xl)',
                  background: 'var(--color-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '1rem',
                  fontWeight: 500,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1
                }}
              >
                {saving ? (language === 'en' ? 'Saving...' : '保存中...') : (language === 'en' ? 'Save' : '保存')}
              </button>
            </div>
          )}

          {activeSection === 'subscription' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <h2 style={{ margin: '0 0 var(--spacing-lg) 0' }}>
                {language === 'en' ? 'Subscription' : '订阅'}
              </h2>

              {success && (
                <div style={{
                  padding: 'var(--spacing-md)',
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: 'var(--color-success)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 'var(--spacing-lg)',
                  border: '1px solid var(--color-success)',
                }}>
                  ✅ {language === 'en' ? 'Subscription cancelled successfully!' : '订阅已成功取消！'}
                </div>
              )}

              {error && (
                <div style={{
                  padding: 'var(--spacing-md)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: 'var(--color-error)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 'var(--spacing-lg)',
                  border: '1px solid var(--color-error)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--spacing-md)'
                }}>
                  <span>❌ {error}</span>
                  <button
                    onClick={() => setError(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-error)',
                      cursor: 'pointer',
                      padding: '0.25rem 0.5rem',
                      fontSize: '1.25rem',
                      lineHeight: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 'var(--radius-sm)',
                      transition: 'background var(--transition-base)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                    title={language === 'en' ? 'Dismiss' : '关闭'}
                  >
                    ×
                  </button>
                </div>
              )}

              <div style={{
                padding: 'var(--spacing-lg)',
                background: 'var(--color-background-secondary)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--spacing-lg)',
                border: '1px solid var(--color-border)'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 'var(--spacing-md)'
                }}>
                  <div>
                    <h3 style={{ margin: '0 0 var(--spacing-xs) 0' }}>
                      {language === 'en' ? 'Current Plan' : '当前套餐'}
                    </h3>
                    <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                      {userType === 'paid' 
                        ? (language === 'en' ? 'Premium Plan' : '高级套餐')
                        : (language === 'en' ? 'Trial Plan' : '试用套餐')}
                    </p>
                    {userType === 'paid' && subscriptionStartDate && subscriptionExpiresAt && (
                      <p style={{ 
                        margin: 'var(--spacing-xs) 0 0 0', 
                        color: 'var(--color-text-secondary)', 
                        fontSize: '0.75rem' 
                      }}>
                        {subscriptionStartDate.toLocaleDateString('en-US', { 
                          month: '2-digit', 
                          day: '2-digit', 
                          year: 'numeric' 
                        })} - {subscriptionExpiresAt.toLocaleDateString('en-US', { 
                          month: '2-digit', 
                          day: '2-digit', 
                          year: 'numeric' 
                        })}
                      </p>
                    )}
                  </div>
                  <span style={{
                    padding: '0.5rem 1rem',
                    background: userType === 'paid' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    color: userType === 'paid' ? 'var(--color-success)' : 'var(--color-warning)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    border: `1px solid ${userType === 'paid' ? 'var(--color-success)' : 'var(--color-warning)'}`
                  }}>
                    {userType === 'paid' ? 'Paid' : 'Trial'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                {userType === 'trial' && (
                  <button
                    onClick={handleUpgrade}
                    style={{
                      padding: 'var(--spacing-md) var(--spacing-xl)',
                      background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '1rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
                    }}
                  >
                    {language === 'en' ? 'Upgrade to Premium' : '升级到高级套餐'}
                  </button>
                )}

                {userType === 'paid' && (
                  <>
                    <button
                      onClick={handleManageBilling}
                      disabled={loadingBilling}
                      style={{
                        padding: 'var(--spacing-md) var(--spacing-xl)',
                        background: loadingBilling ? 'var(--color-background-tertiary)' : 'var(--color-background-secondary)',
                        color: 'var(--color-text-primary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '1rem',
                        fontWeight: 500,
                        cursor: loadingBilling ? 'not-allowed' : 'pointer',
                        opacity: loadingBilling ? 0.6 : 1
                      }}
                    >
                      {loadingBilling 
                        ? (language === 'en' ? 'Loading...' : '加载中...')
                        : (language === 'en' ? 'Manage Payment Information' : '管理支付信息')}
                    </button>
                    <button
                      onClick={handleCancelSubscription}
                      disabled={cancellingSubscription || subscriptionStatus === 'cancelled'}
                      style={{
                        padding: 'var(--spacing-md) var(--spacing-xl)',
                        background: cancellingSubscription || subscriptionStatus === 'cancelled' 
                          ? 'var(--color-background-tertiary)' 
                          : 'rgba(239, 68, 68, 0.1)',
                        color: cancellingSubscription || subscriptionStatus === 'cancelled'
                          ? 'var(--color-text-tertiary)'
                          : 'var(--color-error)',
                        border: `1px solid ${cancellingSubscription || subscriptionStatus === 'cancelled'
                          ? 'var(--color-border)'
                          : 'var(--color-error)'}`,
                        borderRadius: 'var(--radius-md)',
                        fontSize: '1rem',
                        fontWeight: 500,
                        cursor: cancellingSubscription || subscriptionStatus === 'cancelled' ? 'not-allowed' : 'pointer',
                        opacity: cancellingSubscription || subscriptionStatus === 'cancelled' ? 0.6 : 1
                      }}
                    >
                      {cancellingSubscription 
                        ? (language === 'en' ? 'Cancelling...' : '取消中...')
                        : subscriptionStatus === 'cancelled'
                        ? (language === 'en' ? 'Subscription Cancelled' : '订阅已取消')
                        : (language === 'en' ? 'Cancel Subscription' : '取消订阅')}
                    </button>
                  </>
                )}

                <button
                  onClick={() => setShowTokenPurchase(!showTokenPurchase)}
                  style={{
                    padding: 'var(--spacing-md) var(--spacing-xl)',
                    background: 'var(--color-background-secondary)',
                    color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '1rem',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  {language === 'en' ? 'Buy More Tokens' : '购买更多 Tokens'}
                </button>

                {showTokenPurchase && (
                  <div style={{
                    marginTop: 'var(--spacing-md)',
                    padding: 'var(--spacing-lg)',
                    background: 'var(--color-background-secondary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)'
                  }}>
                    <h3 style={{ margin: '0 0 var(--spacing-md) 0', fontSize: '1.125rem' }}>
                      {language === 'en' ? 'Purchase Tokens' : '购买 Tokens'}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                      <button
                        onClick={() => handleBuyTokens('10k')}
                        disabled={!!loadingTokenPurchase}
                        style={{
                          padding: 'var(--spacing-md) var(--spacing-xl)',
                          background: loadingTokenPurchase === '10k' 
                            ? 'var(--color-background-tertiary)' 
                            : 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                          color: 'white',
                          border: 'none',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '1rem',
                          fontWeight: 500,
                          cursor: loadingTokenPurchase ? 'not-allowed' : 'pointer',
                          opacity: loadingTokenPurchase && loadingTokenPurchase !== '10k' ? 0.6 : 1
                        }}
                      >
                        {loadingTokenPurchase === '10k' 
                          ? (language === 'en' ? 'Loading...' : '加载中...')
                          : `10,000 Tokens${tokenPrices['10k'] ? ` - ${tokenPrices['10k']}` : ''}`}
                      </button>
                      <button
                        onClick={() => handleBuyTokens('50k')}
                        disabled={!!loadingTokenPurchase}
                        style={{
                          padding: 'var(--spacing-md) var(--spacing-xl)',
                          background: loadingTokenPurchase === '50k' 
                            ? 'var(--color-background-tertiary)' 
                            : 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                          color: 'white',
                          border: 'none',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '1rem',
                          fontWeight: 500,
                          cursor: loadingTokenPurchase ? 'not-allowed' : 'pointer',
                          opacity: loadingTokenPurchase && loadingTokenPurchase !== '50k' ? 0.6 : 1
                        }}
                      >
                        {loadingTokenPurchase === '50k' 
                          ? (language === 'en' ? 'Loading...' : '加载中...')
                          : `50,000 Tokens${tokenPrices['50k'] ? ` - ${tokenPrices['50k']}` : ''}`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'paymentHistory' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <h2 style={{ margin: '0 0 var(--spacing-lg) 0' }}>
                {language === 'en' ? 'Payment History' : '付款历史'}
              </h2>
              
              {loadingPaymentHistory ? (
                <div style={{ 
                  padding: 'var(--spacing-xl)', 
                  textAlign: 'center', 
                  color: 'var(--color-text-secondary)'
                }}>
                  {language === 'en' ? 'Loading payment history...' : '加载付款历史中...'}
                </div>
              ) : paymentHistory.length === 0 ? (
                <div style={{
                  padding: 'var(--spacing-xl)',
                  textAlign: 'center',
                  color: 'var(--color-text-secondary)'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: 'var(--spacing-md)', opacity: 0.3 }}>
                    📄
                  </div>
                  <p>{language === 'en' 
                    ? 'No payment history found. Your invoices will appear here once you make a payment.' 
                    : '未找到付款历史。付款后，您的发票将显示在此处。'}</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                  {paymentHistory.map((invoice) => {
                    const invoiceDate = invoice.created ? new Date(invoice.created * 1000) : null;
                    const periodStart = invoice.period_start ? new Date(invoice.period_start * 1000) : null;
                    const periodEnd = invoice.period_end ? new Date(invoice.period_end * 1000) : null;
                    const amount = invoice.amount_paid ? (invoice.amount_paid / 100).toFixed(2) : '0.00';
                    const currency = invoice.currency?.toUpperCase() || 'USD';
                    
                    return (
                      <div
                        key={invoice.id}
                        style={{
                          padding: 'var(--spacing-md)',
                          background: 'var(--color-background-secondary)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--color-border)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-sm)' }}>
                          <div>
                            <h3 style={{ margin: '0 0 var(--spacing-xs) 0', color: 'var(--color-text-primary)' }}>
                              {invoice.description || (language === 'en' ? 'Subscription Payment' : '订阅付款')}
                            </h3>
                            {invoice.invoice_pdf && (
                              <a
                                href={invoice.invoice_pdf}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  fontSize: '0.875rem',
                                  color: 'var(--color-primary)',
                                  textDecoration: 'none',
                                  marginTop: 'var(--spacing-xs)',
                                  display: 'inline-block'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.textDecoration = 'underline';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.textDecoration = 'none';
                                }}
                              >
                                {language === 'en' ? 'Download Invoice' : '下载发票'} ↗
                              </a>
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ 
                              fontSize: '1.125rem', 
                              fontWeight: 600, 
                              color: 'var(--color-text-primary)',
                              marginBottom: 'var(--spacing-xs)'
                            }}>
                              {currency} ${amount}
                            </div>
                            <div style={{ 
                              fontSize: '0.875rem', 
                              color: invoice.status === 'paid' ? 'var(--color-success)' : 'var(--color-text-secondary)'
                            }}>
                              {invoice.status === 'paid' 
                                ? (language === 'en' ? 'Paid' : '已付款')
                                : invoice.status === 'open'
                                ? (language === 'en' ? 'Pending' : '待付款')
                                : invoice.status === 'void'
                                ? (language === 'en' ? 'Void' : '已作废')
                                : invoice.status || ''}
                            </div>
                          </div>
                        </div>
                        
                        {periodStart && periodEnd && periodStart.getTime() !== periodEnd.getTime() && (
                          <div style={{ 
                            marginTop: 'var(--spacing-sm)',
                            paddingTop: 'var(--spacing-sm)',
                            borderTop: '1px solid var(--color-border)',
                            fontSize: '0.875rem',
                            color: 'var(--color-text-secondary)'
                          }}>
                            <strong style={{ color: 'var(--color-text-primary)' }}>
                              {language === 'en' ? 'Period: ' : '期间：'}
                            </strong>
                            {periodStart.toLocaleDateString('en-US', { 
                              month: '2-digit', 
                              day: '2-digit', 
                              year: 'numeric' 
                            })} - {periodEnd.toLocaleDateString('en-US', { 
                              month: '2-digit', 
                              day: '2-digit', 
                              year: 'numeric' 
                            })}
                          </div>
                        )}
                        
                        {invoiceDate && (
                          <div style={{ 
                            marginTop: 'var(--spacing-xs)',
                            fontSize: '0.875rem',
                            color: 'var(--color-text-tertiary)'
                          }}>
                            {language === 'en' ? 'Date: ' : '日期：'}
                            {invoiceDate.toLocaleDateString('en-US', { 
                              month: '2-digit', 
                              day: '2-digit', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeSection === 'voiceProfile' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <h2 style={{ margin: '0 0 var(--spacing-lg) 0' }}>
                {language === 'en' ? 'Add Your Thinking Style' : '添加您的思维风格'}
              </h2>
              
              <div style={{
                padding: 'var(--spacing-md)',
                background: 'var(--color-background-secondary)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--spacing-lg)',
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.6,
                whiteSpace: 'pre-line'
              }}>
                {language === 'en'
                  ? `Teach Expression Copilot how you prefer ideas to be explained and written.

By uploading a few short writing samples, you help the system learn:

1. how direct or nuanced you like explanations to be
2. how structured or conversational your writing feels
3. how critical, neutral, or interpretive your tone is

Expression Copilot then uses this as a reference style when generating insights and interpretations — so the output sounds closer to how you would explain it.`
                  : `教 Expression Copilot 如何按照您偏好的方式解释和写作。

通过上传几个简短的写作样本，您可以帮助系统学习：

1. 您喜欢直接还是细致的解释
2. 您的写作风格是结构化还是对话式
3. 您的语调是批判性、中性还是解释性

Expression Copilot 然后将其用作生成见解和解释时的参考风格 — 使输出更接近您的表达方式。`}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--spacing-lg)' }}>
                <button
                  onClick={() => setShowVoiceProfileModal(true)}
                  style={{
                    padding: 'var(--spacing-md) var(--spacing-xl)',
                    background: 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '1rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  {language === 'en' ? 'Add Your Style' : '添加您的风格'}
                </button>
              </div>

              {voiceProfiles.length === 0 ? (
                <div style={{
                  padding: 'var(--spacing-xl)',
                  textAlign: 'center',
                  color: 'var(--color-text-secondary)'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: 'var(--spacing-md)', opacity: 0.3 }}>
                    🎤
                  </div>
                  <p>{language === 'en' ? 'No profiles yet. Create one to get started!' : '还没有配置文件。创建一个开始吧！'}</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                  {voiceProfiles.map((profile) => (
                    <div
                      key={profile.id}
                      style={{
                        padding: 'var(--spacing-md)',
                        background: 'var(--color-background-secondary)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => handleToggleProfile(profile.id)}>
                          <h3 style={{ margin: '0 0 var(--spacing-xs) 0', color: 'var(--color-text-primary)' }}>
                            {profile.name}
                          </h3>
                          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                            {language === 'en' 
                              ? `${profile.sampleCount || 0} samples`
                              : `${profile.sampleCount || 0} 个样本`}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                          <button
                            onClick={() => handleToggleProfile(profile.id)}
                            style={{
                              padding: 'var(--spacing-xs) var(--spacing-sm)',
                              background: 'transparent',
                              border: '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--color-text-primary)',
                              cursor: 'pointer',
                              fontSize: '0.875rem'
                            }}
                          >
                            {expandedProfileId === profile.id 
                              ? (language === 'en' ? 'Hide' : '隐藏')
                              : (language === 'en' ? 'View Samples' : '查看样本')}
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(language === 'en' ? 'Delete this voice profile?' : '删除此语音配置文件？')) {
                                try {
                                  const response = await fetch(`/api/voice-profiles/${profile.id}`, {
                                    method: 'DELETE',
                                  });
                                  if (response.ok) {
                                    fetchVoiceProfiles();
                                    // Dispatch event to notify ArticleProcessor
                                    window.dispatchEvent(new CustomEvent('voiceProfileUpdated'));
                                  }
                                } catch (err) {
                                  console.error('Error deleting voice profile:', err);
                                }
                              }
                            }}
                            style={{
                              padding: 'var(--spacing-xs) var(--spacing-sm)',
                              background: 'transparent',
                              border: '1px solid var(--color-error)',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--color-error)',
                              cursor: 'pointer',
                              fontSize: '0.875rem'
                            }}
                          >
                            {language === 'en' ? 'Delete' : '删除'}
                          </button>
                        </div>
                      </div>
                      
                      {expandedProfileId === profile.id && (
                        <div style={{ 
                          marginTop: 'var(--spacing-md)', 
                          paddingTop: 'var(--spacing-md)',
                          borderTop: '1px solid var(--color-border)'
                        }}>
                          {profileSamples[profile.id] ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                              {profileSamples[profile.id].map((sample: any, index: number) => (
                                <div
                                  key={sample.id}
                                  style={{
                                    padding: 'var(--spacing-sm) var(--spacing-md)',
                                    background: 'var(--color-background)',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--color-border)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                  }}
                                >
                                  <div style={{ flex: 1 }}>
                                    <div style={{ 
                                      fontSize: '0.875rem', 
                                      fontWeight: 500, 
                                      color: 'var(--color-text-primary)',
                                      marginBottom: 'var(--spacing-xs)'
                                    }}>
                                      {language === 'en' ? `Sample ${index + 1}` : `样本 ${index + 1}`}
                                    </div>
                                    <div style={{ 
                                      fontSize: '0.75rem', 
                                      color: 'var(--color-text-secondary)',
                                      marginBottom: 'var(--spacing-xs)'
                                    }}>
                                      {sample.content.substring(0, 150)}...
                                    </div>
                                    <div style={{ 
                                      fontSize: '0.75rem', 
                                      color: 'var(--color-text-tertiary)'
                                    }}>
                                      {sample.wordCount || 0} {language === 'en' ? 'words' : '字'}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteSample(sample.id, profile.id)}
                                    style={{
                                      padding: 'var(--spacing-xs) var(--spacing-sm)',
                                      background: 'transparent',
                                      border: '1px solid var(--color-error)',
                                      borderRadius: 'var(--radius-sm)',
                                      color: 'var(--color-error)',
                                      cursor: 'pointer',
                                      fontSize: '0.75rem',
                                      marginLeft: 'var(--spacing-sm)'
                                    }}
                                  >
                                    {language === 'en' ? 'Delete' : '删除'}
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ 
                              padding: 'var(--spacing-md)', 
                              textAlign: 'center', 
                              color: 'var(--color-text-secondary)',
                              fontSize: '0.875rem'
                            }}>
                              {language === 'en' ? 'Loading samples...' : '加载样本中...'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSection === 'preferences' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <h2 style={{ margin: '0 0 var(--spacing-lg) 0' }}>
                {language === 'en' ? 'Preferences' : '偏好设置'}
              </h2>
              <p style={{ margin: '0 0 var(--spacing-lg) 0', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                {language === 'en' 
                  ? 'Set your default preferences for writing style, expression variation, language selection, and UI display options.'
                  : '设置您的默认偏好：写作风格、表达变化、语言选择和界面显示选项。'}
              </p>

              {loadingPreferences ? (
                <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--color-text-secondary)' }}>
                  {language === 'en' ? 'Loading preferences...' : '正在加载偏好设置...'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                  {/* Writing Style */}
                  <div>
                    <label style={{ 
                      display: 'block',
                      marginBottom: 'var(--spacing-sm)',
                      fontWeight: 500,
                      color: 'var(--color-text-primary)'
                    }}>
                      {language === 'en' ? 'Default Writing Style' : '默认写作风格'}
                    </label>
                    <select
                      value={preferences.defaultWritingStyle || ''}
                      onChange={(e) => setPreferences({ ...preferences, defaultWritingStyle: e.target.value || null })}
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
                      <option value="">{language === 'en' ? 'None (use default)' : '无（使用默认）'}</option>
                      <option value="warmBookish">{language === 'en' ? 'Empathetic Thinking' : '共情思维'}</option>
                      <option value="lifeReflection">{language === 'en' ? 'Reflective Thinking' : '反思思维'}</option>
                      <option value="contrarian">{language === 'en' ? 'Critical Thinking' : '批判思维'}</option>
                      <option value="education">{language === 'en' ? 'Methodical Thinking' : '方法思维'}</option>
                      <option value="science">{language === 'en' ? 'Scientific Thinking' : '科学思维'}</option>
                    </select>
                  </div>

                  {/* Expression Variation */}
                  <div>
                    <label style={{ 
                      display: 'block',
                      marginBottom: 'var(--spacing-sm)',
                      fontWeight: 500,
                      color: 'var(--color-text-primary)'
                    }}>
                      {language === 'en' ? 'Default Expression Variation' : '默认表达变化'}
                    </label>
                    <select
                      value={preferences.defaultExpressionVariation || ''}
                      onChange={(e) => setPreferences({ ...preferences, defaultExpressionVariation: e.target.value || null })}
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
                      <option value="">{language === 'en' ? 'None (use default)' : '无（使用默认）'}</option>
                      <option value="light">{language === 'en' ? 'Light' : '轻微'}</option>
                      <option value="medium">{language === 'en' ? 'Medium' : '中等'}</option>
                      <option value="heavy">{language === 'en' ? 'Heavy' : '重度'}</option>
                    </select>
                  </div>

                  {/* Language Selection */}
                  <div>
                    <label style={{ 
                      display: 'block',
                      marginBottom: 'var(--spacing-sm)',
                      fontWeight: 500,
                      color: 'var(--color-text-primary)'
                    }}>
                      {language === 'en' ? 'Default Target Language' : '默认目标语言'}
                    </label>
                    <select
                      value={preferences.defaultTargetLanguage}
                      onChange={(e) => setPreferences({ ...preferences, defaultTargetLanguage: e.target.value })}
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
                      <option value="zh">简体中文 (Simplified Chinese)</option>
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

                  {/* Show Language Toggle */}
                  <div>
                    <label style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-sm)',
                      cursor: 'pointer',
                      fontWeight: 500,
                      color: 'var(--color-text-primary)'
                    }}>
                      <input
                        type="checkbox"
                        checked={preferences.showLanguageToggle}
                        onChange={(e) => setPreferences({ ...preferences, showLanguageToggle: e.target.checked })}
                        style={{
                          width: '1.25rem',
                          height: '1.25rem',
                          cursor: 'pointer'
                        }}
                      />
                      <span>{language === 'en' ? 'Show Language Toggle in User Homepage' : '在用户主页显示语言切换'}</span>
                    </label>
                  </div>

                  {/* Default UI Language */}
                  {preferences.showLanguageToggle && (
                    <div>
                      <label style={{ 
                        display: 'block',
                        marginBottom: 'var(--spacing-sm)',
                        fontWeight: 500,
                        color: 'var(--color-text-primary)'
                      }}>
                        {language === 'en' ? 'Default UI Language' : '默认界面语言'}
                      </label>
                      <select
                        value={preferences.defaultUILanguage}
                        onChange={(e) => setPreferences({ ...preferences, defaultUILanguage: e.target.value as 'en' | 'zh' })}
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
                        <option value="en">English</option>
                        <option value="zh">中文 (Chinese)</option>
                      </select>
                      <p style={{ 
                        marginTop: 'var(--spacing-xs)', 
                        fontSize: '0.75rem', 
                        color: 'var(--color-text-secondary)' 
                      }}>
                        {language === 'en' 
                          ? 'This will be the default language when you first open the app' 
                          : '这将是您首次打开应用时的默认语言'}
                      </p>
                    </div>
                  )}

                  {/* Enabled Thinking Styles */}
                  <div style={{ marginTop: 'var(--spacing-lg)' }}>
                    <label style={{ 
                      display: 'block',
                      marginBottom: 'var(--spacing-md)',
                      fontWeight: 600,
                      color: 'var(--color-text-primary)',
                      fontSize: '1.1rem'
                    }}>
                      {language === 'en' ? 'Show Thinking Styles in Dropdown' : '在下拉菜单中显示的思维风格'}
                    </label>
                    <p style={{ 
                      marginBottom: 'var(--spacing-md)', 
                      fontSize: '0.875rem', 
                      color: 'var(--color-text-secondary)' 
                    }}>
                      {language === 'en' 
                        ? 'Toggle which default thinking styles appear in the dropdown. Your custom styles will always appear at the top.' 
                        : '切换哪些默认思维风格出现在下拉菜单中。您的自定义风格将始终显示在顶部。'}
                    </p>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--spacing-sm)',
                      padding: 'var(--spacing-md)',
                      background: 'var(--color-background-secondary)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)'
                    }}>
                      {styleArchetypeKeys.map((key) => {
                        const config = styleArchetypes[key];
                        const enabledStyles = preferences.enabledThinkingStyles || getAllDefaultStyles();
                        const isEnabled = enabledStyles.includes(key);
                        
                        return (
                          <label
                            key={key}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 'var(--spacing-sm)',
                              cursor: 'pointer',
                              padding: 'var(--spacing-sm)',
                              borderRadius: 'var(--radius-sm)',
                              transition: 'background var(--transition-base)'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'var(--color-background-tertiary)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={(e) => {
                                const currentEnabled = preferences.enabledThinkingStyles || getAllDefaultStyles();
                                const newEnabled = e.target.checked
                                  ? [...currentEnabled, key]
                                  : currentEnabled.filter((k) => k !== key);
                                setPreferences({
                                  ...preferences,
                                  enabledThinkingStyles: newEnabled.length === styleArchetypeKeys.length ? null : newEnabled
                                });
                              }}
                              style={{
                                width: '18px',
                                height: '18px',
                                cursor: 'pointer',
                                accentColor: 'var(--color-primary)'
                              }}
                            />
                            <span style={{ 
                              color: 'var(--color-text-primary)',
                              fontSize: '0.9375rem'
                            }}>
                              {language === 'en' ? config.nameEn : config.name}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Save Button */}
                  <div style={{ marginTop: 'var(--spacing-md)' }}>
                    <button
                      onClick={savePreferences}
                      disabled={savingPreferences}
                      style={{
                        padding: 'var(--spacing-md) var(--spacing-xl)',
                        background: savingPreferences ? 'var(--color-background-tertiary)' : 'var(--color-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '1rem',
                        fontWeight: 500,
                        cursor: savingPreferences ? 'not-allowed' : 'pointer',
                        opacity: savingPreferences ? 0.6 : 1,
                        transition: 'all var(--transition-base)'
                      }}
                    >
                      {savingPreferences 
                        ? (language === 'en' ? 'Saving...' : '保存中...')
                        : (language === 'en' ? 'Save Preferences' : '保存偏好设置')}
                    </button>
                  </div>

                  {success && (
                    <div style={{
                      padding: 'var(--spacing-md)',
                      background: 'var(--color-success)',
                      color: 'white',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.875rem'
                    }}>
                      {language === 'en' ? '✅ Preferences saved successfully!' : '✅ 偏好设置已保存！'}
                    </div>
                  )}

                  {error && (
                    <div style={{
                      padding: 'var(--spacing-md)',
                      background: 'var(--color-error)',
                      color: 'white',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 'var(--spacing-md)'
                    }}>
                      <span>{error}</span>
                      <button
                        onClick={() => setError(null)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer',
                          padding: '0.25rem 0.5rem',
                          fontSize: '1.25rem',
                          lineHeight: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 'var(--radius-sm)',
                          transition: 'background var(--transition-base)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                        title={language === 'en' ? 'Dismiss' : '关闭'}
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Voice Profile Modal */}
      <VoiceProfileModal
        isOpen={showVoiceProfileModal}
        onClose={() => setShowVoiceProfileModal(false)}
        onProfileCreated={() => {
          fetchVoiceProfiles();
          setShowVoiceProfileModal(false);
        }}
      />
    </div>
  );
}

