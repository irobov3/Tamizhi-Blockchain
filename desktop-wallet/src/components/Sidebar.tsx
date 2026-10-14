import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useWallet } from "../store/wallet";
import { shortAddress, utmzToTmz } from "../utils/format";
import { useNetwork } from "../store/network";

const C = {
  bg:      '#0e0824',
  sidebar: '#0a0618',
  card:    '#1a1040',
  border:  '#2a1f5c',
  gold:    '#d4a017',
  text:    '#fdf6e3',
  muted:   '#8a8aa0',
  success: '#00c48c',
}

const NAV = [
  { to: "/",           label: "Dashboard",  icon: "🏠" },
  { to: "/send",       label: "Send",       icon: "📤" },
  { to: "/receive",    label: "Receive",    icon: "📥" },
  { to: "/staking",    label: "Staking",    icon: "🔒" },
  { to: "/history",    label: "History",    icon: "📜" },
  { to: "/literature", label: "Literature", icon: "📚" },
  { to: "/rewards",    label: "Rewards",    icon: "⭐" },
  { to: "/settings",   label: "Settings",   icon: "⚙️"  },
]

export function Sidebar() {
  const { active } = useWallet();
  const { current } = useNetwork();
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  // We try to show a demo balance or nothing if no wallet
  const addressDisplay = active ? shortAddress(active.address, 8, 6) : '—';

  return (
    <aside
      style={{
        width: 220,
        minWidth: 220,
        background: C.sidebar,
        borderRight: `1px solid ${C.border}`,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      {/* Logo / Brand */}
      <div
        style={{
          padding: '20px 16px 16px',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: C.card,
            border: `1px solid ${C.gold}55`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontWeight: 700,
            color: C.gold,
            fontFamily: "'Noto Sans Tamil', sans-serif",
            flexShrink: 0,
          }}
        >
          த
        </div>
        <div>
          <div style={{ fontWeight: 700, color: C.gold, fontSize: 17, lineHeight: 1 }}>
            தமிழி
          </div>
          <div style={{ color: C.text, fontSize: 12, letterSpacing: 2, opacity: 0.7, marginTop: 2 }}>
            WALLET
          </div>
        </div>
      </div>

      {/* Balance display */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
          Available Balance
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.gold, lineHeight: 1.2 }}>
          {active ? utmzToTmz('0') : '—'}{' '}
          <span style={{ fontSize: 13, color: C.text, opacity: 0.8 }}>TMZ</span>
        </div>
        <div
          style={{
            fontSize: 10,
            color: C.muted,
            fontFamily: 'monospace',
            marginTop: 4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {addressDisplay}
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, paddingTop: 8, paddingBottom: 8, overflowY: 'auto' }}>
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === "/"}
            style={{ textDecoration: 'none', display: 'block' }}
            onMouseEnter={() => setHoveredPath(n.to)}
            onMouseLeave={() => setHoveredPath(null)}
          >
            {({ isActive }) => (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '11px 16px',
                  cursor: 'pointer',
                  borderLeft: isActive ? `3px solid ${C.gold}` : '3px solid transparent',
                  background: isActive
                    ? '#1e1050'
                    : hoveredPath === n.to
                    ? '#1a1040'
                    : 'transparent',
                  color: isActive ? C.gold : C.text,
                  fontWeight: isActive ? 600 : 400,
                  fontSize: 14,
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{n.icon}</span>
                <span>{n.label}</span>
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom status */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 20,
            background: `${C.success}18`,
            border: `1px solid ${C.success}40`,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: C.success,
              boxShadow: `0 0 6px ${C.success}`,
            }}
          />
          <span style={{ fontSize: 10, color: C.success, fontWeight: 600, letterSpacing: 0.5 }}>
            {current.label}
          </span>
        </div>
        <div style={{ fontSize: 10, color: C.muted }}>
          Chain: {current.chainId}
        </div>
      </div>
    </aside>
  );
}
