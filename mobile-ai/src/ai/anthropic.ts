// Anthropic streaming wrapper. Uses raw fetch + SSE parsing because
// the official @anthropic-ai/sdk works in RN but the streaming events
// we need (text deltas) are easier to handle with our own SSE parser.
//
// Falls back to using @anthropic-ai/sdk for non-streaming completions.

import { CONFIG } from '../config';
import type { Message } from '../store/conversations';
import { parseSSE } from './stream';

export interface StreamOpts {
  apiKey: string;
  model?: string;
  systemPrompt?: string;
  messages: Message[];           // chronological
  signal?: AbortSignal;
  onDelta: (text: string) => void;
  onError?: (err: Error) => void;
  onDone?: (full: string) => void;
}

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

export async function streamClaude(opts: StreamOpts): Promise<string> {
  const {
    apiKey,
    model = CONFIG.DEFAULT_MODEL,
    systemPrompt = CONFIG.TAMIL_SYSTEM_PROMPT,
    messages,
    signal,
    onDelta,
    onError,
    onDone,
  } = opts;

  if (!apiKey) {
    const err = new Error('Anthropic API key missing. Add it in Settings.');
    onError?.(err);
    throw err;
  }

  // Anthropic expects role 'user' | 'assistant' only; system goes in `system`.
  const apiMessages = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: m.content }));

  let response: Response;
  try {
    response = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        system: systemPrompt,
        stream: true,
        messages: apiMessages,
      }),
      signal,
    });
  } catch (err: any) {
    const e = new Error(`Network error: ${err?.message ?? err}`);
    onError?.(e);
    throw e;
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    const e = new Error(`Anthropic error ${response.status}: ${text || response.statusText}`);
    onError?.(e);
    throw e;
  }

  let full = '';
  try {
    for await (const evt of parseSSE(response)) {
      if (evt.event === 'content_block_delta') {
        try {
          const j = JSON.parse(evt.data);
          const delta = j.delta?.text;
          if (typeof delta === 'string') {
            full += delta;
            onDelta(delta);
          }
        } catch {
          // ignore non-JSON keepalive
        }
      } else if (evt.event === 'message_stop') {
        break;
      } else if (evt.event === 'error') {
        try {
          const j = JSON.parse(evt.data);
          throw new Error(j.error?.message ?? 'stream error');
        } catch (err: any) {
          onError?.(err);
          throw err;
        }
      }
    }
    onDone?.(full);
    return full;
  } catch (err: any) {
    onError?.(err);
    throw err;
  }
}
