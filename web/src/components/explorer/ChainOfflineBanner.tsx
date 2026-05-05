'use client';

import { WifiOff, RefreshCw } from 'lucide-react';

interface Props {
  onRetry?: () => void;
}

export function ChainOfflineBanner({ onRetry }: Props) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400">
      <div className="flex items-center gap-3">
        <WifiOff className="w-5 h-5 flex-shrink-0" />
        <div>
          <p className="font-medium text-sm">Chain Offline</p>
          <p className="text-xs text-red-400/70 mt-0.5 tamil-text">
            சங்கிலி இணைப்பு இல்லை — cannot reach{' '}
            {process.env.NEXT_PUBLIC_REST_URL ?? 'http://localhost:1317'}
          </p>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-medium transition-colors flex-shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}
