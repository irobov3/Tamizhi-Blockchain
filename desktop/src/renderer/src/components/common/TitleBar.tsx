import React, { useEffect, useState } from 'react';
import { Minus, Square, X, Maximize2 } from 'lucide-react';

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const isMac = navigator.platform.toLowerCase().includes('mac');

  useEffect(() => {
    if (!window.tamizhi) return;
    window.tamizhi.on('window:maximized', (maximized: unknown) => {
      setIsMaximized(Boolean(maximized));
    });
    return () => {
      window.tamizhi.off('window:maximized');
    };
  }, []);

  const handleMinimize = () => window.tamizhi?.minimize();
  const handleMaximize = async () => {
    const result = await window.tamizhi?.maximize();
    setIsMaximized(Boolean(result));
  };
  const handleClose = () => window.tamizhi?.close();

  return (
    <div
      className="drag-region"
      style={{
        height: 'var(--titlebar-height)',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        flexShrink: 0,
        position: 'relative',
        zIndex: 100,
      }}
    >
      {/* Left: App logo + name */}
      <div
        className="no-drag"
        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
      >
        {/* Tamil Om-inspired logo mark */}
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'var(--gradient-saffron)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontFamily: 'var(--font-tamil)',
            color: '#fff',
            fontWeight: 700,
            flexShrink: 0,
            boxShadow: '0 0 8px rgba(232, 80, 10, 0.5)',
          }}
        >
          த
        </div>
        <span
          style={{
            fontWeight: 600,
            fontSize: '0.875rem',
            letterSpacing: '0.04em',
            color: 'var(--text-primary)',
          }}
        >
          Tamizhi
        </span>
        <span
          style={{
            fontSize: '0.625rem',
            color: 'var(--tamizhi-saffron)',
            background: 'rgba(232, 80, 10, 0.15)',
            padding: '2px 6px',
            borderRadius: 'var(--radius-full)',
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Beta
        </span>
      </div>

      {/* Center: App title (absolute center) */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          letterSpacing: '0.08em',
          pointerEvents: 'none',
        }}
      >
        தமிழி Desktop
      </div>

      {/* Right: Window controls */}
      <div
        className="no-drag"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMac ? 6 : 2,
        }}
      >
        {isMac ? (
          // macOS traffic light style
          <>
            <TrafficButton color="#FF5F57" hoverColor="#FF3B30" onClick={handleClose} title="Close">
              <X size={8} strokeWidth={2.5} />
            </TrafficButton>
            <TrafficButton color="#FEBC2E" hoverColor="#FF9F0A" onClick={handleMinimize} title="Minimize">
              <Minus size={8} strokeWidth={2.5} />
            </TrafficButton>
            <TrafficButton color="#28C840" hoverColor="#34C759" onClick={handleMaximize} title="Maximize">
              <Maximize2 size={8} strokeWidth={2.5} />
            </TrafficButton>
          </>
        ) : (
          // Windows/Linux style
          <>
            <WinButton onClick={handleMinimize} title="Minimize">
              <Minus size={12} />
            </WinButton>
            <WinButton onClick={handleMaximize} title={isMaximized ? 'Restore' : 'Maximize'}>
              <Square size={11} />
            </WinButton>
            <WinButton onClick={handleClose} title="Close" isClose>
              <X size={13} />
            </WinButton>
          </>
        )}
      </div>
    </div>
  );
}

function TrafficButton({
  color,
  hoverColor,
  onClick,
  children,
  title,
}: {
  color: string;
  hoverColor: string;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 12,
        height: 12,
        borderRadius: '50%',
        border: 'none',
        background: hovered ? hoverColor : color,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        transition: 'background var(--transition-fast)',
        color: 'rgba(0,0,0,0.7)',
      }}
    >
      <span style={{ opacity: hovered ? 1 : 0, transition: 'opacity 0.1s' }}>
        {children}
      </span>
    </button>
  );
}

function WinButton({
  onClick,
  children,
  title,
  isClose,
}: {
  onClick: () => void;
  children: React.ReactNode;
  title: string;
  isClose?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 40,
        height: 'var(--titlebar-height)',
        border: 'none',
        background: hovered
          ? isClose
            ? '#C42B1C'
            : 'rgba(255,255,255,0.1)'
          : 'transparent',
        color: hovered && isClose ? '#fff' : 'var(--text-secondary)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 0,
        padding: 0,
        transition: 'background var(--transition-fast), color var(--transition-fast)',
      }}
    >
      {children}
    </button>
  );
}
