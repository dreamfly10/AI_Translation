'use client';

import { useEffect, useState, useRef } from 'react';
import { styleArchetypes, StyleArchetype } from '@/lib/prompt-styles';
import { useLanguage } from '@/contexts/LanguageContext';

interface Article {
  id: string;
  title: string;
  createdAt: string;
  inputType: 'url' | 'text' | 'video';
  sourceUrl?: string;
  style?: string;
}

// Helper to format style display
function formatStyleDisplay(styleKey?: string): string | null {
  if (!styleKey) return null;
  const style = styleArchetypes[styleKey as StyleArchetype];
  if (!style) return styleKey;
  return `${style.nameEn} (${style.name})`;
}

interface ArticleHistoryProps {
  onSelectArticle: (articleId: string) => void;
  selectedArticleId?: string | null;
  refreshTrigger?: number;
  onCollapse?: () => void;
}

export function ArticleHistory({ onSelectArticle, selectedArticleId, refreshTrigger, onCollapse }: ArticleHistoryProps) {
  const { t, language } = useLanguage();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalArticles, setTotalArticles] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const fetchArticles = async (page: number = 1, append: boolean = false) => {
    try {
      console.log('[ARTICLE HISTORY] Fetching articles, page:', page, 'append:', append, 'refreshTrigger:', refreshTrigger);
      
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      
      setError(null);
      const response = await fetch(`/api/articles?limit=10&page=${page}`);
      const data = await response.json();
      
      console.log('[ARTICLE HISTORY] Fetch response:', {
        ok: response.ok,
        error: data.error,
        articleCount: data.articles?.length || 0,
        articles: data.articles?.map((a: any) => ({
          id: a.id,
          title: a.title?.substring(0, 30),
          inputType: a.inputType,
          createdAt: a.createdAt
        }))
      });
      
      // Check for specific error types
      if (data.error === 'DATABASE_UNAVAILABLE') {
        setError('DATABASE_UNAVAILABLE');
        if (!append) {
          setArticles([]);
        }
        return;
      }
      
      if (data.error === 'DATABASE_NOT_SETUP') {
        // Table doesn't exist - show empty state (user needs to run migration)
        setError(null);
        if (!append) {
          setArticles([]);
        }
        return;
      }
      
      if (!response.ok && data.error) {
        // Other errors
        setError(data.error === 'DATABASE_UNAVAILABLE' ? 'DATABASE_UNAVAILABLE' : 'FETCH_ERROR');
        if (!append) {
          setArticles([]);
        }
        return;
      }
      
      // Success - append or replace articles
      if (append) {
        setArticles(prev => [...prev, ...(data.articles || [])]);
      } else {
        setArticles(data.articles || []);
      }
      
      setError(null);
      if (data.pagination) {
        setCurrentPage(data.pagination.page || 1);
        setTotalPages(data.pagination.totalPages || 1);
        setTotalArticles(data.pagination.totalArticles || 0);
        setHasMore(page < data.pagination.totalPages);
      }
      console.log('[ARTICLE HISTORY] Articles set:', append ? 'appended' : 'replaced', data.articles?.length || 0, 'articles');
    } catch (err) {
      // Network or other errors
      console.error('[ARTICLE HISTORY] Error fetching articles:', err);
      setError('DATABASE_UNAVAILABLE');
      if (!append) {
        setArticles([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    // Reset to page 1 when refreshTrigger changes
    if (refreshTrigger !== undefined) {
      setCurrentPage(1);
      setArticles([]);
      setHasMore(true);
    }
  }, [refreshTrigger]);

  useEffect(() => {
    // Fetch first page on mount or when refreshTrigger changes
    if (currentPage === 1 && articles.length === 0) {
      fetchArticles(1, false);
    }
  }, [refreshTrigger]);

  // Infinite scroll handler
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || !hasMore || loadingMore || loading) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      // Load more when user is 200px from bottom
      if (scrollHeight - scrollTop - clientHeight < 200) {
        const nextPage = currentPage + 1;
        if (nextPage <= totalPages && hasMore) {
          setCurrentPage(nextPage);
          fetchArticles(nextPage, true); // Append mode
        }
      }
    };

    // Debounce scroll events
    let scrollTimeout: NodeJS.Timeout;
    const debouncedHandleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScroll, 100);
    };

    scrollContainer.addEventListener('scroll', debouncedHandleScroll);
    return () => {
      scrollContainer.removeEventListener('scroll', debouncedHandleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [currentPage, totalPages, hasMore, loadingMore, loading]);

  const handleDelete = async (articleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this article?')) {
      return;
    }

    // Soft delete - just remove from UI, don't call API
    // Remove from local state
    const updatedArticles = articles.filter(a => a.id !== articleId);
    setArticles(updatedArticles);
    setTotalArticles(prev => Math.max(0, prev - 1));
    
    // If deleted article was selected, clear selection
    if (selectedArticleId === articleId) {
      onSelectArticle('');
    }

    // If current page becomes empty after deletion and we're not on page 1, go to previous page
    // Check AFTER deletion (updatedArticles.length === 0)
    if (updatedArticles.length === 0 && currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div style={{
      width: '280px',
      height: '100vh',
      background: 'var(--color-background-secondary)',
      borderRight: '1px solid var(--color-border)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: 'var(--spacing-lg)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 'var(--spacing-sm)'
      }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ 
            margin: 0, 
            fontSize: '1.125rem', 
            fontWeight: 600,
            color: 'var(--color-text-primary)'
          }}>
            {t('userhome.articleHistory')}
          </h2>
          <p style={{
            margin: 'var(--spacing-xs) 0 0 0',
            fontSize: '0.75rem',
            color: 'var(--color-text-secondary)'
          }}>
            {loading ? '...' : error === 'DATABASE_UNAVAILABLE' ? 'Unavailable' : totalArticles === 0 ? '' : language === 'zh' ? `${totalArticles}${t('userhome.article.zh')}` : `${totalArticles} ${totalArticles === 1 ? t('userhome.article') : t('userhome.articles')}`}
          </p>
        </div>
        {onCollapse && (
          <button
            onClick={onCollapse}
            style={{
              padding: '0.25rem 0.5rem',
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--transition-base)',
              minWidth: '24px',
              height: '24px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-background-tertiary)';
              e.currentTarget.style.borderColor = 'var(--color-border-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
            title={language === 'en' ? 'Collapse sidebar' : '收起侧边栏'}
          >
            ◀
          </button>
        )}
      </div>

      <div 
        ref={scrollContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 'var(--spacing-sm)',
        }}
      >
        {loading ? (
          <div style={{
            padding: 'var(--spacing-lg)',
            textAlign: 'center',
            color: 'var(--color-text-secondary)',
            fontSize: '0.875rem'
          }}>
            Loading...
          </div>
        ) : error === 'DATABASE_UNAVAILABLE' ? (
          <div style={{
            padding: 'var(--spacing-md)',
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-error)',
            margin: 'var(--spacing-md)',
          }}>
            <div style={{
              color: 'var(--color-error)',
              fontSize: '0.875rem',
              fontWeight: 500,
              marginBottom: 'var(--spacing-xs)'
            }}>
              ⚠️ Database Unavailable
            </div>
            <div style={{
              color: 'var(--color-text-secondary)',
              fontSize: '0.75rem',
              lineHeight: 1.5
            }}>
              We're having trouble connecting to the database. Your articles are safe, but we can't display them right now. Please try again later.
            </div>
          </div>
        ) : articles.length === 0 ? (
          <div style={{
            padding: 'var(--spacing-lg)',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '2rem',
              marginBottom: 'var(--spacing-md)',
              opacity: 0.3
            }}>
              📄
            </div>
            <div style={{
              color: 'var(--color-text-primary)',
              fontSize: '0.875rem',
              fontWeight: 500,
              marginBottom: 'var(--spacing-xs)'
            }}>
              No articles yet
            </div>
            <div style={{
              color: 'var(--color-text-secondary)',
              fontSize: '0.75rem',
              lineHeight: 1.5,
              marginTop: 'var(--spacing-sm)'
            }}>
              Process your first article using the form on the right to see it appear here!
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            {articles.map((article) => (
              <div
                key={article.id}
                onClick={() => onSelectArticle(article.id)}
                style={{
                  padding: 'var(--spacing-md)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  background: selectedArticleId === article.id 
                    ? 'var(--color-primary)' 
                    : 'transparent',
                  color: selectedArticleId === article.id 
                    ? 'white' 
                    : 'var(--color-text-primary)',
                  transition: 'all var(--transition-base)',
                  position: 'relative',
                  border: selectedArticleId === article.id 
                    ? '1px solid var(--color-primary)' 
                    : '1px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (selectedArticleId !== article.id) {
                    e.currentTarget.style.background = 'var(--color-background)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedArticleId !== article.id) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 'var(--spacing-sm)',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      marginBottom: 'var(--spacing-xs)',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word',
                      lineHeight: '1.4',
                    }}>
                      {article.title}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      opacity: selectedArticleId === article.id ? 0.9 : 0.6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-xs)',
                      flexWrap: 'wrap',
                    }}>
                      <span>{formatDate(article.createdAt)}</span>
                      {article.inputType === 'url' && (
                        <>
                          <span>•</span>
                          <span style={{ fontSize: '0.7rem' }}>🔗</span>
                        </>
                      )}
                      {article.inputType === 'video' && (
                        <>
                          <span>•</span>
                          <span style={{ fontSize: '0.7rem' }}>🎥</span>
                        </>
                      )}
                      {formatStyleDisplay(article.style) && (
                        <>
                          <span>•</span>
                          <span style={{ fontSize: '0.7rem' }}>{formatStyleDisplay(article.style)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(article.id, e)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: selectedArticleId === article.id ? 'rgba(255,255,255,0.7)' : 'var(--color-text-tertiary)',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      fontSize: '0.875rem',
                      borderRadius: 'var(--radius-sm)',
                      transition: 'all var(--transition-base)',
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = selectedArticleId === article.id 
                        ? 'rgba(255,255,255,0.2)' 
                        : 'rgba(239, 68, 68, 0.1)';
                      e.currentTarget.style.color = selectedArticleId === article.id 
                        ? 'white' 
                        : 'var(--color-error)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = selectedArticleId === article.id 
                        ? 'rgba(255,255,255,0.7)' 
                        : 'var(--color-text-tertiary)';
                    }}
                    title="Delete article"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
            
            {/* Loading more indicator */}
            {loadingMore && (
              <div style={{
                padding: 'var(--spacing-md)',
                textAlign: 'center',
                color: 'var(--color-text-secondary)',
                fontSize: '0.875rem'
              }}>
                {language === 'en' ? 'Loading more articles...' : '加载更多文章中...'}
              </div>
            )}
            
            {/* End of list indicator */}
            {!hasMore && articles.length > 0 && (
              <div style={{
                padding: 'var(--spacing-md)',
                textAlign: 'center',
                color: 'var(--color-text-secondary)',
                fontSize: '0.75rem'
              }}>
                {language === 'en' ? 'No more articles' : '没有更多文章'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Article count footer */}
      {!loading && error !== 'DATABASE_UNAVAILABLE' && totalArticles > 0 && (
        <div style={{
          padding: 'var(--spacing-sm) var(--spacing-md)',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <div style={{
            fontSize: '0.75rem',
            color: 'var(--color-text-secondary)'
          }}>
            {language === 'en' 
              ? `${totalArticles} ${totalArticles === 1 ? t('userhome.article') : t('userhome.articles')}`
              : `${totalArticles}${t('userhome.article.zh')}`}
          </div>
        </div>
      )}
    </div>
  );
}

