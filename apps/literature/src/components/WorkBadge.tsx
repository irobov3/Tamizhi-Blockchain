'use client'

import type { LiteratureWork } from '@/lib/types'
import { formatGenre, genreColor } from '@/lib/format'

interface WorkBadgeProps {
  genre: LiteratureWork['genre'] | string
  size?: 'sm' | 'md'
}

export default function WorkBadge({ genre, size = 'md' }: WorkBadgeProps) {
  const color = genreColor(genre as LiteratureWork['genre'])
  const fontSize = size === 'sm' ? '11px' : '12px'
  const padding = size === 'sm' ? '2px 8px' : '4px 12px'

  return (
    <span
      style={{
        display: 'inline-block',
        background: `${color}15`,
        border: `1px solid ${color}35`,
        color,
        borderRadius: '6px',
        fontSize,
        fontWeight: 600,
        padding,
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
      }}
    >
      {formatGenre(genre as LiteratureWork['genre'])}
    </span>
  )
}
