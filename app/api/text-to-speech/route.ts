import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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

    // Determine voice for edge-tts
    // Default to Chinese if language is 'zh' or text contains Chinese characters
    const isChinese = language === 'zh' || /[\u4e00-\u9fa5]/.test(text);
    
    // Use high-quality neural voices
    let voice = 'en-US-AriaNeural'; // High-quality English female voice
    if (isChinese) {
      voice = 'zh-CN-XiaoxiaoNeural'; // High-quality Chinese female voice
    }
    
    // Create a temporary file for the audio output
    const tempDir = os.tmpdir();
    const audioFile = path.join(tempDir, `tts-${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`);

    // Create Python script to use edge-tts
    const pythonScript = `
import sys
import os
import json
import asyncio

try:
    import edge_tts
    
    async def generate_speech():
        text = ${JSON.stringify(text)}
        voice = ${JSON.stringify(voice)}
        output_path = ${JSON.stringify(audioFile)}
        
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(output_path)
        print(json.dumps({"success": True, "path": output_path}))
    
    asyncio.run(generate_speech())
except ImportError:
    print(json.dumps({"error": "edge-tts not installed. Please run: pip install edge-tts"}, file=sys.stderr))
    sys.exit(1)
except Exception as e:
    print(json.dumps({"error": str(e)}, file=sys.stderr))
    sys.exit(1)
`;

    const pythonFile = path.join(tempDir, `tts-script-${Date.now()}-${Math.random().toString(36).substring(7)}.py`);
    
    return new Promise((resolve, reject) => {
      try {
        // Write Python script to temporary file
        fs.writeFileSync(pythonFile, pythonScript);

        // Execute Python script with timeout
        const TIMEOUT = 60000; // 60 seconds timeout
        let timeoutId: NodeJS.Timeout | null = null;
        
        const pythonProcess = spawn('python', [pythonFile], {
          shell: true,
          stdio: ['ignore', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data: Buffer) => {
          stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });

        // Set timeout
        timeoutId = setTimeout(() => {
          pythonProcess.kill();
          console.error('TTS generation timeout after 60 seconds');
        }, TIMEOUT);

        pythonProcess.on('close', (code: number) => {
          // Clear timeout
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          
          // Clean up Python script
          try {
            if (fs.existsSync(pythonFile)) {
              fs.unlinkSync(pythonFile);
            }
          } catch (cleanupError) {
            console.error('Error cleaning up Python script:', cleanupError);
          }

          if (code !== 0) {
            // Try to parse JSON error from stderr or stdout
            let errorMsg = 'Unknown error';
            let parsedError: any = null;
            
            // Try to parse JSON from stderr first
            try {
              const stderrLines = stderr.trim().split('\n');
              for (const line of stderrLines) {
                try {
                  parsedError = JSON.parse(line);
                  if (parsedError.error) {
                    errorMsg = parsedError.error;
                    break;
                  }
                } catch {}
              }
            } catch {}
            
            // If no JSON found, try stdout
            if (!parsedError) {
              try {
                const stdoutLines = stdout.trim().split('\n');
                for (const line of stdoutLines) {
                  try {
                    parsedError = JSON.parse(line);
                    if (parsedError.error) {
                      errorMsg = parsedError.error;
                      break;
                    }
                  } catch {}
                }
              } catch {}
            }
            
            // If still no parsed error, use raw output
            if (!parsedError) {
              errorMsg = stderr.trim() || stdout.trim() || 'Unknown error - Python script failed';
            }
            
            console.error('edge-tts Python error:', { code, stderr, stdout, errorMsg });
            
            // Clean up audio file if it exists
            try {
              if (fs.existsSync(audioFile)) {
                fs.unlinkSync(audioFile);
              }
            } catch {}

            return reject(NextResponse.json(
              { 
                error: 'TTS generation failed', 
                details: errorMsg.includes('not installed') || errorMsg.includes('ImportError')
                  ? 'edge-tts is not installed. Please install it with: pip install edge-tts'
                  : errorMsg
              },
              { status: 500 }
            ));
          }

          // Check if audio file was created
          if (!fs.existsSync(audioFile)) {
            return reject(NextResponse.json(
              { error: 'Audio file was not generated' },
              { status: 500 }
            ));
          }

          try {
            // Read the audio file
            const audioBuffer = fs.readFileSync(audioFile);
            
            // Clean up audio file
            fs.unlinkSync(audioFile);

            // Return audio as base64
            resolve(NextResponse.json({
              audio: audioBuffer.toString('base64'),
              format: 'mp3'
            }));
          } catch (readError: any) {
            // Clean up on error
            try {
              if (fs.existsSync(audioFile)) {
                fs.unlinkSync(audioFile);
              }
            } catch {}

            reject(NextResponse.json(
              { error: 'Failed to read audio file', details: readError.message },
              { status: 500 }
            ));
          }
        });

        pythonProcess.on('error', (err: Error) => {
          // Clean up on error
          try {
            if (fs.existsSync(pythonFile)) {
              fs.unlinkSync(pythonFile);
            }
            if (fs.existsSync(audioFile)) {
              fs.unlinkSync(audioFile);
            }
          } catch {}

          console.error('Python process error:', err);
          const errorMessage = err.message.includes('spawn') 
            ? 'Python not found. Please ensure Python is installed and available in PATH.'
            : err.message;
          reject(NextResponse.json(
            { error: 'Failed to start TTS process', details: errorMessage },
            { status: 500 }
          ));
        });
      } catch (error: any) {
        // Clean up on error
        try {
          if (fs.existsSync(pythonFile)) {
            fs.unlinkSync(pythonFile);
          }
          if (fs.existsSync(audioFile)) {
            fs.unlinkSync(audioFile);
          }
        } catch {}

        reject(NextResponse.json(
          { error: 'Failed to create TTS script', details: error.message },
          { status: 500 }
        ));
      }
    });
  } catch (error: any) {
    console.error('TTS API error:', error);
    // Ensure we always return valid JSON
    try {
      return NextResponse.json(
        { error: 'Internal server error', details: error.message || String(error) },
        { status: 500 }
      );
    } catch (jsonError) {
      // Fallback if JSON.stringify fails
      return new NextResponse(
        JSON.stringify({ error: 'Internal server error', details: 'An unexpected error occurred' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
}
