/**
 * Tamizhi.AI — in-chat AI assistant
 *
 * Uses an OpenAI-compatible chat-completions endpoint.
 * Point TAMIZHI_AI_URL at any compatible service:
 *   - OpenAI:     https://api.openai.com/v1
 *   - Anthropic (via proxy): https://api.anthropic.com/v1
 *   - Local LLM:  http://localhost:11434/v1  (Ollama)
 *   - Self-hosted: http://<your-server>/v1
 */

import axios from 'axios';
import { CONFIG } from '../config';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Sentinel conversation ID — checked in chat screen to route to AI API */
export const AI_ASSISTANT_ID = 'tamizhi_ai_assistant';
export const AI_ASSISTANT_NAME = 'Tamizhi.AI';
export const AI_ASSISTANT_COLOR = '#7c3aed';  // purple

/** Max messages to include as context (older messages are dropped) */
const MAX_CONTEXT_MESSAGES = 20;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIReply {
  text: string;
  tokensUsed?: number;
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Tamizhi.AI, the intelligent assistant embedded inside the Tamizhi Messenger — a privacy-first, blockchain-powered communication platform built on the Tamizhi chain.

Your personality:
- Friendly, concise, and technically knowledgeable
- Focused on blockchain, privacy, crypto, and secure communication topics
- Can help with general questions too (coding, writing, analysis)
- You speak naturally — no excessive bullet points, no corporate speak

What you know about Tamizhi:
- Tamizhi is a permissioned Cosmos SDK blockchain (chain ID: tamizhi-sec-1)
- Native token: TMZ (minimal denom: utmz, 6 decimals)
- End-to-end encrypted messaging using NaCl (X25519-XSalsa20-Poly1305)
- Session IDs are Ed25519/X25519 keypairs derived from BIP-39 mnemonics
- Smart contracts: payments, rewards, access_control, threat_response, call_payments
- Supports P2P audio/video calls via WebRTC
- Storage server runs on port 8100, router node on 8101

Reply rules:
- Keep answers focused and under 300 words unless asked for detail
- For code, use markdown code blocks
- If you don't know something specific about Tamizhi internals, say so honestly
- Never ask for private keys, mnemonics, or sensitive credentials`;

// ── AI client ─────────────────────────────────────────────────────────────────

const AI_CONFIG = {
  // Override these in your .env or config
  baseURL: (CONFIG as any).AI_API_URL || 'https://api.openai.com/v1',
  apiKey:  (CONFIG as any).AI_API_KEY  || '',
  model:   (CONFIG as any).AI_MODEL    || 'gpt-4o-mini',
};

const aiClient = axios.create({
  baseURL: AI_CONFIG.baseURL,
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json',
    ...(AI_CONFIG.apiKey ? { Authorization: `Bearer ${AI_CONFIG.apiKey}` } : {}),
  },
});

/**
 * Send a chat history to the AI and get a reply.
 * `history` should contain recent user/assistant messages.
 */
export async function askAI(
  userMessage: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
): Promise<AIReply> {
  // Build message list: system + trimmed history + new user message
  const contextMessages = history.slice(-MAX_CONTEXT_MESSAGES);

  const messages: AIChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...contextMessages,
    { role: 'user', content: userMessage },
  ];

  const response = await aiClient.post('/chat/completions', {
    model: AI_CONFIG.model,
    messages,
    max_tokens: 800,
    temperature: 0.7,
    stream: false,
  });

  const choice = response.data.choices?.[0];
  const text: string = choice?.message?.content?.trim() ?? 'Sorry, I could not generate a response.';
  const tokensUsed: number | undefined = response.data.usage?.total_tokens;

  return { text, tokensUsed };
}

/**
 * Build the AI context array from stored conversation messages.
 * Filters to only include the last MAX_CONTEXT_MESSAGES user/assistant turns.
 */
export function buildAIContext(
  messages: Array<{ text: string; type: 'sent' | 'received' }>,
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages
    .slice(-MAX_CONTEXT_MESSAGES)
    .map((m) => ({
      role: m.type === 'sent' ? ('user' as const) : ('assistant' as const),
      content: m.text,
    }));
}

/**
 * Simple offline fallback — used when AI API is unreachable.
 * Returns a helpful error message rather than crashing.
 */
export function offlineFallback(error: unknown): string {
  const err = error as any;
  if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
    return "I'm taking too long to respond — the AI service might be slow. Try again in a moment.";
  }
  if (err?.response?.status === 401) {
    return 'AI service authentication failed. Please check the API key in your settings.';
  }
  if (err?.response?.status === 429) {
    return "I've hit the rate limit. Please wait a moment and try again.";
  }
  if (!navigator.onLine) {
    return "You're offline. Connect to the internet to chat with Tamizhi.AI.";
  }
  return `Something went wrong: ${err?.message ?? 'Unknown error'}. Try again later.`;
}
