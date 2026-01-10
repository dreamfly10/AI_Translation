import OpenAI from 'openai';
import { 
  StyleArchetype, 
  getDefaultStyle, 
  getStyleSystemPrompt, 
  getStyleUserPrompt,
  styleArchetypes 
} from './prompt-styles';

// Get OpenAI API key
const apiKey = process.env.OPENAI_API_KEY;

// Only initialize OpenAI if API key is provided (allows build to proceed)
// Runtime code should check for OpenAI availability before use
let openaiInstance: OpenAI | null = null;

if (apiKey) {
  openaiInstance = new OpenAI({
    apiKey: apiKey,
  });
}

// Export OpenAI client - use type assertion to allow build, but check at runtime
export const openai = openaiInstance as OpenAI;

// Helper to check if OpenAI is configured
export function isOpenAIConfigured(): boolean {
  return !!openaiInstance && !!process.env.OPENAI_API_KEY;
}

// Helper function to clean translation text - remove metadata, JSON, images, CSS
function cleanTranslationText(text: string): string {
  // Remove JSON-LD structured data blocks
  let cleaned = text.replace(/\{[\s\S]*?"@context"[\s\S]*?\}/g, '');
  
  // Remove image URLs and image-related content
  cleaned = cleaned.replace(/!\[.*?\]\([^)]+\)/g, ''); // Markdown images
  cleaned = cleaned.replace(/<img[^>]*>/gi, ''); // HTML images
  cleaned = cleaned.replace(/https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg)/gi, ''); // Image URLs
  
  // Remove CSS blocks
  cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, '');
  cleaned = cleaned.replace(/@media[^{]*\{[^}]*\}/g, ''); // CSS media queries
  
  // Remove HTML tags but keep text content
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');
  
  // Remove URLs (but keep text that might look like URLs)
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '');
  
  // Clean up excessive whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n'); // Max 2 newlines
  cleaned = cleaned.replace(/[ \t]+/g, ' '); // Multiple spaces to single
  
  // Remove any remaining JSON-like structures
  cleaned = cleaned.replace(/\{[^}]{0,200}\}/g, '');
  
  // Split into paragraphs and clean each
  const paragraphs = cleaned.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
  
  // Filter out paragraphs that look like metadata or code
  const cleanedParagraphs = paragraphs.filter(p => {
    // Skip if it's mostly JSON-like or code-like
    if (/^[\{\[].*[\}\]]$/.test(p) || p.includes('"@type"') || p.includes('"@context"')) {
      return false;
    }
    // Skip very short paragraphs that look like metadata
    if (p.length < 20 && /^[A-Z_]+:/.test(p)) {
      return false;
    }
    return true;
  });
  
  return cleanedParagraphs.join('\n\n').trim();
}

// Language mapping for display names
const LANGUAGE_NAMES: Record<string, string> = {
  'zh': 'Simplified Chinese',
  'en': 'English',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'ja': 'Japanese',
  'ko': 'Korean',
  'pt': 'Portuguese',
  'it': 'Italian',
  'ru': 'Russian',
  'ar': 'Arabic',
};

