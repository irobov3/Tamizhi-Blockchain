const SYSTEM_PROMPT = `You are Tamizhi AI, a specialized assistant for:
1. The Tamizhi blockchain ecosystem (staking, validators, transactions, CosmWasm)
2. Tamil language, literature, and culture (Thirukkural, Sangam poetry, Tamil history)
3. Web3 and DeFi concepts explained simply

When asked about Tamil topics, include the original Tamil text where relevant.
Be helpful, accurate, and concise. Speak in English by default, Tamil when asked.`

export async function sendMessage(
  messages: { role: string; content: string }[],
  apiKey: string,
  model: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
): Promise<void> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages,
      }),
    })

    if (!response.ok) {
      let errMsg = `API error ${response.status}`
      try {
        const errBody = await response.json()
        errMsg = errBody?.error?.message ?? errMsg
      } catch {
        // ignore
      }
      onError(errMsg)
      return
    }

    const data = await response.json()
    const responseText: string =
      data?.content?.[0]?.text ?? ''

    if (!responseText) {
      onError('Empty response from API')
      return
    }

    // Simulate streaming word-by-word
    const words = responseText.split(' ')
    for (const word of words) {
      onChunk(word + ' ')
      await new Promise<void>((r) => setTimeout(r, 25))
    }

    onDone()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    onError(msg)
  }
}
