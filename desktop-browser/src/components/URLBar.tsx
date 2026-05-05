import { useState, useEffect, useRef } from "react";
import { useTabs } from "../store/tabs";
import { useBookmarks } from "../store/bookmarks";
import { useHistory } from "../store/history";
import { resolveURL, isSecure } from "../utils/url";

export default function URLBar() {
  const { tabs, activeTabId, navigate } = useTabs();
  const tab = tabs.find((t) => t.id === activeTabId);
  const bookmarks = useBookmarks((s) => s.items);
  const addBookmark = useBookmarks((s) => s.add);
  const history = useHistory((s) => s.items);

  const [text, setText] = useState(tab?.url ?? "");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focused) setText(tab?.url ?? "");
  }, [tab?.url, focused]);

  if (!tab) return null;

  const submit = () => {
    const r = resolveURL(text);
    navigate(tab.id, r.displayURL, r.loadURL, r.overlay);
    inputRef.current?.blur();
  };

  const isBookmarked = bookmarks.some((b) => b.url === tab.url);
  const secure = isSecure(tab.url);
  const isTamizhi = tab.url.startsWith("tamizhi://");

  // Autocomplete suggestions
  const lc = text.toLowerCase();
  const suggestions = focused && text
    ? [
        ...bookmarks.filter((b) => b.url.toLowerCase().includes(lc) || b.title.toLowerCase().includes(lc)).slice(0, 4),
        ...history.filter((h) => h.url.toLowerCase().includes(lc)).slice(0, 4),
      ].slice(0, 6)
    : [];

  return (
    <div className="flex-1 relative">
      <div className="flex items-center h-9 rounded-full bg-black/30 px-3 gap-2 border border-white/10 focus-within:border-tamizhi-accent">
        <span className="text-xs">
          {isTamizhi ? (
            <span className="text-tamizhi-accent font-bold">த</span>
          ) : secure ? (
            <span title="Secure" className="text-green-400">🔒</span>
          ) : (
            <span title="Insecure" className="text-yellow-400">!</span>
          )}
        </span>
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={(e) => { setFocused(true); e.currentTarget.select(); }}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="Search or enter address (https://, ipfs://, tamizhi://)"
          className="flex-1 bg-transparent text-sm text-white placeholder-white/40"
          spellCheck={false}
        />
        <button
          onClick={() =>
            isBookmarked
              ? null
              : addBookmark({ title: tab.title, url: tab.url, folder: "/" })
          }
          className="text-sm hover:text-tamizhi-accent"
          aria-label="Bookmark"
          title={isBookmarked ? "Bookmarked" : "Add bookmark"}
        >
          {isBookmarked ? "★" : "☆"}
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="absolute left-0 right-0 mt-1 bg-tamizhi-chromeLight border border-white/10 rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
          {suggestions.map((s, i) => (
            <div
              key={i}
              onMouseDown={(e) => {
                e.preventDefault();
                setText(s.url);
                const r = resolveURL(s.url);
                navigate(tab.id, r.displayURL, r.loadURL, r.overlay);
              }}
              className="px-3 py-2 text-sm hover:bg-white/10 cursor-pointer"
            >
              <div className="truncate">{s.title || s.url}</div>
              <div className="text-xs text-white/50 truncate">{s.url}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
