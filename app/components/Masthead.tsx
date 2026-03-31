interface Props {
  query?: string;
}

export default function Masthead({ query }: Readonly<Props>) {
  return (
    <header className="relative z-10 flex items-center justify-between gap-4 px-6 md:px-10 py-5 flex-wrap">
      {/* Wordmark */}
      <div className="flex items-baseline gap-3 shrink-0">
        <a
          href="/"
          className="font-display font-bold text-base tracking-[-0.01em] text-fg hover:opacity-80 transition"
        >
          PRETEXTSKI
        </a>
        <span
          className="font-mono text-[9px] tracking-[0.3em] uppercase"
          style={{ color: "var(--accent-lime)" }}
        >
          ◈ Est. 2026
        </span>
      </div>

      {/* Search form */}
      <form
        action="/"
        method="get"
        className="flex items-center gap-0 border border-border"
        style={{ borderColor: query ? "var(--accent-cyan)" : "var(--border)" }}
      >
        <input
          type="text"
          name="q"
          defaultValue={query ?? ""}
          placeholder="Search signals…"
          autoComplete="off"
          className="bg-transparent font-mono text-[11px] tracking-[0.15em] text-fg placeholder:text-muted outline-none px-3 py-2 w-[160px] sm:w-[220px]"
        />
        {query ? (
          <a
            href="/"
            aria-label="Clear search"
            className="font-mono text-[10px] px-2 py-2 transition"
            style={{ color: "var(--accent-cyan)" }}
          >
            ✕
          </a>
        ) : null}
        <button
          type="submit"
          className="font-mono text-[10px] tracking-[0.2em] uppercase px-3 py-2 transition hover:text-fg border-l border-border"
          style={{
            color: "var(--accent-lime)",
            borderColor: query ? "var(--accent-cyan)" : "var(--border)",
          }}
          aria-label="Search"
        >
          →
        </button>
      </form>

      {/* Issue meta */}
      <div className="hidden md:flex items-center gap-6 font-mono text-[9px] tracking-[0.25em] uppercase text-muted shrink-0">
        <span>Issue 001</span>
        <span>Tech / Culture / Signal</span>
        <span
          className="w-2 h-2 rounded-full"
          style={{
            background: "var(--accent-cyan)",
            boxShadow: "0 0 6px var(--accent-cyan)",
          }}
        />
      </div>

      {/* Full-width rule */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(to right, transparent 0%, var(--border) 20%, var(--border) 80%, transparent 100%)",
        }}
      />
    </header>
  );
}
