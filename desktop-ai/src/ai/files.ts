// File ingestion: PDF via pdfjs-dist, MD/TXT direct, images base64-encoded.
// Note: pdfjs-dist worker setup may need adjustment for Tauri webview.

export async function extractFileText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) {
    return extractPdf(file);
  }
  if (name.endsWith('.md') || name.endsWith('.markdown') || name.endsWith('.txt')) {
    return file.text();
  }
  if (file.type.startsWith('image/')) {
    return await encodeImage(file);
  }
  // Fallback to text
  return file.text();
}

async function extractPdf(file: File): Promise<string> {
  const pdfjs: any = await import('pdfjs-dist');
  // In Tauri webview, disable worker to avoid worker-loading issues.
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = '';
  } catch {
    /* ignore */
  }
  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({
    data: buffer,
    disableWorker: true,
    isEvalSupported: false,
  }).promise;
  const out: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    const text = tc.items.map((it: any) => ('str' in it ? it.str : '')).join(' ');
    out.push(`# Page ${i}\n${text}`);
  }
  return out.join('\n\n');
}

async function encodeImage(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 = btoa(binary);
  return `[image:${file.type};base64,${b64.slice(0, 80)}...] (${bytes.byteLength} bytes)`;
}
