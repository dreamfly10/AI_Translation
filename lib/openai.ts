import OpenAI from 'openai';
import { 
  StyleArchetype, 
  getDefaultStyle, 
  getStyleSystemPrompt, 
  getStyleUserPrompt,
  styleArchetypes 
} from './prompt-styles';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function translateToChinese(text: string): Promise<string> {
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

