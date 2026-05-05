import { useEffect } from "react";

export interface ShortcutHandlers {
  onNewChat?: () => void;
  onSearch?: () => void;
  onSettings?: () => void;
  onToggleInfo?: () => void;
  onCloseChat?: () => void;
}

/**
 * useShortcuts — registers desktop-style keyboard shortcuts.
 * Cmd/Ctrl+N — new chat
 * Cmd/Ctrl+F — focus search
 * Cmd/Ctrl+, — settings
 * Cmd/Ctrl+I — toggle info pane
 * Esc — close current chat
 */
export function useShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "n") {
        e.preventDefault();
        handlers.onNewChat?.();
      } else if (mod && e.key.toLowerCase() === "f") {
        e.preventDefault();
        handlers.onSearch?.();
      } else if (mod && e.key === ",") {
        e.preventDefault();
        handlers.onSettings?.();
      } else if (mod && e.key.toLowerCase() === "i") {
        e.preventDefault();
        handlers.onToggleInfo?.();
      } else if (e.key === "Escape") {
        handlers.onCloseChat?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlers]);
}
