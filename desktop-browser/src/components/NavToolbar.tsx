import { useTabs } from "../store/tabs";
import { resolveURL } from "../utils/url";

interface Props {
  onHome: () => void;
}

export default function NavToolbar({ onHome }: Props) {
  const { tabs, activeTabId, back, forward, navigate } = useTabs();
  const tab = tabs.find((t) => t.id === activeTabId);
  if (!tab) return null;

  const canBack = tab.historyIndex > 0;
  const canForward = tab.historyIndex < tab.history.length - 1;

  const reload = () => {
    const r = resolveURL(tab.url);
    navigate(tab.id, r.displayURL, r.loadURL, r.overlay);
  };

  return (
    <>
      <button
        disabled={!canBack}
        onClick={() => back(tab.id)}
        className="w-8 h-8 rounded hover:bg-white/10 disabled:opacity-30"
        aria-label="Back"
      >‹</button>
      <button
        disabled={!canForward}
        onClick={() => forward(tab.id)}
        className="w-8 h-8 rounded hover:bg-white/10 disabled:opacity-30"
        aria-label="Forward"
      >›</button>
      <button
        onClick={reload}
        className="w-8 h-8 rounded hover:bg-white/10"
        aria-label="Reload"
      >↻</button>
      <button
        onClick={onHome}
        className="w-8 h-8 rounded hover:bg-white/10"
        aria-label="Home"
      >⌂</button>
    </>
  );
}
