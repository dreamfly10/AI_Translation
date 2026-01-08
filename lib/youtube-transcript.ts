/**
 * YouTube Video Transcript Extraction using OpenAI Whisper
 */

import ytdl from '@ybd-project/ytdl-core';
import { openai, isOpenAIConfigured } from './openai';

/**
 * Check if a URL is a YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

/**
 * Extract video ID from YouTube URL
 */
export function extractYouTubeVideoId(url: string): string | null {
  try {
    // Handle various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
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
 * Download YouTube audio and transcribe using OpenAI Whisper
 */
export async function transcribeYouTubeVideo(
  videoUrl: string,
  onProgress?: (message: string) => void
): Promise<string> {
  if (!isOpenAIConfigured()) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  // Extract video ID
  const videoId = extractYouTubeVideoId(videoUrl);
  if (!videoId) {
    throw new Error('Invalid YouTube URL. Could not extract video ID.');
  }

  onProgress?.('Extracting video information...');

  // Enhanced headers to mimic a real browser
  const browserHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
  };

  // Validate video URL with retry logic
  let info;
  let retries = 2;
  let lastError: Error | null = null;

  while (retries >= 0) {
    try {
      onProgress?.(retries < 2 ? `Extracting video information... (retry ${2 - retries + 1})` : 'Extracting video information...');
      info = await ytdl.getInfo(videoUrl, {
        requestOptions: {
          headers: browserHeaders,
        },
      });
      break; // Success, exit retry loop
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const errorMessage = lastError.message;
      
      // Check for 403 or access denied errors
      if (errorMessage.includes('403') || errorMessage.includes('Status code: 403') || errorMessage.includes('Forbidden')) {
        throw new Error('YouTube is blocking access to this video (403 Forbidden). Please use the "Raw Text" tab to paste the video transcript manually. To get the transcript: 1) Open the video on YouTube, 2) Click the three dots (⋯) below the video, 3) Select "Show transcript", 4) Copy the transcript text, 5) Paste it in the "Raw Text" tab.');
      }
      
      // Check for parsing errors (YouTube structure changes) - check various error formats
      if (errorMessage.includes('parsing watch.html') || 
          errorMessage.includes('YouTube made a change') || 
          errorMessage.includes('player-script') || 
          errorMessage.includes('watch.html') ||
          errorMessage.includes('Error when parsing') ||
          errorMessage.includes('maybe YouTube made a change') ||
          errorMessage.includes('ytdl-core/issues') ||
          errorMessage.includes('ybd-project')) {
        throw new Error('YouTube has updated their website structure, breaking automatic extraction. Please use the "Raw Text" tab and paste the video transcript manually. To get the transcript: 1) Open the video on YouTube, 2) Click the three dots (⋯) below the video, 3) Select "Show transcript", 4) Copy the transcript text, 5) Paste it in the "Raw Text" tab.');
      }
      
      if (retries === 0) {
        throw lastError;
      }
      retries--;
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * (2 - retries)));
    }
  }

  if (!info) {
    throw new Error('Failed to extract video information after retries');
  }

  const duration = parseInt(info.videoDetails.lengthSeconds || '0', 10);
  
  // Limit video length to 2 hours (7200 seconds) for Whisper API
  if (duration > 7200) {
    throw new Error('Video is too long. Maximum supported length is 2 hours.');
  }

  onProgress?.('Downloading audio...');

  try {
    // Get audio stream (best audio quality) with enhanced headers
    const audioStream = ytdl(videoUrl, {
      quality: 'highestaudio',
      filter: 'audioonly',
      requestOptions: {
        headers: browserHeaders,
      },
    });

    // Collect audio chunks into buffer
    const chunks: Buffer[] = [];
    
    for await (const chunk of audioStream) {
      chunks.push(Buffer.from(chunk));
    }
    
    const audioBuffer = Buffer.concat(chunks);

    onProgress?.('Transcribing audio with Whisper...');

    // Create a File object for OpenAI API
    // In Node.js 18+, File is available globally
    // OpenAI SDK accepts File objects directly
    const audioFile = new File([audioBuffer], 'audio.mp4', { type: 'audio/mp4' });

    // Transcribe using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: undefined, // Auto-detect language
      response_format: 'text',
    });

    if (!transcription || typeof transcription !== 'string' || transcription.trim().length === 0) {
      throw new Error('Whisper transcription returned empty result');
    }

    return transcription.trim();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Handle specific YouTube errors
    if (errorMessage.includes('403') || errorMessage.includes('Status code: 403') || errorMessage.includes('Forbidden') || errorMessage.includes('blocking access')) {
      throw new Error('YouTube is blocking access to this video (403 Forbidden). This may be due to YouTube\'s anti-bot measures. Please use the "Raw Text" tab to paste the video transcript manually, or try again later.');
    } else if (errorMessage.includes('Video unavailable') || errorMessage.includes('Private video')) {
      throw new Error('This YouTube video is unavailable or private. Please check the URL and try again.');
    } else if (errorMessage.includes('too long')) {
      throw error; // Re-throw length errors
    } else if (errorMessage.includes('Sign in to confirm your age')) {
      throw new Error('This video requires age verification and cannot be processed automatically.');
    } else if (errorMessage.includes('Could not extract functions') || 
               errorMessage.includes('extract functions') || 
               errorMessage.includes('parsing watch.html') || 
               errorMessage.includes('YouTube made a change') ||
               errorMessage.includes('Error when parsing') ||
               errorMessage.includes('maybe YouTube made a change') ||
               errorMessage.includes('ytdl-core/issues') ||
               errorMessage.includes('ybd-project') ||
               errorMessage.includes('watch.html')) {
      throw new Error('YouTube has updated their website structure, breaking automatic extraction. Please use the "Raw Text" tab and paste the video transcript manually. To get the transcript: 1) Open the video on YouTube, 2) Click the three dots (⋯) below the video, 3) Select "Show transcript", 4) Copy the transcript text, 5) Paste it in the "Raw Text" tab.');
    } else if (errorMessage.includes('Sign in to confirm')) {
      throw new Error('This video requires sign-in and cannot be processed automatically.');
    } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      throw new Error('YouTube rate limit exceeded. Please wait a few minutes and try again.');
    }
    
    throw new Error(`Failed to process YouTube video: ${errorMessage}`);
  }
}
