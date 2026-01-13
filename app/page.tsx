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
import NarrativeDemo from '@/components/NarrativeDemo';
import { SupportForm } from '@/components/SupportForm';

function HomeContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { isOpen, mode, closeModal } = useAuthModal();
  const { isOpen: isSettingsOpen, closeModal: closeSettings } = useSettingsModal();
  const [showGetStarted, setShowGetStarted] = useState(false);
  const [showSupport, setShowSupport] = useState(false);

  // Handle upgrade success redirect
  useEffect(() => {
    const upgradeSuccess = searchParams?.get('upgrade');
    if (upgradeSuccess === 'success') {
      // Update URL without reload
      window.history.replaceState({}, '', '/');
      // Trigger token usage refresh without full page reload
      window.dispatchEvent(new CustomEvent('refreshTokenUsage'));
      // Also trigger a session refresh
      if (typeof window !== 'undefined' && (window as any).nextAuth) {
        // NextAuth will automatically refresh session on next check
      }
    }
  }, [searchParams]);


  if (status === 'loading') {
    return (
      <div style={{ 
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Navigation skeleton to prevent layout shift */}
        <nav style={{ padding: '0 var(--spacing-xl)' }}>
          <div style={{ 
            maxWidth: '1200px', 
            margin: '0 auto',
            display: 'flex', 
            alignItems: 'center',
            minHeight: '80px'
          }}>
            <div style={{ flex: 1 }}></div>
          </div>
        </nav>
        <div className="container" style={{ 
          paddingTop: '4rem', 
          textAlign: 'center',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ fontSize: '1.25rem', color: 'var(--color-text-secondary)' }}>
            {t('common.loading')}
          </div>
        </div>
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
          <Link href="/" style={{ 
            textDecoration: 'none', 
            color: 'var(--color-text-primary)', 
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <img 
              src="/public.png" 
              alt="Expression Copilot Logo" 
              style={{
                height: '6.5rem',
                width: 'auto',
                objectFit: 'contain'
              }}
            />
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
                {t('auth.logIn')}
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
                {t('auth.getStarted')}
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
                  <h1 style={{ margin: '0 0 12px 0', color: 'var(--color-text-primary)' }}>
                    {t('home.hero.title')}
                  </h1>
                  <p style={{ margin: '0 0 24px 0', color: 'var(--color-text-secondary)', fontSize: '1rem', fontWeight: 400, opacity: 0.8 }}>
                    {t('home.hero.subtitle')}
                  </p>
                  <p style={{ maxWidth: '700px', margin: '0 auto 32px', color: 'var(--color-text-secondary)', fontSize: '1.125rem', lineHeight: 1.6 }}>
                    {t('home.hero.description')}
                  </p>
                  <div className="actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <button
                      onClick={() => setShowGetStarted(true)}
                      style={{
                        padding: 'var(--spacing-lg) var(--spacing-2xl)',
                        background: 'var(--color-background-secondary)',
                        color: 'var(--color-text-primary)',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '1.25rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all var(--transition-base)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '0.9';
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '1';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      {t('auth.getStarted')}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Narrative Demo */}
            <NarrativeDemo />

            {/* How It Works Section */}
            <section className="container" style={{ paddingTop: 'var(--spacing-3xl)', paddingBottom: 'var(--spacing-3xl)' }}>
              <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
                <h2 style={{ marginBottom: 'var(--spacing-xl)', color: 'var(--color-text-primary)', fontSize: '2rem', fontWeight: 700 }}>
                  {t('home.howItWorks.title')}
                </h2>
                <p style={{ 
                  color: 'var(--color-text-secondary)', 
                  fontSize: '1.125rem', 
                  lineHeight: 1.8,
                  whiteSpace: 'pre-line',
                  maxWidth: '800px',
                  margin: '0 auto'
                }}>
                  {t('home.howItWorks.description')}
                </p>
              </div>
            </section>

            {/* Features Section */}
            <section className="container" style={{ paddingTop: 'var(--spacing-3xl)', paddingBottom: 'var(--spacing-3xl)' }} id="features">
              <h2 className="text-center" style={{ marginBottom: 'var(--spacing-2xl)', color: 'var(--color-text-primary)' }}>
                {t('home.features.title')}
              </h2>
              <div className="features">
                <div className="feature-card">
                  <div style={{ 
                    width: '100%', 
                    maxWidth: '400px',
                    height: '300px', 
                    borderRadius: 'var(--radius-lg)', 
                    margin: '0 auto var(--spacing-md)',
                    overflow: 'hidden',
                    background: 'var(--color-background-secondary)',
                    position: 'relative'
                  }}>
                    <video
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      autoPlay
                      muted
                      playsInline
                      onEnded={(e) => {
                        // Pause video when it ends (no loop)
                        e.currentTarget.pause();
                      }}
                    >
                      <source src="/capability-instant-clarity.mp4.mp4" type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                  <h3>{t('home.features.lightning')}</h3>
                  <p>{t('home.features.lightning.desc')}</p>
                </div>
                <div className="feature-card">
                  <div style={{ 
                    width: '100%', 
                    maxWidth: '400px',
                    height: '300px', 
                    borderRadius: 'var(--radius-lg)', 
                    margin: '0 auto var(--spacing-md)',
                    overflow: 'hidden',
                    background: 'var(--color-background-secondary)',
                    position: 'relative'
                  }}>
                    <video
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      autoPlay
                      muted
                      playsInline
                      onEnded={(e) => {
                        // Pause video when it ends (no loop)
                        e.currentTarget.pause();
                      }}
                    >
                      <source src="/capability-context.mp4.mp4" type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                  <h3>{t('home.features.smart')}</h3>
                  <p>{t('home.features.smart.desc')}</p>
                </div>
                <div className="feature-card">
                  <div style={{ 
                    width: '100%', 
                    maxWidth: '400px',
                    height: '300px', 
                    borderRadius: 'var(--radius-lg)', 
                    margin: '0 auto var(--spacing-md)',
                    overflow: 'hidden',
                    background: 'var(--color-background-secondary)',
                    position: 'relative'
                  }}>
                    <video
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      autoPlay
                      muted
                      playsInline
                      onEnded={(e) => {
                        // Pause video when it ends (no loop)
                        e.currentTarget.pause();
                      }}
                    >
                      <source src="/capability-stay-in-control.mp4" type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
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
                    <p style={{ whiteSpace: 'pre-line' }}>{t('home.usecases.researchers.desc')}</p>
                  </div>
                  <div className="feature-card">
                    <h4>{t('home.usecases.writers')}</h4>
                    <p style={{ whiteSpace: 'pre-line' }}>{t('home.usecases.writers.desc')}</p>
                  </div>
                  <div className="feature-card">
                    <h4>{t('home.usecases.business')}</h4>
                    <p style={{ whiteSpace: 'pre-line' }}>{t('home.usecases.business.desc')}</p>
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button
                  onClick={() => setShowGetStarted(true)}
                  style={{
                    padding: 'var(--spacing-lg) var(--spacing-2xl)',
                    background: 'var(--color-background-secondary)',
                    color: 'var(--color-text-primary)',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all var(--transition-base)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.9';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {t('auth.getStarted')}
                </button>
              </div>
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

      {/* Support Form Modal */}
      <SupportForm 
        isOpen={showSupport} 
        onClose={() => setShowSupport(false)}
      />

      {/* Floating Contact Support Button - Only show on landing page (when not logged in) */}
      {!session && (
        <button
          onClick={() => setShowSupport(true)}
          style={{
            position: 'fixed',
            bottom: 'var(--spacing-xl)',
            right: 'var(--spacing-xl)',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: '#000000',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)',
            transition: 'all var(--transition-base)',
            padding: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 0, 0, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)';
          }}
          aria-label={t('support.title')}
        >
          {/* Chat/Speech Bubble Icon */}
          <svg
            width="40"
            height="40"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* White speech bubble with rounded corners */}
            <path
              d="M6 8C6 6.89543 6.89543 6 8 6H16C17.1046 6 18 6.89543 18 8V14C18 15.1046 17.1046 16 16 16H12L8 20V16H8C6.89543 16 6 15.1046 6 14V8Z"
              fill="#FFFFFF"
              fillRule="evenodd"
            />
            {/* Small triangular tail pointing down-right */}
            <path
              d="M16 16L18 20L14 18L16 16Z"
              fill="#FFFFFF"
            />
            {/* Subtle curved smile/underline inside bubble */}
            <path
              d="M9 12C9 12 10 13.5 12 13.5C14 13.5 15 12 15 12"
              stroke="#000000"
              strokeWidth="1.2"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </button>
      )}
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

