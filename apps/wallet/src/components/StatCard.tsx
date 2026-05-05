'use client';

import React from 'react';

export interface StatCardProps {
  icon: string;
  title: string;
  value: string | number;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    label: string;
  };
  loading?: boolean;
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(245,166,35,0.2)',
    borderRadius: '12px',
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minWidth: '160px',
    flex: 1,
    transition: 'border-color 0.2s',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  icon: {
    fontSize: '22px',
    lineHeight: 1,
  },
  title: {
    fontSize: '13px',
    color: 'rgba(253,246,227,0.6)',
    fontWeight: 500,
    letterSpacing: '0.03em',
    textTransform: 'uppercase' as const,
  },
  value: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#fdf6e3',
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
  },
  trend: {
    fontSize: '12px',
    fontWeight: 500,
    marginTop: '2px',
  },
  skeleton: {
    background: 'rgba(255,255,255,0.08)',
    borderRadius: '4px',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
};

function trendColor(direction: 'up' | 'down' | 'neutral'): string {
  if (direction === 'up') return '#4caf50';
  if (direction === 'down') return '#ef5350';
  return 'rgba(253,246,227,0.5)';
}

function trendIcon(direction: 'up' | 'down' | 'neutral'): string {
  if (direction === 'up') return '↑';
  if (direction === 'down') return '↓';
  return '→';
}

export default function StatCard({ icon, title, value, trend, loading }: StatCardProps) {
  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.icon}>{icon}</span>
        <span style={styles.title}>{title}</span>
      </div>
      {loading ? (
        <>
          <div style={{ ...styles.skeleton, height: '32px', width: '60%' }} />
          <div style={{ ...styles.skeleton, height: '14px', width: '40%' }} />
        </>
      ) : (
        <>
          <div style={styles.value}>{value}</div>
          {trend && (
            <div
              style={{
                ...styles.trend,
                color: trendColor(trend.direction),
              }}
            >
              {trendIcon(trend.direction)} {trend.label}
            </div>
          )}
        </>
      )}
    </div>
  );
}
