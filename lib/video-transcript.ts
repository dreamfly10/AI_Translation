/**
 * Video Transcript Extraction using OpenAI Whisper
 * Supports both YouTube URLs and direct video file uploads (MP4, MP3, etc.)
 */

import { openai, isOpenAIConfigured } from './openai';
import { transcribeYouTubeVideo } from './youtube-transcript';

/**
 * Check if a URL is a YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

/**
 * Check if input is a video file (by extension or MIME type)
 */
export function isVideoFile(file: File | Blob): boolean {
  if (file instanceof File) {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'm4v', 'mp3', 'wav', 'm4a', 'aac', 'flac', 'opus'];
    return videoExtensions.includes(extension || '');
  }
  return false;
}

/**
 * Transcribe video/audio using OpenAI Whisper
 * Supports:
 * - YouTube URLs (via youtube-transcript.ts)
 * - Direct video/audio file uploads (MP4, MP3, WAV, etc.)
 */
export async function transcribeVideo(
  input: string | File,
  onProgress?: (message: string) => void
): Promise<string> {
  if (!isOpenAIConfigured()) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  // Handle YouTube URLs
  if (typeof input === 'string' && isYouTubeUrl(input)) {
    return await transcribeYouTubeVideo(input, onProgress);
  }

  // Handle direct file uploads
  if (input instanceof File || (typeof input === 'object' && 'size' in input && 'type' in input)) {
    const file = input instanceof File ? input : new File([input as Blob], 'video.mp4', { type: (input as Blob).type || 'video/mp4' });
    
    onProgress?.('Transcribing audio/video with Whisper...');

    // Check file size (Whisper API limit is 25MB)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      throw new Error(`File is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum file size is 25MB. Please compress the video or use a shorter clip.`);
    }

    // Transcribe using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: undefined, // Auto-detect language
      response_format: 'text',
    });

    if (!transcription || typeof transcription !== 'string' || transcription.trim().length === 0) {
      throw new Error('Whisper transcription returned empty result');
    }

    return transcription.trim();
  }

  throw new Error('Invalid input. Expected a YouTube URL or a video/audio file.');
}
