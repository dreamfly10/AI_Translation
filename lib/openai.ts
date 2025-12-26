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

export async function translateToChinese(text: string): Promise<string> {
  if (!isOpenAIConfigured()) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const systemPrompt = `You are a professional multilingual translator.

Your task:
- Translate the provided content into Simplified Chinese
- Preserve meaning, tone, and structure
- Keep paragraph breaks - separate paragraphs clearly with blank lines
- Do NOT summarize or add commentary
- Do NOT omit information
- Do NOT include metadata, JSON, images, or CSS
- Output ONLY clean translated text
- Use clear, natural Chinese suitable for educated readers
- Each paragraph should be clearly separated by a blank line

Output ONLY the translated text in clean paragraphs.`;

  const userPrompt = `Translate the following content into Simplified Chinese. Extract and translate only the main article text, ignoring any metadata, images, JSON, or CSS:

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

  const rawTranslation = response.choices[0]?.message?.content || '';
  
  // Clean the translation to remove any remaining metadata
  return cleanTranslationText(rawTranslation);
}

// Helper function to clean insights - remove markdown headers (###)
function cleanInsights(insights: string): string {
  // Remove markdown headers (###, ##, #)
  let cleaned = insights.replace(/^#{1,3}\s+/gm, '');
  
  // Ensure proper paragraph spacing
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return cleaned.trim();
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

  const rawInsights = response.choices[0]?.message?.content || '';
  
  // Clean insights to remove markdown headers
  return cleanInsights(rawInsights);
}

