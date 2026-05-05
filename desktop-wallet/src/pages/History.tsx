import { useEffect, useMemo, useState } from "react";
import { fetchTxs, type TxResp } from "../api/chain";
import { useNetwork } from "../store/network";
import { useWallet } from "../store/wallet";
import { TxRow } from "../components/TxRow";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "send", label: "Send" },
  { id: "receive", label: "Receive" },
  { id: "stake", label: "Stake" },
  { id: "reward", label: "Reward" },
] as const;

type FilterId = typeof FILTERS[number]["id"];

function classify(t: TxResp): FilterId {
  const type =
    t.tx?.body?.messages?.[0]?.["@type"]?.toLowerCase?.() ?? "";
  if (type.includes("delegate") || type.includes("undelegate") || type.includes("redelegate"))
    return "stake";
  if (type.includes("withdrawdelegatorreward")) return "reward";
  if (type.includes("send")) return "send";
  return "receive";
}

export function History() {
  const { active } = useWallet();
  const { current } = useNetwork();
  const [txs, setTxs] = useState<TxResp[]>([]);
  const [filter, setFilter] = useState<FilterId>("all");
  const [page, setPage] = useState(0);
  const PAGE = 20;

  useEffect(() => {
    if (!active) return;
    fetchTxs(current, active.address, 200).then(setTxs).catch(() => setTxs([]));
  }, [active, current]);

  const filtered = useMemo(() => {
    if (filter === "all") return txs;
    return txs.filter((t) => classify(t) === filter);
  }, [txs, filter]);

  const slice = filtered.slice(page * PAGE, (page + 1) * PAGE);

  function exportCsv() {
    const rows = [
      ["txhash", "height", "timestamp", "type", "code"].join(","),
      ...filtered.map((t) =>
        [
          t.txhash,
          t.height,
          t.timestamp,
          t.tx?.body?.messages?.[0]?.["@type"] ?? "",
          t.code,
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tamizhi-txs-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setFilter(f.id);
                setPage(0);
              }}
              className={`text-xs px-3 py-1 rounded-full border transition ${
                filter === f.id
                  ? "bg-gold text-indigo-deep border-gold"
                  : "border-gold/30 text-cream/70 hover:text-gold"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button onClick={exportCsv} className="btn-secondary text-xs">
          Export CSV
        </button>
      </div>
      {slice.length === 0 ? (
        <p className="text-cream/50 text-sm py-8 text-center">
          No transactions match the filter.
        </p>
      ) : (
        slice.map((t) => (
          <TxRow
            key={t.txhash}
            hash={t.txhash}
            height={t.height}
            timestamp={t.timestamp}
            type={t.tx?.body?.messages?.[0]?.["@type"]?.split(".").pop() ?? "Tx"}
            success={t.code === 0}
          />
        ))
      )}
      <div className="flex items-center justify-between mt-4 text-xs text-cream/60">
        <span>
          Page {page + 1} / {Math.max(1, Math.ceil(filtered.length / PAGE))}
        </span>
        <div className="flex gap-2">
          <button
            className="btn-secondary text-xs"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Prev
          </button>
          <button
            className="btn-secondary text-xs"
            onClick={() => setPage((p) => p + 1)}
            disabled={(page + 1) * PAGE >= filtered.length}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
