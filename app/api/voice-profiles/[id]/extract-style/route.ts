import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { isSupabaseConfigured } from '@/lib/supabase';
import { openai, isOpenAIConfigured } from '@/lib/openai';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'DATABASE_UNAVAILABLE', message: 'Database is not configured' },
        { status: 500 }
      );
    }

    if (!isOpenAIConfigured()) {
      return NextResponse.json(
        { error: 'OPENAI_NOT_CONFIGURED', message: 'OpenAI is not configured' },
        { status: 500 }
      );
    }

    const profile = await db.voiceProfile.findById(params.id);
    if (!profile) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Voice profile not found' },
        { status: 404 }
      );
    }

    if (profile.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'You do not have access to this voice profile' },
        { status: 403 }
      );
    }

    // Fetch all samples
    const samples = await db.voiceSample.findByProfileId(profile.id);
    if (samples.length < 3) {
      return NextResponse.json(
        { error: 'INSUFFICIENT_SAMPLES', message: 'At least 3 samples are required' },
        { status: 400 }
      );
    }

    // Combine all samples for analysis
    const combinedSamples = samples.map(s => s.content).join('\n\n---\n\n');

    // Extract style rules using OpenAI
    const systemPrompt = `You are an expert writing style analyst. Your task is to analyze writing samples and extract the author's unique voice and style characteristics.

Analyze the provided writing samples and extract:
1. Tone characteristics (formal/informal, warm/cool, conversational/academic, etc.)
2. Sentence patterns (short/long, simple/complex, use of questions, etc.)
3. Typical openings and endings
4. Common transitions and connecting phrases
5. Things to avoid (AI clichés, marketing tone, generic phrases, etc.)
6. Unique stylistic elements (metaphors, analogies, rhetorical devices, etc.)

Return your analysis as a JSON object with the following structure:
{
  "tone": "description of tone characteristics",
  "sentencePatterns": "description of sentence structure patterns",
  "openings": ["typical opening patterns"],
  "endings": ["typical ending patterns"],
  "transitions": ["common transition phrases"],
  "avoid": ["things to avoid", "AI clichés", "generic phrases"],
  "uniqueElements": ["unique stylistic elements"]
}`;

    const userPrompt = `Analyze the following writing samples and extract the author's voice and style:

${combinedSamples}

Provide a detailed analysis of the writing style in JSON format.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3, // Lower temperature for more consistent analysis
      response_format: { type: 'json_object' },
    });

    const rawContent = completion.choices[0].message.content || '{}';
    let styleRules: any;
    
    try {
      styleRules = JSON.parse(rawContent);
    } catch (parseError) {
      console.error('Error parsing style rules JSON:', parseError);
      return NextResponse.json(
        { 
          error: 'PARSE_ERROR', 
          message: 'Failed to parse style rules from OpenAI response',
          userMessage: 'Failed to extract style rules. Please try again.'
        },
        { status: 500 }
      );
    }
    
    // Validate style rules structure
    if (!styleRules || typeof styleRules !== 'object') {
      return NextResponse.json(
        { 
          error: 'INVALID_STYLE_RULES', 
          message: 'Invalid style rules structure',
          userMessage: 'The extracted style rules are invalid. Please try again or contact support.'
        },
        { status: 500 }
      );
    }

    // Update profile with extracted style rules
    const updated = await db.voiceProfile.update(params.id, {
      styleRules,
    });

    return NextResponse.json({
      profile: updated,
      styleRules,
    });
  } catch (error) {
    console.error('Error extracting style:', error);
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'Failed to extract style rules' },
      { status: 500 }
    );
  }
}

