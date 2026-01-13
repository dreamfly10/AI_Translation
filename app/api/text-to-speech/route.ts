import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { createNextErrorResponse, ErrorCodes } from '@/lib/error-handler';

export const runtime = 'nodejs'; // IMPORTANT: Ensure Node.js runtime on Vercel

// Initialize Google Cloud TTS client
let ttsClient: TextToSpeechClient | null = null;

function getGoogleCredentials() {
  // Option A (recommended for Vercel): entire JSON key as base64
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_B64;
  if (b64) {
    try {
      const jsonStr = Buffer.from(b64, 'base64').toString('utf-8');
      const creds = JSON.parse(jsonStr);
      
      // Handle newlines in private_key (some JSON keys may contain real newlines)
      if (creds.private_key) {
        creds.private_key = String(creds.private_key).replace(/\\n/g, '\n');
      }
      
      return creds;
    } catch (error) {
      console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_B64:', error);
    }
  }

  // Option B: JSON string (existing method)
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (credentialsJson) {
    try {
      const credentials = JSON.parse(credentialsJson);
      if (credentials.private_key) {
        credentials.private_key = String(credentials.private_key).replace(/\\n/g, '\n');
      }
      return credentials;
    } catch (error) {
      console.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', error);
    }
  }

  // Option C: separate env vars (fallback)
  const client_email = process.env.GOOGLE_CLOUD_CLIENT_EMAIL;
  const private_key = process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  if (client_email && private_key) {
    return { client_email, private_key };
  }

  return null;
}

