import React from 'react';
import { useBrowser, Download } from '../store/useBrowser';
import { t } from '../i18n';

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--primary)', transition: 'width 0.3s' }} />
    </div>
  );
}

export default function DownloadsPanel() {
  const { downloads, clearDownloads, setShowDownloads } = useBrowser();

  return (
    <div style={{
      position: 'fixed', bottom: 0, right: 16, width: 320, maxHeight: 380,
      background: 'var(--surface2)', border: '1px solid var(--border)',
      borderTopLeftRadius: 12, borderTopRightRadius: 12,
      display: 'flex', flexDirection: 'column',
      boxShadow: 'var(--shadow)', zIndex: 150,
    }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{t('downloads')}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={clearDownloads} style={{ fontSize: 11, color: 'var(--text3)', padding: '2px 6px' }}>{t('clearDownloads')}</button>
          <button onClick={() => setShowDownloads(false)} style={{ color: 'var(--text2)', fontSize: 18 }}>×</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
        {downloads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text3)', fontSize: 12 }}>
            {t('noDownloads')}
          </div>
        ) : (
          downloads.map((dl) => {
            const pct = dl.totalBytes > 0 ? Math.floor((dl.receivedBytes / dl.totalBytes) * 100) : 0;
            return (
              <div key={dl.filename + dl.startedAt} style={{
                padding: '10px 12px', background: 'var(--surface)',
                borderRadius: 8, marginBottom: 6,
                border: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    📄 {dl.filename}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    color: dl.state === 'completed' ? 'var(--success)' : dl.state === 'progressing' ? 'var(--primary)' : 'var(--danger)',
                    flexShrink: 0,
                  }}>
                    {dl.state === 'completed' ? t('completed') : dl.state === 'progressing' ? `${pct}%` : t('failed')}
                  </span>
                </div>
                {dl.state === 'progressing' && <ProgressBar pct={pct} />}
                {dl.savePath && dl.state === 'completed' && (
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {dl.savePath}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
