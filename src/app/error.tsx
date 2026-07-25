"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="panel section" style={{ textAlign: "center" }}>
      <h1 style={{ marginTop: 0 }}>Something went wrong</h1>
      <p className="muted">
        The page hit a server error. This is often a missing database connection or unset Vercel
        environment variables.
      </p>
      {error.digest ? <p className="tiny muted">Error id: {error.digest}</p> : null}
      <button className="btn" onClick={reset} type="button">
        Try again
      </button>
    </section>
  );
}
