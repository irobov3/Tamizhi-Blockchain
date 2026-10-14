interface Props {
  origin: string;
  method: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params?: any;
  onApprove: () => void;
  onDeny: () => void;
}

export default function Web3PermissionModal({ origin, method, params, onApprove, onDeny }: Props) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
      <div className="bg-tamizhi-chromeLight w-full max-w-md rounded-xl p-6 text-white border border-tamizhi-accent/40 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full border-2 border-tamizhi-accent flex items-center justify-center">
            <span className="text-tamizhi-accent font-bold">த</span>
          </div>
          <div>
            <div className="font-semibold">Connection request</div>
            <div className="text-xs text-white/60">{origin}</div>
          </div>
        </div>
        <p className="text-sm text-white/80 mb-4">
          <span className="font-semibold">{origin}</span> wants to connect to your Tamizhi wallet.
        </p>
        <div className="bg-black/40 rounded p-3 text-xs text-white/70 mb-5 max-h-40 overflow-auto">
          <div><span className="text-white/50">Method:</span> {method}</div>
          {params !== undefined && (
            <div className="mt-1">
              <span className="text-white/50">Params:</span>
              <pre className="whitespace-pre-wrap break-all">{JSON.stringify(params, null, 2)}</pre>
            </div>
          )}
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onDeny}
            className="px-4 h-9 rounded text-sm bg-white/10 hover:bg-white/20"
          >Deny</button>
          <button
            onClick={onApprove}
            className="px-4 h-9 rounded text-sm bg-tamizhi-accent text-tamizhi-chrome font-semibold hover:bg-tamizhi-accent/90"
          >Approve</button>
        </div>
      </div>
    </div>
  );
}