export async function translateTo(text: string, targetLanguageCode: string = 'zh'): Promise<string> {
  if (!isOpenAIConfigured()) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const targetLanguage = LANGUAGE_NAMES[targetLanguageCode] || 'Simplified Chinese';

  const systemPrompt = `You are a professional multilingual translator.

Your task:
- Translate the provided content into ${targetLanguage}
- Preserve meaning, tone, and structure
- Keep paragraph breaks - separate paragraphs clearly with blank lines
- Do NOT summarize or add commentary
- Do NOT omit information
- Do NOT include metadata, JSON, images, or CSS
- Do NOT use markdown formatting (no **, __, *, _, #, [], etc.)
- Output ONLY clean translated text without any formatting
- Use clear, natural ${targetLanguage} suitable for educated readers
- Each paragraph should be clearly separated by a blank line

Output ONLY the translated text in clean paragraphs without any markdown or formatting.`;

  const userPrompt = `Translate the following content into ${targetLanguage}. Extract and translate only the main article text, ignoring any metadata, images, JSON, or CSS:

${text}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4000,
      temperature: 0.3,
    });

    let rawTranslation = response.choices[0]?.message?.content || '';
    
    if (!rawTranslation || rawTranslation.trim().length === 0) {
      throw new Error('Translation returned empty result');
    }
    
    // Remove any markdown formatting that might have been added
    rawTranslation = rawTranslation.replace(/\*\*([^*]+)\*\*/g, '$1');
    rawTranslation = rawTranslation.replace(/__([^_]+)__/g, '$1');
    rawTranslation = rawTranslation.replace(/\*([^*]+)\*/g, '$1');
    rawTranslation = rawTranslation.replace(/_([^_]+)_/g, '$1');
    rawTranslation = rawTranslation.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
    rawTranslation = rawTranslation.replace(/^#{1,3}\s+/gm, '');
    
    // Clean the translation to remove any remaining metadata
    return cleanTranslationText(rawTranslation);
  } catch (error: any) {
    // Handle OpenAI API errors
    if (error?.code === 'rate_limit_exceeded') {
      throw new Error('OpenAI API rate limit exceeded. Please try again in a moment.');
    } else if (error?.code === 'invalid_api_key') {
      throw new Error('OpenAI API key is invalid. Please contact support.');
    } else if (error?.code === 'insufficient_quota') {
      throw new Error('OpenAI API quota exceeded. Please contact support.');
    } else if (error?.message) {
      throw new Error(`Translation failed: ${error.message}`);
    } else {
      throw new Error('Translation failed due to an unknown error. Please try again.');
    }
  }
}

// Backward compatibility: keep translateToChinese as an alias
export async function translateToChinese(text: string): Promise<string> {
  return translateTo(text, 'zh');
}

// Helper function to clean insights - remove markdown formatting
function cleanInsights(insights: string): string {
  // Remove markdown headers (###, ##, #)
  let cleaned = insights.replace(/^#{1,3}\s+/gm, '');
  
  // Remove markdown bold (**text** or __text__)
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
  
  // Remove markdown italic (*text* or _text_)
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
  cleaned = cleaned.replace(/_([^_]+)_/g, '$1');
  
  // Remove markdown links [text](url)
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
  
  // Ensure proper paragraph spacing
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return cleaned.trim();
}

export async function generateInsights(
  translation: string,
  style: StyleArchetype = getDefaultStyle(),
  voiceProfileId?: string,
  targetLanguageCode: string = 'zh',
  rewritingLevel?: 'light' | 'medium' | 'heavy'
): Promise<string> {
  if (!isOpenAIConfigured()) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  let systemPrompt: string;
  let userPrompt: string;
  let maxTokens: number;
  let temperature: number;

  const targetLanguage = LANGUAGE_NAMES[targetLanguageCode] || 'Simplified Chinese';

  // If voice profile is provided, use it instead of default style
  if (voiceProfileId) {
    const { db } = await import('./db');
    const profile = await db.voiceProfile.findById(voiceProfileId);
    
    if (!profile) {
      throw new Error(`Voice profile ${voiceProfileId} not found`);
    }

    const rewritingInstruction = rewritingLevel === 'light' 
      ? 'Keep the original structure and wording similar, with minimal changes.'
      : rewritingLevel === 'heavy'
      ? 'Significantly rewrite the logic and expression while maintaining the core message.'
      : 'Modify the structure and wording moderately.';

    // Check if profile has custom prompt (profileType is 'prompt' or 'both')
    if (profile.customPrompt && (profile.profileType === 'prompt' || profile.profileType === 'both')) {
      // Use custom prompt directly as system prompt
      if (profile.profileType === 'prompt') {
        // Custom prompt only
        systemPrompt = profile.customPrompt;
        
        userPrompt = `Based on the following translated article, follow the instructions in your system prompt to write an insightful interpretation.

**Article to analyze:**
${translation}

**Expression Variation Level: ${rewritingLevel || 'medium'}**
${rewritingInstruction}

**Your task:**
1. Write an engaging opening (2-3 sentences) that hooks the reader
2. Develop 3 main sections with clear subheadings, each containing:
   - A clear viewpoint
   - Supporting evidence (examples, scenarios, or logical reasoning)
   - Boundaries/limitations (when this doesn't apply)
3. End with exactly 3 actionable suggestions or thought-provoking questions

**Remember:**
- Follow your system prompt instructions closely
- Write in ${targetLanguage}
- Do NOT use markdown formatting (no **, __, *, _, #, [], etc.) in your output
- Write in plain text only`;
      } else {
        // Both custom prompt and style rules
        const samples = await db.voiceSample.findByProfileId(voiceProfileId);
        const representativeSamples = samples.length > 0 
          ? samples.slice(0, 2).map(s => s.content.substring(0, 500))
          : [];
        
        // Combine custom prompt with extracted style rules
        systemPrompt = `${profile.customPrompt}

**Additional Style Guidelines (from your writing samples):**
${profile.styleRules?.tone ? `Tone: ${profile.styleRules.tone}` : ''}
${profile.styleRules?.sentencePatterns ? `Sentence Patterns: ${profile.styleRules.sentencePatterns}` : ''}
${(profile.styleRules?.avoid || []).length > 0 
  ? `Things to Avoid:\n${(profile.styleRules.avoid || []).map((item: string) => `- ${item}`).join('\n')}`
  : ''}

**Important Guidelines:**
- Write naturally in ${targetLanguage}
- Follow your custom prompt instructions above
- Incorporate the style characteristics from your writing samples
- Make it sound like you wrote this, not an AI
- Use evidence and examples to support your points
- Always include boundaries/limitations for your arguments
- End with exactly 3 actionable suggestions or thought-provoking questions
- Do NOT use markdown formatting (no **, __, *, _, #, [], etc.) in your output
- Write in plain text only`;
        
        userPrompt = `Based on the following translated article, write an insightful interpretation following your system prompt and style guidelines.

**Your Writing Samples (for reference):**
${representativeSamples.length > 0 
  ? representativeSamples.map((sample, i) => `Sample ${i + 1}:\n${sample}...`).join('\n\n---\n\n')
  : 'No samples available.'}

**Article to analyze:**
${translation}

**Expression Variation Level: ${rewritingLevel || 'medium'}**
${rewritingInstruction}

**Your task:**
1. Write an engaging opening (2-3 sentences) that hooks the reader
2. Develop 3 main sections with clear subheadings, each containing:
   - A clear viewpoint
   - Supporting evidence (examples, scenarios, or logical reasoning)
   - Boundaries/limitations (when this doesn't apply)
3. End with exactly 3 actionable suggestions or thought-provoking questions

**Remember:**
- Follow your custom prompt instructions
- Match the tone and style from your writing samples
- Make it feel like you wrote this, not an AI
- Vary your language and structure throughout
- Follow the expression variation level specified above
- Do NOT use markdown formatting (no **, __, *, _, #, [], etc.) in your output
- Write in plain text only`;
      }

      // Use default style config for token limits
      const styleConfig = styleArchetypes[style];
      maxTokens = styleConfig.maxTokens;
      
      // Adjust temperature based on rewriting level
      const baseTemperature = styleConfig.temperature;
      if (rewritingLevel === 'light') {
        temperature = Math.max(0.3, baseTemperature - 0.15);
      } else if (rewritingLevel === 'heavy') {
        temperature = Math.min(0.95, baseTemperature + 0.15);
      } else {
        temperature = baseTemperature; // medium or default
      }
    } else if (profile.styleRules && typeof profile.styleRules === 'object') {
      // Use extracted style rules only (backward compatibility)
      // Get 1-2 most representative samples
      const samples = await db.voiceSample.findByProfileId(voiceProfileId);
      
      if (!samples || samples.length === 0) {
        throw new Error(`Voice profile ${voiceProfileId} has no samples. Please add at least 1 sample.`);
      }
      
      const representativeSamples = samples.slice(0, 2).map(s => s.content);
      
      // Validate styleRules structure
      if (!profile.styleRules.tone && !profile.styleRules.sentencePatterns) {
        throw new Error(`Voice profile ${voiceProfileId} has incomplete style rules. Please re-extract style rules.`);
      }

      // Build system prompt with voice profile rules
      systemPrompt = `You are an expert writer writing in the user's personal voice and style.

**User's Voice Characteristics:**
Tone: ${profile.styleRules.tone || 'N/A'}
Sentence Patterns: ${profile.styleRules.sentencePatterns || 'N/A'}

**Things to Avoid:**
${(profile.styleRules.avoid || []).map((item: string) => `- ${item}`).join('\n')}

**Important Guidelines:**
- Write naturally in ${targetLanguage}
- Match the user's tone and style characteristics
- Use the user's typical sentence patterns
- Avoid generic AI language, marketing tone, and clichés
- Make it sound like the user wrote this, not an AI
- Use evidence and examples to support your points
- Always include boundaries/limitations for your arguments
- End with exactly 3 actionable suggestions or thought-provoking questions
- Do NOT use markdown formatting (no **, __, *, _, #, [], etc.) in your output
- Write in plain text only`;

      // Build user prompt with representative samples
      userPrompt = `Based on the following translated article, write an insightful interpretation in the user's personal voice.

**User's Writing Samples (for reference):**
${representativeSamples.length > 0 
  ? representativeSamples.map((sample, i) => `Sample ${i + 1}:\n${sample.substring(0, 500)}...`).join('\n\n---\n\n')
  : 'No samples available.'}

**Article to analyze:**
${translation}

**Expression Variation Level: ${rewritingLevel || 'medium'}**
${rewritingInstruction}

**Your task:**
1. Write an engaging opening (2-3 sentences) that hooks the reader
2. Develop 3 main sections with clear subheadings, each containing:
   - A clear viewpoint
   - Supporting evidence (examples, scenarios, or logical reasoning)
   - Boundaries/limitations (when this doesn't apply)
3. End with exactly 3 actionable suggestions or thought-provoking questions

**Remember:**
- Write in the user's personal voice - match their tone, sentence patterns, and style
- Avoid the things listed in "Things to Avoid"
- Make it feel like the user wrote this, not an AI
- Vary your language and structure throughout
- Follow the expression variation level specified above
- Do NOT use markdown formatting (no **, __, *, _, #, [], etc.) in your output
- Write in plain text only`;

      // Use default style config for voice profiles
      const styleConfig = styleArchetypes[style];
      maxTokens = styleConfig.maxTokens;
      
      // Adjust temperature based on rewriting level
      const baseTemperature = styleConfig.temperature;
      if (rewritingLevel === 'light') {
        temperature = Math.max(0.3, baseTemperature - 0.15);
      } else if (rewritingLevel === 'heavy') {
        temperature = Math.min(0.95, baseTemperature + 0.15);
      } else {
        temperature = baseTemperature; // medium or default
      }
    } else {
      throw new Error(`Voice profile ${voiceProfileId} does not have valid style rules or custom prompt. Please add either writing samples or a custom prompt.`);
    }
  } else {
    // Use default style system
    const styleConfig = styleArchetypes[style];
    const baseSystemPrompt = getStyleSystemPrompt(style);
    // Replace all Chinese references with target language
    systemPrompt = baseSystemPrompt
      .replace(/Simplified Chinese/g, targetLanguage)
      .replace(/Chinese-speaking audience/g, `${targetLanguage}-speaking audience`)
      .replace(/Write naturally in Simplified Chinese/g, `Write naturally in ${targetLanguage}`);
    
    // Adjust user prompt based on rewriting level
    const baseUserPrompt = getStyleUserPrompt(translation, style);
    const rewritingInstruction = rewritingLevel === 'light' 
      ? '\n\n**Expression Variation: Light** - Keep the original structure and wording similar, with minimal changes.'
      : rewritingLevel === 'heavy'
      ? '\n\n**Expression Variation: Heavy** - Significantly rewrite the logic and expression while maintaining the core message.'
      : '\n\n**Expression Variation: Medium** - Modify the structure and wording moderately.';
    
    userPrompt = baseUserPrompt + rewritingInstruction;
    maxTokens = styleConfig.maxTokens;
    
    // Adjust temperature based on rewriting level
    const baseTemperature = styleConfig.temperature;
    if (rewritingLevel === 'light') {
      temperature = Math.max(0.3, baseTemperature - 0.15);
    } else if (rewritingLevel === 'heavy') {
      temperature = Math.min(0.95, baseTemperature + 0.15);
    } else {
      temperature = baseTemperature; // medium or default
    }
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: maxTokens,
    temperature: temperature,
  });

  const rawInsights = response.choices[0]?.message?.content || '';
  
  // Clean insights to remove markdown headers
  return cleanInsights(rawInsights);
}

