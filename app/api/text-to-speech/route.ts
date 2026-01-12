import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

// Initialize Google Cloud TTS client
let ttsClient: TextToSpeechClient | null = null;

function getTTSClient(): TextToSpeechClient {
  if (ttsClient) {
    return ttsClient;
  }

  // Try to initialize from environment variable (JSON string)
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (credentialsJson) {
    try {
      const credentials = JSON.parse(credentialsJson);
      ttsClient = new TextToSpeechClient({ credentials });
      return ttsClient;
    } catch (error) {
      console.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', error);
    }
  }

  // Fallback: try individual environment variables
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const privateKey = process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.GOOGLE_CLOUD_CLIENT_EMAIL;

  if (projectId && privateKey && clientEmail) {
    ttsClient = new TextToSpeechClient({
      projectId,
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
    });
    return ttsClient;
  }

  // Last resort: try default credentials (for local development)
  ttsClient = new TextToSpeechClient();
  return ttsClient;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { text, language } = await request.json();

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Determine language for Google Cloud TTS
    // Default to Chinese if language is 'zh' or text contains Chinese characters
    const isChinese = language === 'zh' || /[\u4e00-\u9fa5]/.test(text);
    
    const languageCode = isChinese ? 'zh-CN' : 'en-US';

    // Get TTS client
    const client = getTTSClient();

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
      return NextResponse.json(
        { error: 'No audio content received from TTS service' },
        { status: 500 }
      );
    }

    // Convert audio content to base64
    const audioBuffer = Buffer.from(response.audioContent);
    const base64Audio = audioBuffer.toString('base64');

    return NextResponse.json({
      audio: base64Audio,
      format: 'mp3'
    });
  } catch (error: any) {
    console.error('Google Cloud TTS error:', error);
    
    // Provide helpful error messages
    let errorMessage = 'TTS generation failed';
    let details = error.message || String(error);
    
    if (error.message?.includes('credentials') || error.message?.includes('authentication')) {
      errorMessage = 'TTS authentication failed';
      details = 'Google Cloud credentials are missing or invalid. Please check your environment variables.';
    } else if (error.message?.includes('quota') || error.message?.includes('billing')) {
      errorMessage = 'TTS quota exceeded';
      details = 'Google Cloud TTS quota has been exceeded. Please check your billing and quota settings.';
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        details 
      },
      { status: 500 }
    );
  }
}
