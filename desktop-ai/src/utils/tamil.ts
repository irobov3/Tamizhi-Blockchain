export function isTamilScript(text: string): boolean {
  return /[஀-௿]/.test(text);
}

export function getLanguageDirection(_text: string): 'ltr' | 'rtl' {
  return 'ltr'; // Tamil is LTR
}

export function tamilRatio(text: string): number {
  if (!text) return 0;
  const matches = text.match(/[஀-௿]/g);
  return matches ? matches.length / text.length : 0;
}
