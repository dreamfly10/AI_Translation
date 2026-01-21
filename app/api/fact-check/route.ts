import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { extractContentFromUrl } from '@/lib/content-extractor';

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    const { text, url } = await request.json();
    
    // Validate input - either text or url must be provided
    if (!text && !url) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Either text or url is required' },
        { status: 400 }
      );
    }

    let textToCheck: string;

    // If URL is provided, extract content server-side (avoids CORS issues)
    if (url && typeof url === 'string') {
      try {
        const extractResult = await extractContentFromUrl(url);
        textToCheck = extractResult.content || url;
        
        if (!textToCheck || textToCheck.trim().length === 0) {
          return NextResponse.json(
            { error: 'EMPTY_CONTENT', message: 'No content could be extracted from the URL' },
            { status: 400 }
          );
        }
      } catch (extractError) {
        console.error('Error extracting URL content for fact check:', extractError);
        const errorMessage = extractError instanceof Error ? extractError.message : String(extractError);
        return NextResponse.json(
          { 
            error: 'EXTRACTION_ERROR', 
            message: errorMessage || 'Failed to extract content from URL',
            results: []
          },
          { status: 400 }
        );
      }
    } else if (text && typeof text === 'string') {
      textToCheck = text;
    } else {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Text must be a string' },
        { status: 400 }
      );
    }

    // Implement Google Fact Check Tools API integration
    const apiKey = process.env.GOOGLE_FACT_CHECK_API_KEY;
    
    if (!apiKey) {
      console.warn('[FACT CHECK] GOOGLE_FACT_CHECK_API_KEY not configured - returning empty results');
      return NextResponse.json({
        results: [],
        message: 'Fact check API key not configured. Please set GOOGLE_FACT_CHECK_API_KEY in your environment variables.'
      });
    }

    // Extract key claims from the text (simple sentence extraction)
    // Split text into sentences and filter out very short ones
    const sentences = textToCheck
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20 && s.length < 500) // Reasonable claim length
      .slice(0, 5); // Limit to first 5 sentences to avoid too many API calls

    if (sentences.length === 0) {
      console.warn('[FACT CHECK] No valid sentences extracted from text');
      return NextResponse.json({
        results: [],
        message: 'Could not extract claims from the provided content'
      });
    }

    console.log(`[FACT CHECK] Checking ${sentences.length} claims from text (length: ${textToCheck.length})`);

    const factCheckResults: any[] = [];
    const seenUrls = new Set<string>(); // Avoid duplicates

    // Search for fact-checks for each claim
    for (const claim of sentences) {
      try {
        const searchUrl = `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=${encodeURIComponent(claim)}&key=${apiKey}`;
        const response = await fetch(searchUrl, {
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[FACT CHECK] API error for claim "${claim.substring(0, 50)}...":`, response.status, response.statusText, errorText);
          continue;
        }

        const data = await response.json();
        console.log(`[FACT CHECK] Full API response for claim "${claim.substring(0, 50)}...":`, JSON.stringify(data, null, 2));
        
        // Process the response according to Google Fact Check Tools API format
        // The API returns: { claims: [{ text: "...", claimReview: [{ ... }] }] }
        if (data.claims && Array.isArray(data.claims)) {
          console.log(`[FACT CHECK] Found ${data.claims.length} claim(s) in API response`);
          
          for (const claimItem of data.claims) {
            const claimText = claimItem.text || claim;
            console.log(`[FACT CHECK] Processing claim: "${claimText.substring(0, 100)}..."`);
            
            // claimReview can be an array or a single object
            const reviews = Array.isArray(claimItem.claimReview) 
              ? claimItem.claimReview 
              : claimItem.claimReview 
                ? [claimItem.claimReview] 
                : [];
            
            console.log(`[FACT CHECK] Found ${reviews.length} review(s) for this claim`);
            
            for (const review of reviews) {
              const reviewUrl = review.url || '';
              // Skip duplicates
              if (reviewUrl && seenUrls.has(reviewUrl)) {
                console.log(`[FACT CHECK] Skipping duplicate URL: ${reviewUrl}`);
                continue;
              }
              if (reviewUrl) {
                seenUrls.add(reviewUrl);
              }

              const rating = review.textualRating 
                || review.claimReviewRating?.ratingValue 
                || review.ratingValue
                || 'UNKNOWN';
              
              const publisher = review.publisher?.name 
                || review.publisher
                || 'Unknown';
              
              const date = review.reviewDate 
                || review.publishDate 
                || review.datePublished
                || new Date().toISOString();

              console.log(`[FACT CHECK] Adding result: rating="${rating}", publisher="${publisher}", url="${reviewUrl}"`);

              factCheckResults.push({
                claim: claimText,
                rating: rating,
                publisher: publisher,
                url: reviewUrl,
                date: date,
              });
            }
          }
        } else {
          console.log(`[FACT CHECK] No claims found in API response. Response structure:`, Object.keys(data));
        }
      } catch (error) {
        console.error(`[FACT CHECK] Error checking claim "${claim.substring(0, 50)}...":`, error);
        // Continue with next claim
        continue;
      }
    }

    console.log(`[FACT CHECK] Found ${factCheckResults.length} fact-check result(s)`);

    return NextResponse.json({
      results: factCheckResults,
      message: factCheckResults.length > 0 
        ? `Found ${factCheckResults.length} fact-check${factCheckResults.length > 1 ? 's' : ''}`
        : 'No fact-checks found for the provided content'
    });
  } catch (error) {
    console.error('Fact check error:', error);
    return NextResponse.json(
      { 
        error: 'SERVER_ERROR', 
        message: 'Failed to perform fact check',
        results: []
      },
      { status: 500 }
    );
  }
}
