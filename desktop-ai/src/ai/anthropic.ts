import Anthropic from '@anthropic-ai/sdk';
import type { Message } from '../store/conversations';

const SYSTEM_PROMPT = `You are Tamizhi AI, fluent in Tamil and English.
When asked about Tamil literature (Thirukkural, Sangam works, Silappathikaram, Kambaramayanam),
cite specific kurals and verses by number. Default to the user's language preference.`;

export async function* streamClaude(
  apiKey: string,
  messages: Message[],
  model = 'claude-sonnet-4-5',
): AsyncGenerator<string, void, unknown> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const stream = await client.messages.stream({
    model,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: messages
      .filter((m) => m.content.trim().length > 0)
      .map((m) => ({ role: m.role, content: m.content })),
  });

  for await (const chunk of stream) {
    if (
      chunk.type === 'content_block_delta' &&
      chunk.delta.type === 'text_delta'
    ) {
      yield chunk.delta.text;
    }
  }
}
