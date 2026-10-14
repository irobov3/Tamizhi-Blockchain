import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import calendar from 'dayjs/plugin/calendar';
import { CONFIG } from '../config';

dayjs.extend(relativeTime);
dayjs.extend(calendar);

/**
 * Format a timestamp for message display.
 * Same day: HH:mm
 * Yesterday: "Yesterday"
 * Within 7 days: day name (Mon, Tue...)
 * Older: DD/MM/YY
 */
export function formatMessageTime(timestamp: number): string {
  const d = dayjs(timestamp);
  const now = dayjs();
  const diffDays = now.diff(d, 'day');

  if (diffDays === 0) return d.format('HH:mm');
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.format('ddd');
  return d.format('DD/MM/YY');
}

/**
 * Format a full timestamp for detail views.
 */
export function formatFullTimestamp(timestamp: number): string {
  return dayjs(timestamp).calendar(undefined, {
    sameDay: '[Today at] HH:mm',
    lastDay: '[Yesterday at] HH:mm',
    lastWeek: 'dddd [at] HH:mm',
    sameElse: 'DD/MM/YYYY [at] HH:mm',
  });
}

/**
 * Truncate text with ellipsis.
 */
export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + '...';
}

/**
 * Format a balance amount from micro-denom to display denom.
 */
export function formatTMZ(microAmount: string | number): string {
  const micro =
    typeof microAmount === 'string' ? parseInt(microAmount, 10) : microAmount;
  const tmz = micro / Math.pow(10, CONFIG.DECIMALS);
  return `${tmz.toFixed(6)} ${CONFIG.DISPLAY_DENOM}`;
}

/**
 * Abbreviate a Session ID or wallet address for display.
 */
export function abbreviate(value: string, start = 8, end = 8): string {
  if (value.length <= start + end + 3) return value;
  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

/**
 * Get initials from a display name.
 */
export function getInitials(name: string, maxChars = 2): string {
  return name
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, maxChars)
    .join('');
}
