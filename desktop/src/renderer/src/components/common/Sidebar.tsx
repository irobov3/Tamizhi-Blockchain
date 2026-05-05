import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Wallet,
  Search,
  MessageSquare,
  BookOpen,
  Bot,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useWalletStore } from '../../store/wallet.store';
import { useChatStore } from '../../store/chat.store';
import { clsx } from 'clsx';

interface NavItem {
  path: string;
  icon: React.ElementType;
  label: string;
  tamilLabel: string;
  badge?: number;
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { address } = useWalletStore();
  const { unreadTotal } = useChatStore();

  const navItems: NavItem[] = [
    { path: '/wallet', icon: Wallet, label: 'Wallet', tamilLabel: 'பணப்பை' },
    { path: '/explorer', icon: Search, label: 'Explorer', tamilLabel: 'ஆய்வி' },
    {
      path: '/messenger',
      icon: MessageSquare,
      label: 'Messenger',
      tamilLabel: 'தூது',
      badge: unreadTotal > 0 ? unreadTotal : undefined,
    },
    { path: '/literature', icon: BookOpen, label: 'Literature', tamilLabel: 'இலக்கியம்' },
    { path: '/ai', icon: Bot, label: 'AI', tamilLabel: 'செயற்கை' },
  ];

  const truncateAddress = (addr: string) => {
    if (!addr) return '';
    return collapsed
      ? addr.slice(0, 6) + '…'
      : addr.slice(0, 12) + '…' + addr.slice(-6);
  };

  return (
    <aside
      style={{
        width: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width var(--transition-base)',
        overflow: 'hidden',
        flexShrink: 0,
        zIndex: 50,
      }}
    >
      {/* Logo area */}
      <div
        style={{
          padding: '16px 12px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          minHeight: 64,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'var(--gradient-saffron)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontFamily: 'var(--font-tamil)',
            color: '#fff',
            fontWeight: 700,
            flexShrink: 0,
            boxShadow: 'var(--shadow-saffron)',
          }}
        >
          த
        </div>
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: '1rem',
                color: 'var(--text-primary)',
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
              }}
            >
              Tamizhi
            </div>
            <div
              style={{
                fontFamily: 'var(--font-tamil)',
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                whiteSpace: 'nowrap',
              }}
            >
              தமிழி
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '8px 6px', overflowY: 'auto' }}>
        {navItems.map((item) => (
          <NavButton
            key={item.path}
            item={item}
            active={location.pathname === item.path}
            collapsed={collapsed}
            onClick={() => navigate(item.path)}
          />
        ))}
      </nav>

      {/* Divider + Settings */}
      <div style={{ padding: '0 6px 4px' }}>
        <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0 8px' }} />
        <NavButton
          item={{ path: '/settings', icon: Settings, label: 'Settings', tamilLabel: 'அமைவுகள்' }}
          active={location.pathname === '/settings'}
          collapsed={collapsed}
          onClick={() => navigate('/settings')}
        />
      </div>

      {/* Wallet address at bottom */}
      {address && (
        <div
          style={{
            padding: '10px 12px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'rgba(232, 80, 10, 0.06)',
          }}
        >
          <div
            style={{
              fontSize: '0.65rem',
              color: 'var(--text-muted)',
              marginBottom: 3,
              fontWeight: 500,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {!collapsed && 'Address'}
          </div>
          <div
            className="font-mono truncate"
            style={{
              fontSize: '0.7rem',
              color: 'var(--tamizhi-gold)',
              cursor: 'pointer',
              transition: 'opacity var(--transition-fast)',
            }}
            title={address}
            onClick={() => window.tamizhi?.copyToClipboard(address)}
          >
            {truncateAddress(address)}
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          padding: '8px',
          background: 'transparent',
          border: 'none',
          borderTop: '1px solid var(--border-subtle)',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-end',
          paddingRight: collapsed ? undefined : 16,
          transition: 'color var(--transition-fast)',
          width: '100%',
        }}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
}

function NavButton({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const Icon = item.icon;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={collapsed ? item.label : undefined}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: collapsed ? '10px 0' : '9px 10px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: 'var(--radius-md)',
        border: 'none',
        background: active
          ? 'rgba(232, 80, 10, 0.15)'
          : hovered
          ? 'rgba(255,255,255,0.05)'
          : 'transparent',
        color: active ? 'var(--tamizhi-saffron)' : 'var(--text-secondary)',
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
        marginBottom: 2,
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {/* Active indicator */}
      {active && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: '20%',
            height: '60%',
            width: 3,
            background: 'var(--tamizhi-saffron)',
            borderRadius: '0 2px 2px 0',
          }}
        />
      )}

      <div style={{ position: 'relative', flexShrink: 0 }}>
        <Icon size={18} strokeWidth={active ? 2.5 : 2} />
        {/* Badge (only when collapsed) */}
        {collapsed && item.badge && (
          <div
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 14,
              height: 14,
              borderRadius: 7,
              background: 'var(--tamizhi-saffron)',
              color: '#fff',
              fontSize: '0.6rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 3px',
            }}
          >
            {item.badge > 99 ? '99+' : item.badge}
          </div>
        )}
      </div>

      {!collapsed && (
        <>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontWeight: active ? 600 : 400, fontSize: '0.875rem', lineHeight: 1.2 }}>
              {item.label}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-tamil)',
                fontSize: '0.65rem',
                color: active ? 'var(--tamizhi-saffron)' : 'var(--text-muted)',
                opacity: 0.8,
              }}
            >
              {item.tamilLabel}
            </div>
          </div>
          {/* Badge (when expanded) */}
          {item.badge && (
            <div
              style={{
                minWidth: 18,
                height: 18,
                borderRadius: 9,
                background: 'var(--tamizhi-saffron)',
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
              }}
            >
              {item.badge > 99 ? '99+' : item.badge}
            </div>
          )}
        </>
      )}
    </button>
  );
}
