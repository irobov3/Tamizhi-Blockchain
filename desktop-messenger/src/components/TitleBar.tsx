import { useChain } from "../hooks/useChain";

export function TitleBar() {
  const { connected, height } = useChain();
  return (
    <div className="titlebar">
      <div className="title">
        <strong>Tamizhi</strong> Messenger {" "}
        <span style={{ marginLeft: 12 }}>
          {connected ? `chain @ ${height}` : "connecting…"}
        </span>
      </div>
    </div>
  );
}
