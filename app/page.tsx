'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ArticleProcessor from '@/components/ArticleProcessor';
import AuthButtons from '@/components/AuthButtons';
import { UserHomePage } from '@/components/UserHomePage';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { AuthModal } from '@/components/AuthModal';
import { useAuthModal } from '@/contexts/AuthModalContext';
import { SettingsModal } from '@/components/SettingsModal';
import { useSettingsModal } from '@/contexts/SettingsModalContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { GetStartedModal } from '@/components/GetStartedModal';

function HomeContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { isOpen, mode, closeModal } = useAuthModal();
  const { isOpen: isSettingsOpen, closeModal: closeSettings } = useSettingsModal();
  const [showGetStarted, setShowGetStarted] = useState(false);

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
      <nav style={{ padding: '0 var(--spacing-xl)' }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto',
          display: 'flex', 
          alignItems: 'center' 
        }}>
          <Link href="/" style={{ textDecoration: 'none', color: 'var(--color-text-primary)', flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: '2.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{t('nav.title')}</h1>
          </Link>
          {!session && (
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
              <div style={{ transform: 'scale(0.85)', transformOrigin: 'center' }}>
                <LanguageToggle />
              </div>
              <button 
                className="outline"
                onClick={() => window.location.href = '/auth/signin'}
                style={{
                  fontSize: '1rem',
                  padding: 'var(--spacing-md) var(--spacing-xl)',
                  fontWeight: 500,
                  background: 'transparent',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)'
                }}
              >
                Log In
              </button>
              <button 
                onClick={() => setShowGetStarted(true)}
                style={{
                  fontSize: '1rem',
                  padding: 'var(--spacing-md) var(--spacing-xl)',
                  background: 'var(--color-background-secondary)',
                  color: 'var(--color-text-primary)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                Get Started
              </button>
            </div>
          )}
          {session && <AuthButtons session={session} variant="header" />}
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
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '40px',
                padding: '24px 64px 48px 64px'
              }}>
                {/* Video at the top */}
                <div className="right" style={{ 
                  position: 'relative', 
                  width: '100%',
                  maxWidth: '1000px',
                  height: '600px', 
                  minHeight: '500px', 
                  overflow: 'hidden'
                }}>
                  <video
                    className="hero-video"
                    autoPlay
                    muted
                    playsInline
                    onEnded={(e) => {
                      // Restart video when it ends to create seamless loop
                      e.currentTarget.currentTime = 0;
                      e.currentTarget.play();
                    }}
                  >
                    <source src="/hero-video.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
                
                {/* Text content below video */}
                <div className="left" style={{ textAlign: 'center', maxWidth: '800px' }}>
                  <h1 style={{ margin: '0 0 24px 0', color: 'var(--color-text-primary)' }}>
                    {t('home.hero.title')}
                  </h1>
                  <p style={{ maxWidth: '520px', margin: '0 auto 32px', color: 'var(--color-text-secondary)', fontSize: '1.125rem', lineHeight: 1.6 }}>
                    {t('home.hero.description')}
                  </p>
                  <div className="actions" style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center' }}>
                    <button
                      onClick={() => setShowGetStarted(true)}
                      style={{
                        padding: 'var(--spacing-md) var(--spacing-xl)',
                        background: 'var(--color-background-secondary)',
                        color: 'var(--color-text-primary)',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '1rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all var(--transition-base)'
                      }}
                    >
                      Get Started
                    </button>
                    <a
                      href="#features"
                      style={{
                        padding: 'var(--spacing-md) var(--spacing-xl)',
                        fontSize: '1rem',
                        fontWeight: 500,
                        color: 'var(--color-text-primary)',
                        textDecoration: 'none',
                        transition: 'opacity var(--transition-base)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '0.7';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '1';
                      }}
                    >
                      View Demo
                    </a>
                  </div>
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
            <section style={{ padding: 'var(--spacing-3xl) 0' }}>
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
              <h2 style={{ marginBottom: 'var(--spacing-lg)', color: 'var(--color-text-primary)' }}>{t('home.cta.title')}</h2>
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
        borderTop: '1px solid var(--color-border)', 
        padding: 'var(--spacing-xl) 0',
        marginTop: 'var(--spacing-3xl)',
      }}>
        <div className="container" style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
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

      {/* Get Started Modal */}
      <GetStartedModal 
        isOpen={showGetStarted} 
        onClose={() => setShowGetStarted(false)}
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

