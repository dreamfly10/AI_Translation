'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/contexts/LanguageContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { data: session } = useSession();
  const { t, language } = useLanguage();
  const [activeSection, setActiveSection] = useState<'userInfo' | 'subscription'>('userInfo');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [userType, setUserType] = useState<'trial' | 'paid'>('trial');

  // Fetch user info on mount
  useEffect(() => {
    if (isOpen && session) {
      fetchUserInfo();
      fetchUserType();
    }
  }, [isOpen, session]);

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
      }
    } catch (err) {
      console.error('Error fetching user type:', err);
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
        throw new Error(data.error || 'Failed to create portal session');
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

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '2rem',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: '900px',
          width: '100%',
          maxHeight: 'calc(100vh - 4rem)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'row',
          position: 'relative',
          boxSizing: 'border-box',
          margin: 'auto',
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
          width: '200px',
          minWidth: '200px',
          borderRight: '1px solid var(--color-border)',
          padding: 'var(--spacing-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-sm)',
          background: 'var(--color-background-secondary)',
          flexShrink: 0,
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 2 * var(--spacing-lg))',
          boxSizing: 'border-box',
          height: '100%'
        }}>
          <h3 style={{ margin: '0 0 var(--spacing-md) 0', fontSize: '1rem', fontWeight: 600 }}>
            {language === 'en' ? 'Settings' : '设置'}
          </h3>
          <button
            onClick={() => setActiveSection('userInfo')}
            style={{
              padding: 'var(--spacing-sm) var(--spacing-md)',
              background: activeSection === 'userInfo' ? 'var(--color-primary)' : 'transparent',
              color: activeSection === 'userInfo' ? 'white' : 'var(--color-text-primary)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '0.875rem',
              transition: 'all var(--transition-base)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-sm)'
            }}
          >
            👤 {language === 'en' ? 'User Info' : '用户信息'}
          </button>
          <button
            onClick={() => setActiveSection('subscription')}
            style={{
              padding: 'var(--spacing-sm) var(--spacing-md)',
              background: activeSection === 'subscription' ? 'var(--color-primary)' : 'transparent',
              color: activeSection === 'subscription' ? 'white' : 'var(--color-text-primary)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '0.875rem',
              transition: 'all var(--transition-base)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-sm)'
            }}
          >
            💳 {language === 'en' ? 'Subscription' : '订阅'}
          </button>
        </div>

        {/* Right Content */}
        <div style={{
          flex: 1,
          padding: 'var(--spacing-xl)',
          overflowY: 'auto',
          overflowX: 'hidden',
          minWidth: 0,
          maxHeight: 'calc(100vh - 2 * var(--spacing-lg))',
          boxSizing: 'border-box'
        }}>
          {activeSection === 'userInfo' && (
            <div>
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
                }}>
                  ❌ {error}
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
            <div style={{ minHeight: '400px' }}>
              <h2 style={{ margin: '0 0 var(--spacing-lg) 0' }}>
                {language === 'en' ? 'Subscription' : '订阅'}
              </h2>

              {error && (
                <div style={{
                  padding: 'var(--spacing-md)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: 'var(--color-error)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 'var(--spacing-lg)',
                  border: '1px solid var(--color-error)',
                }}>
                  ❌ {error}
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
                )}

                <button
                  onClick={() => {
                    // TODO: Implement buy more tokens
                    alert(language === 'en' ? 'Buy more tokens feature coming soon!' : '购买更多 tokens 功能即将推出！');
                  }}
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

