// Tamizhi AI — AI service library
// Uses Anthropic non-streaming endpoint and simulates streaming via word-by-word replay.

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

const SYSTEM_PROMPT =
  "You are Tamizhi AI, an assistant for the Tamizhi blockchain and Tamil culture. " +
  "You speak both Tamil and English. For Tamil questions, prefer to respond in Tamil " +
  "with English translation. When citing Tamil literature (Thirukkural, Silappathikaram, " +
  "Sangam works), quote source couplets accurately. For blockchain questions about " +
  "Tamizhi (TMZ token), provide accurate staking, validator, and explorer guidance.";

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-3-5-sonnet-20241022";

/**
 * Send messages to the Anthropic API and simulate streaming via word replay.
 * @param messages   Conversation history (user + assistant only; system is injected).
 * @param apiKey     Anthropic API key (sk-ant-…).
 * @param onChunk    Called with each word (plus trailing space) as streaming simulation.
 * @returns          Full assistant response text.
 */
export async function sendMessage(
  messages: Message[],
  apiKey: string,
  onChunk: (text: string) => void
): Promise<string> {
  if (!apiKey) {
    throw new Error("Anthropic API key missing. Add it in Settings.");
  }

  const apiMessages = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, content: m.content }));

  let response: Response;
  try {
    response = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        // Required for direct browser / React Native access
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: apiMessages,
      }),
    });
  } catch (err: any) {
    throw new Error(`Network error: ${err?.message ?? String(err)}`);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Anthropic error ${response.status}: ${text || response.statusText}`
    );
  }

  const json = await response.json();
  const fullText: string =
    json?.content?.[0]?.text ?? json?.completion ?? "";

  // Simulate streaming: replay words with 30 ms gap.
  await simulateStream(fullText, onChunk);

  return fullText;
}

async function simulateStream(
  text: string,
  onChunk: (chunk: string) => void
): Promise<void> {
  // Split on whitespace boundaries, preserving the separators.
  const tokens = text.split(/(\s+)/);
  for (const token of tokens) {
    if (token.length === 0) continue;
    onChunk(token);
    await delay(30);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
