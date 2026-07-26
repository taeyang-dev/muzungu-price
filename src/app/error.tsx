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
        The page hit a server error. This is often a missing database connection, unset Vercel
        environment variables, or a database schema that needs to be synced (run{" "}
        <code>npm run db:push</code>).
      </p>
      <p className="tiny muted">
        페이지에서 서버 오류가 발생했습니다. DB 연결, Vercel 환경 변수, 또는 스키마 동기화(
        <code>npm run db:push</code>)가 필요할 수 있습니다.
      </p>
      {error.digest ? <p className="tiny muted">Error id: {error.digest}</p> : null}
      <button className="btn" onClick={reset} type="button">
        Try again
      </button>
    </section>
  );
}
