"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global render error", error);
  }, [error]);

  return (
    <html lang="ja">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          backgroundColor: "#f8fafc",
          color: "#0f172a",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "400px",
            borderRadius: "8px",
            backgroundColor: "#ffffff",
            padding: "40px 32px",
            textAlign: "center",
            boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
          }}
        >
          <h1 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 16px" }}>エラーが発生しました。</h1>
          <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#475569", margin: "0 0 24px" }}>
            問題が発生しました。時間をおいて再度お試しください。
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              width: "100%",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "#0EA5B7",
              color: "#ffffff",
              padding: "12px 24px",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            再試行する
          </button>
          {error.digest ? (
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: "24px 0 0" }}>エラーID: {error.digest}</p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
