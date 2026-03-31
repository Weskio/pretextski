export default function Masthead() {
  return (
    <header className="relative z-10 flex items-center justify-between px-6 md:px-10 py-5">
      {/* Wordmark */}
      <div className="flex items-baseline gap-3">
        <span className="font-display font-bold text-base tracking-[-0.01em] text-fg">
          PRETEXTSKI
        </span>
        <span
          className="font-mono text-[9px] tracking-[0.3em] uppercase"
          style={{ color: "var(--accent-lime)" }}
        >
          ◈ Est. 2026
        </span>
      </div>

      {/* Issue number + nav */}
      <div className="flex items-center gap-6 font-mono text-[9px] tracking-[0.25em] uppercase text-muted">
        <span>Issue 001</span>
        <span className="hidden sm:block">Tech / Culture / Signal</span>
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
