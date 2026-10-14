/**
 * Ulaa Browser — AI Assistant
 * Connects to any OpenAI-compatible endpoint
 */

import axios from 'axios';
import { useBrowser } from '../store/useBrowser';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIReply {
  text: string;
  tokens?: number;
}

const SYSTEM_PROMPT = `You are Ulaa AI, the intelligent assistant built into Ulaa Browser — a Tamil-first, privacy-focused web browser.

Your capabilities:
- Summarize web pages in Tamil or English
- Translate any content to Tamil
- Answer questions about the current page
- Help with web research, coding, writing
- Fact-check claims from web pages
- Explain complex topics simply

Personality:
- Friendly, concise, culturally aware of Tamil culture and language
- Prefer Tamil when the user writes in Tamil
- For code, use markdown code blocks
- For summaries, use bullet points in the user's language
- Keep answers under 400 words unless asked for more detail

You have access to the current page's text content when the user asks about a specific page. Use it to give accurate, grounded answers.`;

export async function askAI(
  userMessage: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  pageContext?: string,
): Promise<AIReply> {
  const { settings } = useBrowser.getState();

  if (!settings.aiApiKey) {
    throw new Error('NO_API_KEY');
  }

  const messages: AIMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];

  // Inject page context if available
  if (pageContext && pageContext.length > 50) {
    messages.push({
      role: 'system',
      content: `Current page content (first 6000 chars):\n\n${pageContext.slice(0, 6000)}`,
    });
  }

  // Add conversation history (last 10 turns)
  messages.push(...history.slice(-10));
  messages.push({ role: 'user', content: userMessage });

  const client = axios.create({
    baseURL: settings.aiApiUrl || 'https://api.openai.com/v1',
    timeout: 45_000,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.aiApiKey}`,
    },
  });

  const res = await client.post('/chat/completions', {
    model: settings.aiModel || 'gpt-4o-mini',
    messages,
    max_tokens: 1000,
    temperature: 0.7,
    stream: false,
  });

  const text: string =
    res.data.choices?.[0]?.message?.content?.trim() ??
    'மன்னிக்கவும், பதில் கிடைக்கவில்லை.';

  return { text, tokens: res.data.usage?.total_tokens };
}

export function buildPrompt(action: 'summarize' | 'translate' | 'factcheck' | 'explain'): string {
  const prompts = {
    summarize: 'இந்த பக்கத்தை தமிழில் சுருக்கமாக விளக்கு (5 முக்கிய புள்ளிகளில்).',
    translate: 'இந்த பக்கத்தின் முக்கிய உள்ளடக்கத்தை தமிழில் மொழிபெயர்.',
    factcheck: 'இந்த பக்கத்தில் உள்ள முக்கிய கூற்றுகளை ஆய்வு செய்து, உண்மைத் தன்மையை மதிப்பிடு.',
    explain:   'இந்த பக்கத்தின் உள்ளடக்கத்தை எளிய தமிழில் விளக்கு.',
  };
  return prompts[action];
}

export function errorMessage(err: unknown): string {
  const e = err as any;
  if (e?.message === 'NO_API_KEY')
    return 'AI API திறவுகோல் அமைக்கப்படவில்லை. அமைப்புகளில் சேர்க்கவும்.';
  if (e?.code === 'ECONNABORTED' || e?.message?.includes('timeout'))
    return 'AI சேவை மெதுவாக உள்ளது. சற்று நேரம் கழித்து முயற்சிக்கவும்.';
  if (e?.response?.status === 401)
    return 'API திறவுகோல் தவறானது. அமைப்புகளில் சரிபார்க்கவும்.';
  if (e?.response?.status === 429)
    return 'வினாடி வரம்பு மீறப்பட்டது. சற்று நேரம் காத்திருக்கவும்.';
  if (e?.response?.status === 503)
    return 'AI சேவை தற்போது கிடைக்கவில்லை. பின்னர் முயற்சிக்கவும்.';
  return `பிழை: ${e?.message ?? 'தெரியாத பிழை'}`;
}
