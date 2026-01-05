'use client';

import { useSession } from 'next-auth/react';
import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ArticleProcessor from '@/components/ArticleProcessor';
import AuthButtons from '@/components/AuthButtons';
import { UserHomePage } from '@/components/UserHomePage';
import RubiksCube from '@/components/RubiksCube';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { AuthModal } from '@/components/AuthModal';
import { useAuthModal } from '@/contexts/AuthModalContext';
import { SettingsModal } from '@/components/SettingsModal';
import { useSettingsModal } from '@/contexts/SettingsModalContext';
import { LanguageToggle } from '@/components/LanguageToggle';

function HomeContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { isOpen, mode, closeModal } = useAuthModal();
  const { isOpen: isSettingsOpen, closeModal: closeSettings } = useSettingsModal();

  // Handle upgrade success redirect
  useEffect(() => {
    const upgradeSuccess = searchParams?.get('upgrade');
    if (upgradeSuccess === 'success') {
      // Refresh to show updated status
      setTimeout(() => {
        window.history.replaceState({}, '', '/');
        window.location.reload();
      }, 2000);
    }
  }, [searchParams]);

  if (status === 'loading') {
    return (
      <div className="container" style={{ paddingTop: '4rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.25rem', color: 'var(--color-text-secondary)' }}>{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <>
      {/* Navigation */}
      <nav>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{t('nav.title')}</h1>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            <LanguageToggle />
            <AuthButtons session={session} variant="header" />
          </div>
        </div>
      </nav>

      <main>
        {session ? (
          <UserHomePage />
        ) : (
          <>
            {/* Hero Section */}
            <section className="hero">
              <div className="container" style={{ 
                display: 'grid', 
                gridTemplateColumns: '1.1fr 1fr', 
                alignItems: 'center', 
                gap: '40px',
                padding: '48px 64px'
              }}>
                <div className="left">
                  <h1 style={{ margin: '0 0 16px 0' }}>
                    {t('home.hero.title')}
                  </h1>
                  <p style={{ maxWidth: '520px', margin: '0 0 24px 0' }}>
                    {t('home.hero.description')}
                  </p>
                  <div className="actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <AuthButtons session={session} variant="landing" />
                  </div>
                </div>
                <div className="right" style={{ position: 'relative', height: '520px', minHeight: '420px' }}>
                  <RubiksCube />
                </div>
              </div>
            </section>

            {/* Features Section */}
            <section className="container" style={{ paddingTop: 'var(--spacing-3xl)', paddingBottom: 'var(--spacing-3xl)' }}>
              <div className="features">
                <div className="feature-card">
                  <div style={{ 
                    width: '64px', 
                    height: '64px', 
                    borderRadius: 'var(--radius-lg)', 
                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                    margin: '0 auto var(--spacing-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem'
                  }}>
                    ⚡
                  </div>
                  <h3>{t('home.features.lightning')}</h3>
                  <p>{t('home.features.lightning.desc')}</p>
                </div>
                <div className="feature-card">
                  <div style={{ 
                    width: '64px', 
                    height: '64px', 
                    borderRadius: 'var(--radius-lg)', 
                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                    margin: '0 auto var(--spacing-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem'
                  }}>
                    🧠
                  </div>
                  <h3>{t('home.features.smart')}</h3>
                  <p>{t('home.features.smart.desc')}</p>
                </div>
                <div className="feature-card">
                  <div style={{ 
                    width: '64px', 
                    height: '64px', 
                    borderRadius: 'var(--radius-lg)', 
                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                    margin: '0 auto var(--spacing-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem'
                  }}>
                    📊
                  </div>
                  <h3>{t('home.features.tracking')}</h3>
                  <p>{t('home.features.tracking.desc')}</p>
                </div>
              </div>
            </section>

            {/* Use Cases Section */}
            <section style={{ background: 'rgba(11, 11, 16, 0.4)', padding: 'var(--spacing-3xl) 0' }}>
              <div className="container">
                <h2 className="text-center" style={{ marginBottom: 'var(--spacing-2xl)' }}>
                  {t('home.usecases.title')}
                </h2>
                <div className="features">
                  <div className="feature-card">
                    <h4>{t('home.usecases.researchers')}</h4>
                    <p>{t('home.usecases.researchers.desc')}</p>
                  </div>
                  <div className="feature-card">
                    <h4>{t('home.usecases.writers')}</h4>
                    <p>{t('home.usecases.writers.desc')}</p>
                  </div>
                  <div className="feature-card">
                    <h4>{t('home.usecases.business')}</h4>
                    <p>{t('home.usecases.business.desc')}</p>
                  </div>
                  <div className="feature-card">
                    <h4>{t('home.usecases.students')}</h4>
                    <p>{t('home.usecases.students.desc')}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* CTA Section */}
            <section className="container" style={{ paddingTop: 'var(--spacing-3xl)', paddingBottom: 'var(--spacing-3xl)', textAlign: 'center' }}>
              <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>{t('home.cta.title')}</h2>
              <p style={{ fontSize: '1.125rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xl)', maxWidth: '600px', margin: '0 auto var(--spacing-xl)' }}>
                {t('home.cta.description')}
              </p>
              <AuthButtons session={session} variant="default" />
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer style={{ 
        borderTop: '1px solid var(--line)', 
        padding: 'var(--spacing-xl) 0',
        marginTop: 'var(--spacing-3xl)',
        background: 'rgba(11, 11, 16, 0.4)'
      }}>
        <div className="container" style={{ textAlign: 'center', color: 'var(--muted)' }}>
          <p style={{ marginBottom: 'var(--spacing-sm)' }}>{t('footer.copyright')}</p>
          <p style={{ fontSize: '0.875rem' }}>{t('footer.tagline')}</p>
        </div>
      </footer>

      {/* Global Auth Modal - only one instance for all buttons */}
      <AuthModal 
        isOpen={isOpen} 
        onClose={closeModal}
        initialMode={mode}
      />

      {/* Global Settings Modal - only one instance */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={closeSettings}
      />
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="container" style={{ paddingTop: '4rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.25rem', color: 'var(--color-text-secondary)' }}>Loading...</div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}

