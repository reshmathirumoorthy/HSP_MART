"use client";

/**
 * Root-level error boundary. Must render its own <html>/<body> because it
 * replaces the root layout when the layout itself fails.
 */
export default function GlobalError({
  error,
  reset,
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
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          background: "#FAF9F5",
          color: "#20251F",
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: "34rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.75rem", marginBottom: "0.75rem" }}>
            Something went wrong
          </h1>
          <p style={{ lineHeight: 1.6, marginBottom: "1.5rem" }}>
            HSP Mart hit an unexpected error. Reload the page to try again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "0.7rem 1.5rem",
              borderRadius: "999px",
              border: "none",
              background: "#015C31",
              color: "#fff",
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
          {error?.digest ? (
            <p style={{ fontSize: "0.8rem", opacity: 0.7, marginTop: "1rem" }}>
              Reference: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
