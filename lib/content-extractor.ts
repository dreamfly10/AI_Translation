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

export async function extractContentFromUrl(url: string, onProgress?: (message: string) => void): Promise<ExtractionResult> {
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
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      // If it's a known subscription site and fetch failed, assume subscription required
      if (isSubscriptionSite) {
        return {
          content: '',
          requiresSubscription: true,
        };
      }
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }

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
    // Try common article selectors (more comprehensive list)
    const contentSelectors = [
      'article',
      '[role="article"]',
      '.article-content',
      '.post-content',
      '.entry-content',
      '.content',
      '.article-body',
      '.story-body',
      '.article-text',
      '.post-body',
      '[class*="article"][class*="content"]',
      '[class*="story"][class*="content"]',
      '[class*="post"][class*="content"]',
      'main article',
      'main [role="article"]',
      // Yahoo News specific
      '[data-module="ArticleBody"]',
      '.caas-body',
      // CNN specific
      '.zn-body__paragraph',
      // BBC specific
      '[data-component="text-block"]',
      // Reuters specific
      '.ArticleBodyWrapper',
      // Generic news sites
      '[class*="article-body"]',
      '[class*="story-body"]',
    ];

    let content = '';
    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        // Remove unwanted elements from the article
        element.find('script, style, nav, footer, header, aside, [class*="ad"], [class*="advertisement"], [id*="ad"], [id*="advertisement"], [class*="newsletter"], [class*="subscribe"]').remove();
        content = element.text().trim();
        if (content.length > 200) {
          break; // Found substantial content
        }
      }
    }

    // Fallback: use body text if no article found
    if (!content || content.length < 200) {
      // Remove script, style, navigation, ads, and subscription prompts
      $('script, style, nav, footer, header, aside, [class*="ad"], [class*="advertisement"], [id*="ad"], [id*="advertisement"], [class*="newsletter"], [class*="subscribe"], [class*="paywall"]').remove();
      content = $('body').text().trim();
      
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
    
    // If it's a known subscription site and fetch failed, return subscription required
    if (isSubscriptionSite) {
      return {
        content: '',
        requiresSubscription: true,
      };
    }
    
    // Check if error message indicates network/fetch failure
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('fetch failed') || errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
      // For known subscription sites, assume subscription required
      if (isSubscriptionSite) {
        return {
          content: '',
          requiresSubscription: true,
        };
      }
    }
    
    throw new Error(`Failed to extract content: ${errorMessage}`);
  }
}

