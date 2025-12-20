import * as cheerio from 'cheerio';

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

function isKnownSubscriptionSite(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    return SUBSCRIPTION_DOMAINS.some(domain => hostname.includes(domain));
  } catch {
    return false;
  }
}

export async function extractContentFromUrl(url: string): Promise<ExtractionResult> {
  // Check if it's a known subscription site first
  const isSubscriptionSite = isKnownSubscriptionSite(url);
  
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

    // Check for paywall/subscription indicators
    const paywallIndicators = [
      'paywall',
      'subscription',
      'premium',
      'members-only',
      'locked-content',
      'subscribe-to-read',
      'sign-in-to-read',
      'login-to-read',
      'premium-content',
      'subscriber-only',
    ];

    // Check for paywall in class/id attributes
    let requiresSubscription = paywallIndicators.some((indicator) => {
      const selector = `[class*="${indicator}"], [id*="${indicator}"]`;
      return $(selector).length > 0;
    });

    // Check for paywall in text content
    const bodyText = $('body').text().toLowerCase();
    const paywallTextIndicators = [
      'subscribe to continue reading',
      'sign in to read',
      'log in to read',
      'premium content',
      'subscriber exclusive',
      'members only',
      'this article is for subscribers',
    ];
    
    if (!requiresSubscription) {
      requiresSubscription = paywallTextIndicators.some((indicator) => 
        bodyText.includes(indicator)
      );
    }

    // Extract main content
    // Try common article selectors
    const contentSelectors = [
      'article',
      '[role="article"]',
      '.article-content',
      '.post-content',
      '.entry-content',
      '.content',
      'main',
    ];

    let content = '';
    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        content = element.text().trim();
        if (content.length > 200) {
          break; // Found substantial content
        }
      }
    }

    // Fallback: use body text if no article found
    if (!content || content.length < 200) {
      // Remove script and style elements
      $('script, style, nav, footer, header, aside').remove();
      content = $('body').text().trim();
      
      // If content is still too short, it might be behind a paywall
      if (content.length < 200) {
        requiresSubscription = true;
      }
    }

    // Clean up content
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();

    return {
      content: content || 'Could not extract content from URL',
      requiresSubscription: requiresSubscription || isSubscriptionSite,
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

