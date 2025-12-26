'use client';

import { useSession } from 'next-auth/react';
import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ArticleProcessor from '@/components/ArticleProcessor';
import AuthButtons from '@/components/AuthButtons';
import { UserHomePage } from '@/components/UserHomePage';
import Link from 'next/link';

function HomeContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();

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
        <div style={{ fontSize: '1.25rem', color: 'var(--color-text-secondary)' }}>Loading...</div>
      </div>
    );
  }

  return (
    <>
      {/* Navigation */}
      <nav>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>AI Translate</h1>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            <AuthButtons session={session} />
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
              <div className="container">
                <div style={{ fontSize: '1.125rem', color: 'var(--color-primary)', marginBottom: 'var(--spacing-md)', fontWeight: 500 }}>
                  ✨ Intelligent Article Translation & Analysis
                </div>
                <h1 className="text-gradient">
                  Transform Your Content<br />Effortlessly
                </h1>
                <p>
                  Translate articles into Chinese and generate in-depth insights with AI-powered analysis. 
                  Perfect for researchers, content creators, and anyone who needs high-quality translations with contextual understanding.
                </p>
                <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <AuthButtons session={session} />
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
                  <h3>Lightning Fast</h3>
                  <p>Get accurate translations and insights in seconds with our optimized AI processing.</p>
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
                  <h3>Smart Analysis</h3>
                  <p>Receive contextual insights and interpretations that help you understand the deeper meaning behind the content.</p>
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
                  <h3>Usage Tracking</h3>
                  <p>Monitor your token usage and manage your translation needs with transparent tracking.</p>
                </div>
              </div>
            </section>

            {/* Use Cases Section */}
            <section style={{ background: 'var(--color-background-secondary)', padding: 'var(--spacing-3xl) 0' }}>
              <div className="container">
                <h2 className="text-center" style={{ marginBottom: 'var(--spacing-2xl)' }}>
                  Perfect for Every Creator
                </h2>
                <div className="features">
                  <div className="feature-card">
                    <h4>Researchers</h4>
                    <p>Translate academic papers and research articles with accurate terminology preservation.</p>
                  </div>
                  <div className="feature-card">
                    <h4>Content Writers</h4>
                    <p>Understand foreign content and create localized versions with cultural context.</p>
                  </div>
                  <div className="feature-card">
                    <h4>Business Professionals</h4>
                    <p>Analyze international market reports and business documents with AI-powered insights.</p>
                  </div>
                  <div className="feature-card">
                    <h4>Students</h4>
                    <p>Learn from global content with translations that maintain original meaning and structure.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* CTA Section */}
            <section className="container" style={{ paddingTop: 'var(--spacing-3xl)', paddingBottom: 'var(--spacing-3xl)', textAlign: 'center' }}>
              <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>Ready to Transform Your Content?</h2>
              <p style={{ fontSize: '1.125rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xl)', maxWidth: '600px', margin: '0 auto var(--spacing-xl)' }}>
                Join users who are already using AI Translate to understand and analyze content in multiple languages.
              </p>
              <AuthButtons session={session} />
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer style={{ 
        borderTop: '1px solid var(--color-border)', 
        padding: 'var(--spacing-xl) 0',
        marginTop: 'var(--spacing-3xl)',
        background: 'var(--color-background-secondary)'
      }}>
        <div className="container" style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          <p style={{ marginBottom: 'var(--spacing-sm)' }}>© 2025 AI Translate. All rights reserved.</p>
          <p style={{ fontSize: '0.875rem' }}>Transforming content with intelligence and precision.</p>
        </div>
          </footer>
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

