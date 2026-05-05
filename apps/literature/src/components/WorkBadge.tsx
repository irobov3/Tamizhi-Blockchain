'use client';

import type { WorkType } from '@/lib/types';
import { formatWorkType } from '@/lib/format';

interface WorkBadgeProps {
  type: WorkType | string;
  size?: 'sm' | 'md';
}

const BADGE_COLORS: Record<string, { bg: string; color: string }> = {
  poem:    { bg: '#dbeafe', color: '#1d4ed8' },
  epic:    { bg: '#ede9fe', color: '#6d28d9' },
  grammar: { bg: '#ffedd5', color: '#c2410c' },
  prose:   { bg: '#f3f4f6', color: '#374151' },
  unknown: { bg: '#f3f4f6', color: '#6b7280' },
};

export default function WorkBadge({ type, size = 'md' }: WorkBadgeProps) {
  const colors = BADGE_COLORS[type] ?? BADGE_COLORS.unknown;
  const fontSize = size === 'sm' ? '11px' : '12px';
  const padding = size === 'sm' ? '2px 6px' : '3px 10px';

  return (
    <span
      style={{
        display: 'inline-block',
        background: colors.bg,
        color: colors.color,
        borderRadius: '999px',
        fontSize,
        fontWeight: 600,
        padding,
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {formatWorkType(type)}
    </span>
  );
}
