// Server-Sent Events parser tolerant of fetch's ReadableStream on RN.
// Yields parsed `data:` payloads from an SSE byte stream.

export async function* parseSSE(
  response: Response,
): AsyncGenerator<{ event: string; data: string }> {
  if (!response.body) {
    throw new Error('No response body for SSE stream');
  }
  const reader = (response.body as any).getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep: number;
    // SSE events are separated by a blank line.
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      let event = 'message';
      const dataLines: string[] = [];
      for (const line of raw.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
      }
      if (dataLines.length) yield { event, data: dataLines.join('\n') };
    }
  }
}
