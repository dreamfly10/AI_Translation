/**
 * YouTube Video Transcript Extraction
 * Uses youtube-transcript package to fetch captions directly (no audio download)
 * This approach works on Vercel and doesn't require ffmpeg or yt-dlp
 */

/**
 * Check if a URL is a YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

/**
 * Normalize YouTube URL - remove incomplete parameters and clean up
 */
export function normalizeYouTubeUrl(url: string): string {
  try {
    let normalized = url.trim();
    
    // Remove trailing incomplete parameters like &t= (with no value)
    normalized = normalized.replace(/[&?]t=\s*$/i, '');
    
    // Try to parse as URL to validate
    try {
      const urlObj = new URL(normalized);
      
      // If no video ID in params, return normalized URL
      return normalized;
    } catch (urlError) {
      // If URL parsing fails, try regex extraction to get video ID
      const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
        /youtube\.com\/watch\?.*v=([^&\n?#]+)/
      ];
      
      for (const pattern of patterns) {
        const match = normalized.match(pattern);
        if (match && match[1]) {
          // Reconstruct URL with just the video ID
          return `https://www.youtube.com/watch?v=${match[1]}`;
        }
      }
      
      // Return normalized version if we can't extract video ID
      return normalized;
    }
  } catch (error) {
    console.error('Error normalizing YouTube URL:', error);
    return url; // Return original if normalization fails
  }
}

/**
 * Extract YouTube video ID from URL
 */
export function extractYouTubeVideoId(url: string): string | null {
  try {
    const normalized = normalizeYouTubeUrl(url);
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting YouTube video ID:', error);
    return null;
  }
}

/**
 * Fetch YouTube transcript using youtube-transcript package
 * Uses dynamic import to avoid Next.js build issues
 * 
 * @param videoId - YouTube video ID
 * @param onProgress - Optional progress callback
 * @returns Transcript text or null if not available
 */
async function fetchYouTubeTranscript(
  videoId: string,
  onProgress?: (message: string) => void
): Promise<string | null> {
  try {
    onProgress?.('Fetching transcript from YouTube...');
    
    // Dynamic import to avoid Next.js build-time issues
    // @ts-ignore - youtube-transcript doesn't have type definitions
    const { YoutubeTranscript } = await import('youtube-transcript');
    
    console.log('[YouTube Transcript] Fetching transcript for video:', videoId);
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
    
    console.log('[YouTube Transcript] Received transcript items:', transcriptItems?.length || 0);
    
    if (!transcriptItems || transcriptItems.length === 0) {
      console.log('[YouTube Transcript] No transcript items returned');
      return null;
    }
    
    // Combine all transcript items into a single text
    const transcript = transcriptItems
      .map((item: any) => item.text || '')
      .filter((text: string) => text.trim().length > 0)
      .join(' ')
      .trim();
    
    if (transcript.length === 0) {
      console.log('[YouTube Transcript] Transcript text is empty after processing');
      return null;
    }
    
    console.log('[YouTube Transcript] Successfully fetched transcript, length:', transcript.length);
    onProgress?.('Transcript fetched successfully');
    return transcript;
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    const errorStack = error?.stack || '';
    
    console.error('[YouTube Transcript] Full error:', {
      message: errorMsg,
      stack: errorStack,
      videoId: videoId
    });
    
    // Common errors that mean transcript is not available
    if (
      errorMsg.includes('Transcript is disabled') ||
      errorMsg.includes('Could not retrieve a transcript') ||
      errorMsg.includes('No transcript found') ||
      errorMsg.includes('transcript not available') ||
      errorMsg.includes('Transcript not available') ||
      errorMsg.includes('unavailable') ||
      errorMsg.includes('private') ||
      errorMsg.includes('members-only') ||
      errorMsg.includes('Transcripts are disabled') ||
      errorMsg.includes('No transcripts were found') ||
      errorMsg.includes('Could not find a transcript') ||
      errorMsg.includes('transcriptsDisabled') ||
      errorMsg.includes('Transcripts are turned off')
    ) {
      console.log('[YouTube Transcript] Transcript not available:', errorMsg);
      return null;
    }
    
    // Check for module resolution errors
    if (
      errorMsg.includes('Cannot find module') ||
      errorMsg.includes('Module not found') ||
      errorMsg.includes('Cannot resolve module') ||
      errorStack.includes('require') && errorStack.includes('youtube-transcript')
    ) {
      console.error('[YouTube Transcript] Module resolution error - youtube-transcript package not found');
      throw new Error(
        'YouTube transcript package is not installed correctly. ' +
        'Please ensure youtube-transcript is installed: npm install youtube-transcript'
      );
    }
    
    // Other errors (network, etc.) - log but don't fail completely
    console.warn('[YouTube Transcript] Error fetching transcript:', errorMsg);
    return null;
  }
}

/**
 * Transcribe YouTube video - fetches transcript directly (captions only)
 * No audio download, no ffmpeg, no Whisper - works on Vercel
 * 
 * @param videoUrl - YouTube video URL
 * @param onProgress - Optional progress callback
 * @returns Transcript text
 */
export async function transcribeYouTubeVideo(
  videoUrl: string,
  onProgress?: (message: string) => void
): Promise<string> {
  // Normalize and clean the URL first
  const normalizedUrl = normalizeYouTubeUrl(videoUrl);
  
  // Extract video ID for validation
  const videoId = extractYouTubeVideoId(normalizedUrl);
  if (!videoId) {
    throw new Error('Invalid YouTube URL. Could not extract video ID.');
  }

  // Fetch transcript directly (captions only - no audio download)
  onProgress?.('Checking for available transcript...');
  const transcript = await fetchYouTubeTranscript(videoId, onProgress);
  
  if (transcript && transcript.length > 0) {
    console.log('[YouTube Transcript] Successfully fetched transcript');
    return transcript;
  }

  // Transcript not available - show helpful error message
  throw new Error(
    'Transcript is not available for this video. ' +
    'The video may not have captions enabled, or they may be disabled by the creator. ' +
    'Please use the "Raw Text" tab to paste the transcript manually.'
  );
}
