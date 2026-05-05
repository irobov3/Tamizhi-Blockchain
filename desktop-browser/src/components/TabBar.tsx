import { useTabs } from "../store/tabs";

export default function TabBar() {
  const { tabs, activeTabId, setActive, closeTab, newTab, reorder } = useTabs();

  const onDragStart = (e: React.DragEvent, idx: number) => {
    e.dataTransfer.setData("text/plain", String(idx));
  };
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = (e: React.DragEvent, toIdx: number) => {
    const fromIdx = Number(e.dataTransfer.getData("text/plain"));
    if (!Number.isNaN(fromIdx) && fromIdx !== toIdx) reorder(fromIdx, toIdx);
  };

  return (
    <div className="flex items-center h-10 bg-tamizhi-chrome px-2 gap-1 border-b border-black/40 select-none">
      {tabs.map((t, idx) => (
        <div
          key={t.id}
          draggable
          onDragStart={(e) => onDragStart(e, idx)}
          onDragOver={onDragOver}
          onDrop={(e) => onDrop(e, idx)}
          onClick={() => setActive(t.id)}
          className={`flex items-center gap-2 px-3 h-8 rounded-t-md max-w-[200px] cursor-pointer ${
            t.id === activeTabId
              ? "bg-tamizhi-chromeLight text-white"
              : "bg-tamizhi-chrome/60 text-white/70 hover:bg-tamizhi-chromeLight/50"
          }`}
        >
          {t.loading && (
            <span className="w-3 h-3 rounded-full border-2 border-tamizhi-accent border-t-transparent animate-spin" />
          )}
          <span className="truncate text-sm">{t.title || "New Tab"}</span>
          <button
            className="ml-1 text-white/60 hover:text-white text-xs"
            onClick={(e) => {
              e.stopPropagation();
              closeTab(t.id);
            }}
            aria-label="Close tab"
          >
            ×
          </button>
        </div>
      ))}
      <button
        className="ml-1 w-7 h-7 rounded text-white/80 hover:bg-tamizhi-chromeLight text-lg leading-none"
        onClick={() => newTab()}
        aria-label="New tab"
      >
        +
      </button>
    </div>
  );
}
