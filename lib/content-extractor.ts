/**
 * ⚠️ IMPORTANT
 * Do not refactor or change behavior in this file.
 * Changes here must be minimal and error-driven only.
 */

import * as cheerio from 'cheerio';
import { transcribeYouTubeVideo, isYouTubeUrl } from './youtube-transcript';

interface ExtractionResult {
  content: string;
  requiresSubscription: boolean;
}

// Known subscription-required domains
const SUBSCRIPTION_DOMAINS = [
  'wsj.com',
  'nytimes.com',
  'ft.com',
  'economist.com',
  'bloomberg.com',
  'washingtonpost.com',
  'theatlantic.com',
  'newyorker.com',
  'financialtimes.com',
];

// Known free news sites (never require subscription)
const FREE_NEWS_SITES = [
  'yahoo.com',
  'yahoo.co',
  'cnn.com',
  'bbc.com',
  'reuters.com',
  'ap.org',
  'npr.org',
  'theguardian.com',
  'independent.co.uk',
  'usatoday.com',
  'abcnews.go.com',
  'cbsnews.com',
  'nbcnews.com',
  'nyquiste.com', // Blog platform
];

function isKnownSubscriptionSite(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    return SUBSCRIPTION_DOMAINS.some(domain => hostname.includes(domain));
  } catch {
    return false;
  }
}

function isKnownFreeSite(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    return FREE_NEWS_SITES.some(domain => hostname.includes(domain));
  } catch {
    return false;
  }
}

