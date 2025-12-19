import OpenAI from 'openai';

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

export async function generateInsights(chineseTranslation: string): Promise<string> {
  const systemPrompt = `You are an expert analyst and editor writing for a Chinese-speaking audience.

Your task:
- Analyze the translated article
- Provide clear, insightful interpretation
- Explain why this article matters
- Add context that a Chinese reader may not know
- Be objective, thoughtful, and informative
- Do NOT repeat the full article

Structure your response using clear sections.`;

  const userPrompt = `Based on the following translated article, provide:

1. A concise summary (3–5 bullet points)
2. Key takeaways
3. Context and interpretation (why it matters)
4. Any relevant background or implications

Translated article:
${chineseTranslation}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 2000,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || '';
}

