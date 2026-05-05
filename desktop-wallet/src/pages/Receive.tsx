import { QRCodeSVG } from "qrcode.react";
import { useWallet } from "../store/wallet";
import { useToast } from "../components/Toast";

export function Receive() {
  const { active } = useWallet();
  const push = useToast((s) => s.push);

  if (!active) return <div className="card">Create a wallet first.</div>;

  async function copy() {
    try {
      await navigator.clipboard.writeText(active!.address);
      push("success", "Address copied");
    } catch {
      push("error", "Clipboard denied");
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My Tamizhi address",
          text: active!.address,
        });
      } catch {
        /* user cancel */
      }
    } else {
      copy();
    }
  }

  return (
    <div className="card max-w-md mx-auto text-center space-y-4">
      <h2 className="text-lg font-semibold text-gold">Receive</h2>
      <div className="bg-cream p-4 rounded-xl inline-block">
        <QRCodeSVG value={active.address} size={220} fgColor="#1a1040" bgColor="#fdf6e3" />
      </div>
      <div className="font-mono text-xs break-all text-cream/80 select-all">
        {active.address}
      </div>
      <div className="flex gap-2 justify-center">
        <button className="btn-primary" onClick={copy}>
          Copy
        </button>
        <button className="btn-secondary" onClick={share}>
          Share
        </button>
      </div>
    </div>
  );
}