function getTTSClient(): TextToSpeechClient | null {
  if (ttsClient) {
    return ttsClient;
  }

  const credentials = getGoogleCredentials();
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

  if (!credentials || !projectId) {
    console.error('Missing Google credentials:', {
      hasProjectId: Boolean(projectId),
      hasB64: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_B64),
      hasJson: Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON),
      hasClientEmail: Boolean(process.env.GOOGLE_CLOUD_CLIENT_EMAIL),
      privateKeyLen: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.length ?? 0,
    });
    return null;
  }

  try {
    ttsClient = new TextToSpeechClient({
      credentials,
      projectId,
    });
    return ttsClient;
  } catch (error) {
    console.error('Failed to initialize TTS client:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      const error = createNextErrorResponse({ code: ErrorCodes.UNAUTHORIZED }, 'TTS Authentication');
      return NextResponse.json({ error: error.error, message: error.message }, { status: error.status });
    }

    let body;
    try {
      body = await request.json();
    } catch (err) {
      const error = createNextErrorResponse({ code: ErrorCodes.INVALID_INPUT }, 'TTS Request Parse');
      return NextResponse.json({ error: error.error, message: error.message }, { status: error.status });
    }

    const { text, language } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      const error = createNextErrorResponse({ code: ErrorCodes.INVALID_INPUT }, 'TTS Validation');
      return NextResponse.json({ error: error.error, message: error.message }, { status: error.status });
    }

    // Determine language for Google Cloud TTS
    // Default to Chinese if language is 'zh' or text contains Chinese characters
    const isChinese = language === 'zh' || /[\u4e00-\u9fa5]/.test(text);
    
    const languageCode = isChinese ? 'zh-CN' : 'en-US';

    // Get TTS client
    const client = getTTSClient();
    if (!client) {
      return NextResponse.json(
        { 
          error: 'TTS_CONFIG_ERROR',
          message: 'Google Cloud Text-to-Speech API is not configured. Please ensure the API is enabled and credentials are set up correctly.',
          actionable: 'Please ensure Google Cloud Text-to-Speech API is enabled and credentials are configured correctly.'
        },
        { status: 401 }
      );
    }

    // First, try to list available voices to find a suitable one
    // If that fails, use languageCode only and let Google pick a default voice
    let response;
    try {
      // List available voices for the language
      const [voicesResponse] = await client.listVoices({
        languageCode,
      });

      // Find a suitable female voice (prefer Neural2, then Wavenet, then Standard)
      let selectedVoice: any = null;
      
      if (voicesResponse.voices && voicesResponse.voices.length > 0) {
        // Try to find Neural2 voice first
        selectedVoice = voicesResponse.voices.find((v: any) => 
          v.name?.includes('Neural2') && 
          (v.ssmlGender === 'FEMALE' || v.ssmlGender === 'SSML_VOICE_GENDER_FEMALE')
        );
        
        // If no Neural2, try Wavenet
        if (!selectedVoice) {
          selectedVoice = voicesResponse.voices.find((v: any) => 
            v.name?.includes('Wavenet') && 
            (v.ssmlGender === 'FEMALE' || v.ssmlGender === 'SSML_VOICE_GENDER_FEMALE')
          );
        }
        
        // If still no match, try any female voice
        if (!selectedVoice) {
          selectedVoice = voicesResponse.voices.find((v: any) => 
            v.ssmlGender === 'FEMALE' || v.ssmlGender === 'SSML_VOICE_GENDER_FEMALE'
          );
        }
        
        // Last resort: use the first available voice
        if (!selectedVoice) {
          selectedVoice = voicesResponse.voices[0];
        }
      }

      // Synthesize speech with the selected voice or languageCode only
      if (selectedVoice) {
        console.log(`Using voice: ${selectedVoice.name}`);
        [response] = await client.synthesizeSpeech({
          input: { text },
          voice: {
            languageCode,
            name: selectedVoice.name,
            ssmlGender: 'FEMALE' as const,
          },
          audioConfig: {
            audioEncoding: 'MP3' as const,
            speakingRate: 1.0,
            pitch: 0.0,
          },
        });
      } else {
        // Fallback: use languageCode only, let Google pick a default voice
        console.log(`No specific voice found, using languageCode: ${languageCode}`);
        [response] = await client.synthesizeSpeech({
          input: { text },
          voice: {
            languageCode,
            ssmlGender: 'FEMALE' as const,
          },
          audioConfig: {
            audioEncoding: 'MP3' as const,
            speakingRate: 1.0,
            pitch: 0.0,
          },
        });
      }
    } catch (listError: any) {
      // If listing voices fails, try with languageCode only
      console.warn('Failed to list voices, using languageCode only:', listError.message);
      [response] = await client.synthesizeSpeech({
        input: { text },
        voice: {
          languageCode,
          ssmlGender: 'FEMALE' as const,
        },
        audioConfig: {
          audioEncoding: 'MP3' as const,
          speakingRate: 1.0,
          pitch: 0.0,
        },
      });
    }

    if (!response.audioContent) {
      const error = createNextErrorResponse({ code: ErrorCodes.SERVER_ERROR }, 'TTS Audio Generation');
      return NextResponse.json({ error: error.error, message: error.message }, { status: error.status });
    }

    // Convert audio content to base64
    const audioBuffer = Buffer.from(response.audioContent);
    const base64Audio = audioBuffer.toString('base64');

    return NextResponse.json({
      audio: base64Audio,
      format: 'mp3'
    });
  } catch (error: any) {
    // Enhanced error logging for Vercel
    console.error('TTS route error:', error?.message || error, error);
    
    // Check if it's a Google Cloud authentication/configuration error
    const errorMessage = error?.message || String(error);
    const isGoogleAuthError = 
      errorMessage.includes('Could not load the default credentials') ||
      errorMessage.includes('Unable to detect a Project Id') ||
      errorMessage.includes('Could not find a default credentials file') ||
      errorMessage.includes('UNAUTHENTICATED') ||
      errorMessage.includes('PERMISSION_DENIED') ||
      errorMessage.includes('API not enabled') ||
      error?.code === 7 || // UNAUTHENTICATED
      error?.code === 403; // PERMISSION_DENIED

    if (isGoogleAuthError) {
      return NextResponse.json(
        { 
          error: 'TTS_CONFIG_ERROR',
          message: 'Google Cloud Text-to-Speech API is not configured. Please ensure the API is enabled and credentials are set up correctly.',
          actionable: 'Please ensure Google Cloud Text-to-Speech API is enabled and credentials are configured correctly.'
        },
        { status: 401 }
      );
    }

    // All other errors are sanitized
    const sanitized = createNextErrorResponse(error, 'TTS Generation');
    return NextResponse.json(
      { 
        error: sanitized.error,
        message: sanitized.message
      },
      { status: sanitized.status }
    );
  }
}
