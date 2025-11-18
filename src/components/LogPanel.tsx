import { useEffect, useState } from "react";

export function LogPanel() {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    (window as any).appLog = (msg: any) => {
      const timestamp = new Date().toLocaleTimeString();
      setLogs((prev) => [...prev, `[${timestamp}] ${String(msg)}`].slice(-40));
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        width: "100%",
        maxHeight: "35vh",
        overflowY: "auto",
        background: "rgba(0,0,0,0.9)",
        color: "#0f0",
        fontSize: "11px",
        padding: "8px",
        zIndex: 99999,
        fontFamily: "monospace",
        borderTop: "2px solid #0f0",
      }}
    >
      <strong style={{ color: "#0ff" }}>🔍 DEBUG LOG</strong>
      <button
        onClick={() => setLogs([])}
        style={{
          marginLeft: "10px",
          background: "#444",
          color: "white",
          border: "none",
          padding: "2px 6px",
          cursor: "pointer",
        }}
      >
        נקה
      </button>
      <pre style={{ margin: "4px 0 0 0", whiteSpace: "pre-wrap" }}>
        {logs.join("\n") || "אין לוגים עדיין..."}
      </pre>
    </div>
  );
}
