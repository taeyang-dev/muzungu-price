"use client";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#0f1419",
          color: "#f5f7fa",
          padding: "24px"
        }}
      >
        <main style={{ maxWidth: 480, textAlign: "center" }}>
          <h1 style={{ marginTop: 0 }}>This page couldn&apos;t load</h1>
          <p style={{ opacity: 0.8 }}>
            A server error occurred. Check that Vercel has <code>DATABASE_URL</code>,{" "}
            <code>DIRECT_URL</code>, and <code>AUTH_SECRET</code>, then redeploy.
          </p>
          {error.digest ? (
            <p style={{ opacity: 0.55, fontSize: 12 }}>Error id: {error.digest}</p>
          ) : null}
          <button
            onClick={reset}
            style={{
              marginTop: 12,
              border: "1px solid #9aa4b2",
              background: "transparent",
              color: "inherit",
              borderRadius: 999,
              padding: "8px 16px",
              cursor: "pointer"
            }}
            type="button"
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