// Validate URL format
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    // Must be http or https
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Fetch with timeout and retry logic
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 2,
  timeoutMs: number = 30000
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        return response;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        // Check if it's an abort (timeout) error
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeoutMs}ms`);
        }
        throw fetchError;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on certain errors
      if (lastError.message.includes('Invalid URL') || 
          lastError.message.includes('Failed to parse URL')) {
        throw lastError;
      }
      
      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        break;
      }
      
      // Exponential backoff: wait 1s, 2s, 4s...
      const delayMs = Math.min(1000 * Math.pow(2, attempt), 10000);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  throw lastError || new Error('Failed to fetch URL after retries');
}

export async function extractContentFromUrl(url: string, onProgress?: (message: string) => void): Promise<ExtractionResult> {
  // Validate URL format first
  if (!isValidUrl(url)) {
    throw new Error('Invalid URL format. Please ensure the URL starts with http:// or https://');
  }
  
  // Check if it's a YouTube URL
  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
  
  // Check if it's a known free site (never requires subscription)
  const isFreeSite = isKnownFreeSite(url);
  
  // Check if it's a known subscription site first
  const isSubscriptionSite = isKnownSubscriptionSite(url);
  
  // Handle YouTube videos with Whisper transcription
  if (isYouTube) {
    try {
      onProgress?.('Processing YouTube video...');
      const transcript = await transcribeYouTubeVideo(url, onProgress);
      
      if (!transcript || transcript.trim().length === 0) {
        throw new Error('Failed to extract transcript from YouTube video');
      }
      
      return {
        content: transcript,
        requiresSubscription: false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`YouTube video processing failed: ${errorMessage}`);
    }
  }
  
  try {
    onProgress?.('Fetching content from URL...');
    
    const response = await fetchWithRetry(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
      },
      2, // maxRetries
      30000 // 30 second timeout
    );

    if (!response.ok) {
      // Handle specific HTTP status codes
      if (response.status === 403) {
        throw new Error('Access forbidden. The website may be blocking automated requests. Try copying the content manually and using the "Raw Text" tab.');
      }
      if (response.status === 404) {
        throw new Error('Page not found. Please check the URL and try again.');
      }
      if (response.status === 429) {
        throw new Error('Too many requests. The website is rate-limiting requests. Please wait a moment and try again, or use the "Raw Text" tab.');
      }
      if (response.status >= 500) {
        throw new Error('Server error. The website may be temporarily unavailable. Please try again later or use the "Raw Text" tab.');
      }
      
      // If it's a known subscription site and fetch failed, assume subscription required
      if (isSubscriptionSite) {
        return {
          content: '',
          requiresSubscription: true,
        };
      }
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    onProgress?.('Extracting content from page...');
    const html = await response.text();
    const $ = cheerio.load(html);

    // If it's a known free site, skip paywall detection
    let requiresSubscription = false;
    
    if (!isFreeSite) {
      // Only check for actual blocking paywall elements (overlays, modals, locked content)
      // Not just any mention of "subscription" or "premium" in ads/navigation
      const blockingPaywallSelectors = [
        '[class*="paywall"]',
        '[id*="paywall"]',
        '[class*="pay-wall"]',
        '[id*="pay-wall"]',
        '[class*="article-locked"]',
        '[id*="article-locked"]',
        '[class*="content-locked"]',
        '[id*="content-locked"]',
        '[class*="subscription-required"]',
        '[id*="subscription-required"]',
        '[class*="subscribe-to-read"]',
        '[id*="subscribe-to-read"]',
        '[class*="sign-in-to-read"]',
        '[id*="sign-in-to-read"]',
        '[class*="login-to-read"]',
        '[id*="login-to-read"]',
        // Check for common paywall overlay patterns
        '[class*="overlay"][class*="paywall"]',
        '[class*="modal"][class*="subscription"]',
        '[class*="gate"][class*="content"]',
      ];

      // Check for blocking paywall elements (must be visible/blocking)
      requiresSubscription = blockingPaywallSelectors.some((selector) => {
        const elements = $(selector);
        // Only count if element exists and is likely blocking (has significant content or is positioned as overlay)
        return elements.length > 0 && elements.filter((_, el) => {
          const $el = $(el);
          const text = $el.text().trim();
          const style = $el.attr('style') || '';
          const classes = $el.attr('class') || '';
          // Check if it's likely a blocking element (has blocking text or overlay positioning)
          return text.length > 20 || 
                 style.includes('position: fixed') || 
                 style.includes('position: absolute') ||
                 classes.includes('overlay') ||
                 classes.includes('modal');
        }).length > 0;
      });

      // Check for paywall text in main content area only (not in ads/navigation)
      if (!requiresSubscription) {
        // Remove navigation, ads, and footer before checking text
        $('nav, header, footer, aside, [class*="ad"], [class*="advertisement"], [id*="ad"], [id*="advertisement"]').remove();
        const mainContentText = $('body').text().toLowerCase();
        
        // More specific paywall text indicators (must be in main content)
        const paywallTextIndicators = [
          'subscribe to continue reading',
          'sign in to continue reading',
          'log in to continue reading',
          'this article is for subscribers only',
          'this content is for subscribers',
          'you have reached your free article limit',
          'continue reading with a subscription',
        ];
        
        requiresSubscription = paywallTextIndicators.some((indicator) => 
          mainContentText.includes(indicator)
        );
      }
    }

    // Extract main content
    // Comprehensive list of selectors ordered by specificity and reliability
    const contentSelectors = [
      // Semantic HTML5 elements (most reliable)
      'article',
      '[role="article"]',
      'main article',
      'main [role="article"]',
      
      // WordPress and common CMS patterns
      '.article-content',
      '.post-content',
      '.entry-content',
      '.entry-body',
      '.article-body',
      '.post-body',
      '.story-body',
      '.article-text',
      '.post-text',
      '.content-area',
      '.site-content',
      '.main-content',
      '.primary-content',
      
      // Class combinations (more specific)
      '[class*="article"][class*="content"]',
      '[class*="story"][class*="content"]',
      '[class*="post"][class*="content"]',
      '[class*="entry"][class*="content"]',
      '[class*="main"][class*="content"]',
      '[class*="primary"][class*="content"]',
      
      // Blog and CMS platforms
      '[class*="post"]',
      '[class*="blog-post"]',
      '[class*="blog-content"]',
      '[class*="post-detail"]',
      '[class*="post-details"]',
      '[class*="post-content-wrapper"]',
      '[class*="article-wrapper"]',
      '[class*="content-wrapper"]',
      '[class*="entry-wrapper"]',
      '[class*="article-container"]',
      '[class*="post-container"]',
      '[class*="content-container"]',
      
      // ID-based selectors
      '[id*="post"]',
      '[id*="article"]',
      '[id*="content"]',
      '[id*="main-content"]',
      '[id*="article-content"]',
      '[id*="post-content"]',
      
      // Section and div patterns
      'section[class*="post"]',
      'section[class*="article"]',
      'section[class*="content"]',
      'div[class*="post-content"]',
      'div[class*="article-content"]',
      'div[class*="entry-content"]',
      'div[class*="main-content"]',
      'div[class*="primary-content"]',
      
      // Medium and similar platforms
      '[class*="postArticle"]',
      '[class*="articleSection"]',
      '[class*="section-content"]',
      '[class*="graf"]', // Medium paragraphs
      
      // Ghost CMS
      '[class*="post-content"]',
      '[class*="post-body"]',
      
      // News sites specific
      '[data-module="ArticleBody"]', // Yahoo News
      '.caas-body', // Yahoo News
      '.zn-body__paragraph', // CNN
      '[data-component="text-block"]', // BBC
      '.ArticleBodyWrapper', // Reuters
      '[class*="article-body"]',
      '[class*="story-body"]',
      '[class*="article-text"]',
      '[class*="story-text"]',
      
      // Generic content patterns
      '.content',
      '[class*="content"]',
      '[class*="body"]',
      '[class*="text"]',
      
      // Framework-specific (Next.js, Gatsby, etc.)
      '[class*="prose"]', // Tailwind Typography
      '[class*="markdown"]',
      '[class*="rich-text"]',
      '[class*="wysiwyg"]',
      
      // E-commerce and product pages
      '[class*="product-description"]',
      '[class*="product-content"]',
      '[class*="description"]',
    ];

    let content = '';
    let bestContent = '';
    let bestContentLength = 0;
    
    // Try all selectors and keep the one with the most content
    for (const selector of contentSelectors) {
      try {
        const elements = $(selector);
        if (elements.length > 0) {
          // Try each matching element (some selectors might match multiple)
          elements.each((_, el) => {
            const $element = $(el);
            // Clone to avoid modifying the original
            const $clone = $element.clone();
            
            // Remove unwanted elements from the article
            $clone.find('script, style, nav, footer, header, aside, [class*="ad"], [class*="advertisement"], [id*="ad"], [id*="advertisement"], [class*="newsletter"], [class*="subscribe"], [class*="social"], [class*="share"], [class*="comment"], [class*="related"], [class*="sidebar"], [class*="widget"]').remove();
            
            const elementContent = $clone.text().trim();
            const contentLength = elementContent.length;
            
            // Keep track of the best content found
            if (contentLength > bestContentLength && contentLength > 100) {
              bestContent = elementContent;
              bestContentLength = contentLength;
            }
          });
        }
      } catch (err) {
        // Skip invalid selectors
        continue;
      }
    }
    
    // Use the best content found, or fall back to first match
    if (bestContentLength > 200) {
      content = bestContent;
    } else if (bestContentLength > 100) {
      // Even if not ideal, use it if it's the best we have
      content = bestContent;
    }

    // Fallback: use body text if no article found
    if (!content || content.length < 200) {
      // Remove script, style, navigation, ads, and subscription prompts
      $('script, style, nav, footer, header, aside, [class*="ad"], [class*="advertisement"], [id*="ad"], [id*="advertisement"], [class*="newsletter"], [class*="subscribe"], [class*="paywall"], [class*="menu"], [class*="navigation"], [class*="sidebar"], [class*="widget"], [class*="social"], [class*="share"]').remove();
      
      // Try to get main content area first
      const mainContent = $('main').first();
      if (mainContent.length > 0) {
        const $mainClone = mainContent.clone();
        $mainClone.find('script, style, nav, footer, header, aside, [class*="ad"], [class*="advertisement"], [id*="ad"], [class*="menu"], [class*="navigation"], [class*="sidebar"], [class*="widget"], [class*="social"], [class*="share"], [class*="comment"], [class*="related"]').remove();
        const mainText = $mainClone.text().trim();
        if (mainText.length > content.length) {
          content = mainText;
        }
      }
      
      // If still not enough content, try more aggressive extraction
      if (!content || content.length < 200) {
        // Try to find content in sections or divs with common content classes
        // First, try to find the largest content block
        const allContentElements = $('section, div, article, main, [role="main"], [role="article"]').filter((_, el) => {
          const $el = $(el);
          const text = $el.text().trim();
          const classes = ($el.attr('class') || '').toLowerCase();
          const id = ($el.attr('id') || '').toLowerCase();
          const role = ($el.attr('role') || '').toLowerCase();
          
          // Skip navigation, headers, footers, sidebars, modals, overlays
          const skipPatterns = ['nav', 'header', 'footer', 'sidebar', 'menu', 'widget', 'modal', 'overlay', 'popup', 'dialog', 'banner', 'advertisement', 'ad-', 'social', 'share', 'comment', 'related', 'newsletter', 'subscribe'];
          const shouldSkip = skipPatterns.some(pattern => 
            classes.includes(pattern) || id.includes(pattern)
          );
          
          if (shouldSkip) {
            return false;
          }
          
          // Prefer elements with article/main role
          if (role === 'article' || role === 'main') {
            return text.length > 200;
          }
          
          // Look for elements with substantial text content
          return text.length > 300;
        });
        
        if (allContentElements.length > 0) {
          // Get the element with the most text (likely the main article)
          let maxScore = 0;
          let bestElementIndex = 0;
          let bestElement: any = null;
          
          allContentElements.each((index, el) => {
            const $el = $(el);
            const text = $el.text().trim();
            const role = ($el.attr('role') || '').toLowerCase();
            const classes = ($el.attr('class') || '').toLowerCase();
            
            // Score elements: prefer article/main role, prefer content-related classes, prefer longer content
            let score = text.length;
            if (role === 'article' || role === 'main') score += 500;
            if (classes.includes('content') || classes.includes('article') || classes.includes('post')) score += 200;
            if (classes.includes('body') || classes.includes('text')) score += 100;
            
            if (score > maxScore) {
              maxScore = score;
              bestElementIndex = index;
              bestElement = el;
            }
          });
          
          // Get the best element as Cheerio object
          const $best = bestElement ? $(bestElement) : allContentElements.eq(bestElementIndex);
          $best.find('script, style, nav, footer, header, aside, [class*="ad"], [class*="advertisement"], [id*="ad"], [class*="menu"], [class*="navigation"], [class*="sidebar"], [class*="widget"], [class*="social"], [class*="share"], [class*="comment"], [class*="related"], [class*="newsletter"], [class*="subscribe"]').remove();
          const bestText = $best.text().trim();
          if (bestText.length > content.length) {
            content = bestText;
          }
        }
        
        // Final fallback: extract from body with aggressive cleaning
        if (!content || content.length < 200) {
          const $bodyClone = $('body').clone();
          $bodyClone.find('script, style, nav, footer, header, aside, [class*="ad"], [class*="advertisement"], [id*="ad"], [class*="menu"], [class*="navigation"], [class*="sidebar"], [class*="widget"], [class*="social"], [class*="share"], [class*="comment"], [class*="related"], [class*="newsletter"], [class*="subscribe"], form, button[type="submit"], [class*="modal"], [class*="overlay"], [class*="popup"]').remove();
          
          // Try to extract from paragraphs and headings (likely content)
          const textElements = $bodyClone.find('p, h1, h2, h3, h4, h5, h6, li, blockquote, [class*="text"], [class*="content"], [class*="paragraph"]').map((_, el) => {
            return $(el).text().trim();
          }).get().filter(text => text.length > 20).join(' ').trim();
          
          if (textElements.length > content.length && textElements.length > 200) {
            content = textElements;
          } else {
            // Last resort: use all body text
            const bodyText = $bodyClone.text().trim();
            if (bodyText.length > content.length) {
              content = bodyText;
            }
          }
        }
      }
      
      // Clean up excessive whitespace
      content = content
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n\n')
        .trim();
      
      // Remove common navigation patterns and UI elements
      const navPatterns = [
        /Home\s+Projects\s+Incubation\s+Partner/gi,
        /Log In\s+All Posts\s+AI\s+Development/gi,
        /Recent Posts\s+See All/gi,
        /Contact Us\s+First name\s+Last name\s+Email/gi,
        /Search\s+Submit/gi,
        /Subscribe\s+Newsletter/gi,
        /Follow Us|Share|Like|Tweet/gi,
        /Cookie\s+Policy|Privacy\s+Policy|Terms\s+of\s+Service/gi,
        /Use tab to navigate through the menu items/gi,
        /See original/gi,
        /Breaking news/gi,
        /Development/gi,
        /^top of page$/gi,
        /^bottom of page$/gi,
      ];
      
      navPatterns.forEach(pattern => {
        content = content.replace(pattern, '');
      });
      
      // Clean up again after pattern removal
      content = content
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n\n')
        .trim();
      
      // If content is still very short after cleanup, it might be a client-side rendered site
      // Try one more aggressive extraction from body
      if (content.length < 200) {
        // Remove everything except likely content containers
        const bodyClone = $('body').clone();
        bodyClone.find('script, style, nav, footer, header, aside, [class*="ad"], [class*="advertisement"], [id*="ad"], [class*="menu"], [class*="navigation"], [class*="sidebar"], [class*="widget"], [class*="social"], [class*="share"], form, button[type="submit"]').remove();
        
        // Try to extract from any remaining divs/sections
        const remainingContent = bodyClone.find('div, section, article, p, h1, h2, h3, h4, h5, h6').map((_, el) => {
          return $(el).text().trim();
        }).get().join(' ').trim();
        
        if (remainingContent.length > content.length) {
          content = remainingContent;
        }
      }
      
      // Only flag as subscription required if:
      // 1. Content is still too short after cleanup
      // 2. AND it's not a known free site
      // 3. AND we haven't already detected a paywall
      if (content.length < 200 && !isFreeSite && !requiresSubscription) {
        // Check if there's actually a blocking paywall before assuming subscription
        // If we got here, content extraction failed - might be dynamic loading or wrong selectors
        // Only assume paywall if it's a known subscription site
        requiresSubscription = isSubscriptionSite;
      }
    }

    // Clean up content
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();

    // Final check: if it's a known free site, never require subscription
    const finalRequiresSubscription = isFreeSite ? false : (requiresSubscription || isSubscriptionSite);
    
    return {
      content: content || 'Could not extract content from URL',
      requiresSubscription: finalRequiresSubscription,
    };
  } catch (error) {
    console.error('Error extracting content:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // If it's a known subscription site and fetch failed, return subscription required
    if (isSubscriptionSite) {
      return {
        content: '',
        requiresSubscription: true,
      };
    }
    
    // Provide user-friendly error messages based on error type
    if (errorMessage.includes('timeout') || errorMessage.includes('Request timeout')) {
      throw new Error('Request timed out. The website took too long to respond. This may happen with slow-loading sites or sites that use JavaScript to load content. Try using the "Raw Text" tab instead.');
    }
    
    if (errorMessage.includes('fetch failed') || errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
      if (errorMessage.includes('CORS') || errorMessage.includes('Cross-Origin')) {
        throw new Error('CORS error: The website blocks requests from other origins. This is common with JavaScript-heavy sites. Please copy the article content and use the "Raw Text" tab.');
      }
      throw new Error('Network error: Unable to fetch the URL. Please check your internet connection, verify the URL is correct, and try again. If the problem persists, use the "Raw Text" tab.');
    }
    
    if (errorMessage.includes('Invalid URL')) {
      throw new Error('Invalid URL format. Please ensure the URL is complete and starts with http:// or https://');
    }
    
    if (errorMessage.includes('SSL') || errorMessage.includes('certificate') || errorMessage.includes('TLS')) {
      throw new Error('SSL/Certificate error: The website has certificate issues. Please verify the URL or use the "Raw Text" tab.');
    }
    
    // Generic error with helpful suggestion
    throw new Error(`Failed to extract content: ${errorMessage}. If this site uses JavaScript to load content, try copying the article text and using the "Raw Text" tab instead.`);
  }
}

