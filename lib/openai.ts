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
const openai = openaiInstance as OpenAI;

// Helper to check if OpenAI is configured
export function isOpenAIConfigured(): boolean {
  return !!openaiInstance && !!process.env.OPENAI_API_KEY;
}

export async function translateToChinese(text: string): Promise<string> {
  if (!isOpenAIConfigured()) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const systemPrompt = `You are a professional multilingual translator.

Your task:
- Translate the provided content into Simplified Chinese
- Preserve meaning, tone, and structure
- Keep paragraph breaks, headings, and quotes
- Do NOT summarize or add commentary
- Do NOT omit information
- Use clear, natural Chinese suitable for educated readers

Output ONLY the translated text.`;

  const userPrompt = `Translate the following content into Simplified Chinese:

${text}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 4000,
    temperature: 0.3,
  });

  return response.choices[0]?.message?.content || '';
}

export async function generateInsights(
  chineseTranslation: string,
  style: StyleArchetype = getDefaultStyle()
): Promise<string> {
  if (!isOpenAIConfigured()) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const styleConfig = styleArchetypes[style];
  const systemPrompt = getStyleSystemPrompt(style);
  const userPrompt = getStyleUserPrompt(chineseTranslation, style);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: styleConfig.maxTokens,
    temperature: styleConfig.temperature,
  });

  return response.choices[0]?.message?.content || '';
}

