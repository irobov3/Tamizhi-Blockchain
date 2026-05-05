import type { WorkType } from './types';

// ── Work type display helpers ──

export function formatWorkType(type: WorkType | string): string {
  switch (type) {
    case 'poem':    return 'Poem';
    case 'prose':   return 'Prose';
    case 'epic':    return 'Epic';
    case 'grammar': return 'Grammar';
    default:        return 'Unknown';
  }
}

export function workTypeInTamil(type: WorkType | string): string {
  switch (type) {
    case 'poem':    return 'கவிதை';
    case 'prose':   return 'உரைநடை';
    case 'epic':    return 'காவியம்';
    case 'grammar': return 'இலக்கணம்';
    default:        return '';
  }
}

// ── Hash helpers ──

export function truncateHash(hash: string, leading = 8, trailing = 8): string {
  if (!hash) return '';
  if (hash.length <= leading + trailing + 3) return hash;
  return `${hash.slice(0, leading)}…${hash.slice(-trailing)}`;
}

export function isValidContentHash(hash: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(hash);
}

// ── Era / century formatting ──

export function formatEra(century?: string, era?: string): string {
  if (era && century) return `${century} (${era})`;
  if (era) return era;
  if (century) return century;
  return 'Era unknown';
}

export function formatCentury(century: string): string {
  if (!century) return '';
  // Normalise "5" → "5th century", "BCE 3" → "3rd century BCE", etc.
  const cleaned = century.trim();
  const match = cleaned.match(/^(\d+)(?:st|nd|rd|th)?(?:\s*(BCE|CE|AD|BC))?$/i);
  if (!match) return cleaned;
  const n = parseInt(match[1], 10);
  const suffix = ordinalSuffix(n);
  const era = match[2] ? ` ${match[2].toUpperCase()}` : '';
  return `${n}${suffix} century${era}`;
}

function ordinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0];
}

// ── Misc ──

export function formatNumber(n: number | undefined | null): string {
  if (n == null) return '—';
  return n.toLocaleString('en-IN');
}
