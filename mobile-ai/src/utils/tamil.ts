// Tamil-script utilities.

import dayjs from 'dayjs';

const TAMIL_RANGE = /[஀-௿]/;

export function isTamilText(text: string): boolean {
  return TAMIL_RANGE.test(text);
}

export function tamilFraction(text: string): number {
  if (!text) return 0;
  const matches = text.match(/[஀-௿]/g);
  return matches ? matches.length / text.length : 0;
}

const TA_MONTHS = [
  'ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்',
  'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்',
];

export function formatTimestamp(ts: number, tamil: boolean = false): string {
  const d = dayjs(ts);
  if (!tamil) return d.format('MMM D, h:mm A');
  return `${d.date()} ${TA_MONTHS[d.month()]}, ${d.format('h:mm A')}`;
}

export function shortTime(ts: number): string {
  return dayjs(ts).format('h:mm A');
}
