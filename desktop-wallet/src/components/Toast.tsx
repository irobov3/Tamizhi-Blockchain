import { create } from "zustand";
import { useEffect } from "react";

type ToastEntry = { id: string; kind: "info" | "success" | "error"; msg: string };

type ToastState = {
  items: ToastEntry[];
  push: (kind: ToastEntry["kind"], msg: string) => void;
  dismiss: (id: string) => void;
};

export const useToast = create<ToastState>((set) => ({
  items: [],
  push: (kind, msg) => {
    const id = `${Date.now()}_${Math.random()}`;
    set((s) => ({ items: [...s.items, { id, kind, msg }] }));
    setTimeout(() => {
      set((s) => ({ items: s.items.filter((t) => t.id !== id) }));
    }, 4000);
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));

export function ToastHost() {
  const items = useToast((s) => s.items);
  const dismiss = useToast((s) => s.dismiss);
  useEffect(() => {}, [items]);
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 w-80">
      {items.map((t) => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={`card cursor-pointer text-sm border ${
            t.kind === "success"
              ? "border-green-500/50"
              : t.kind === "error"
              ? "border-red-500/50"
              : "border-gold/30"
          }`}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}
