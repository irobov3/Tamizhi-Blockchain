// Tamizhi chain native denom is `utmz` (1 TMZ = 1_000_000 utmz).

export const MICRO = 1_000_000n;

export function utmzToTmz(utmz: string | bigint | number): string {
  const v = typeof utmz === "bigint" ? utmz : BigInt(String(utmz || 0).split(".")[0] || 0);
  const whole = v / MICRO;
  const frac = v % MICRO;
  if (frac === 0n) return whole.toString();
  const fracStr = frac.toString().padStart(6, "0").replace(/0+$/, "");
  return `${whole.toString()}.${fracStr}`;
}

export function tmzToUtmz(tmz: string | number): bigint {
  const s = String(tmz).trim();
  if (!s) return 0n;
  const [whole, frac = ""] = s.split(".");
  const fracPadded = (frac + "000000").slice(0, 6);
  return BigInt(whole || "0") * MICRO + BigInt(fracPadded || "0");
}

export function formatTmz(utmz: string | bigint | number, fractionDigits = 4): string {
  const s = utmzToTmz(utmz);
  const [w, f = ""] = s.split(".");
  const wn = Number(w).toLocaleString("en-US");
  if (fractionDigits === 0 || f === "") return wn;
  return `${wn}.${f.slice(0, fractionDigits).padEnd(fractionDigits, "0")}`;
}

export function shortAddress(addr: string, head = 10, tail = 6): string {
  if (!addr) return "";
  if (addr.length <= head + tail + 3) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export function timeAgo(ts: string | number | Date): string {
  const d = typeof ts === "object" ? ts : new Date(ts);
  const diff = Date.now() - d.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

export function isLikelyBech32(addr: string, prefix = "tamizhi"): boolean {
  if (!addr) return false;
  const lower = addr.toLowerCase();
  if (!lower.startsWith(prefix + "1")) return false;
  if (lower.length < prefix.length + 38) return false;
  return /^[a-z0-9]+$/.test(lower);
}
