'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
        className="outline"
        title={language === 'en' ? 'Switch to Chinese / 切换到中文' : 'Switch to English / 切换到英文'}
        style={{ 
          fontSize: '0.875rem',
          padding: '0.5rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          minWidth: '100px',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all var(--transition-base)',
          position: 'relative'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--color-background-secondary)';
          e.currentTarget.style.borderColor = 'var(--color-border-hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = 'var(--color-border)';
        }}
      >
        <span style={{ fontSize: '1rem' }}>{language === 'en' ? '🇺🇸' : '🇨🇳'}</span>
        <span>{language === 'en' ? 'English' : '中文'}</span>
        <span style={{ fontSize: '0.75rem', opacity: 0.7, marginLeft: '0.25rem' }}>⇄</span>
      </button>
    </div>
  );
}

