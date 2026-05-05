import { NavLink } from "react-router-dom";
import { shortAddress } from "../utils/format";
import { useWallet } from "../store/wallet";

const NAV = [
  { to: "/", label: "Dashboard", icon: "▣" },
  { to: "/send", label: "Send", icon: "↗" },
  { to: "/receive", label: "Receive", icon: "↙" },
  { to: "/staking", label: "Staking", icon: "◈" },
  { to: "/history", label: "History", icon: "≡" },
  { to: "/literature", label: "Literature", icon: "த" },
  { to: "/rewards", label: "Rewards", icon: "★" },
  { to: "/settings", label: "Settings", icon: "⚙" },
];

export function Sidebar() {
  const { active } = useWallet();
  return (
    <aside className="w-60 bg-indigo-night border-r border-gold/10 flex flex-col">
      <div className="px-5 py-5 flex items-center gap-3 border-b border-gold/10">
        <div className="w-9 h-9 rounded-lg bg-indigo-deep border border-gold/40 flex items-center justify-center font-tamil text-gold text-xl font-bold">
          த
        </div>
        <div>
          <div className="font-semibold text-cream">Tamizhi</div>
          <div className="text-[10px] uppercase tracking-widest text-gold/70">
            Wallet
          </div>
        </div>
      </div>

      <nav className="flex-1 py-3">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-5 py-2.5 text-sm border-l-2 transition ${
                isActive
                  ? "border-gold bg-indigo-mid/40 text-gold"
                  : "border-transparent text-cream/70 hover:text-cream hover:bg-indigo-mid/20"
              }`
            }
          >
            <span className="w-5 text-center text-gold/80">{n.icon}</span>
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-gold/10 text-xs">
        <div className="text-cream/50 mb-1">Active wallet</div>
        <div className="text-cream truncate font-medium">
          {active?.name ?? "No wallet"}
        </div>
        <div className="text-cream/40 font-mono text-[10px]">
          {active ? shortAddress(active.address) : "—"}
        </div>
      </div>
    </aside>
  );
}
