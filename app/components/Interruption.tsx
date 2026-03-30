interface Props {
  quote: string;
  accentColor?: "lime" | "cyan";
}

export default function Interruption({
  quote,
  accentColor = "lime",
}: Props) {
  const accent =
    accentColor === "cyan" ? "var(--accent-cyan)" : "var(--accent-lime)";

  return (
    <aside
      className="h-full flex flex-col justify-center px-3 py-4 glitch-hover"
      style={{ borderLeft: `2px solid ${accent}` }}
    >
      {/* Label */}
      <span
        className="font-mono text-[9px] tracking-[0.25em] uppercase mb-3"
        style={{ color: accent }}
      >
        ◈ Pull Quote
      </span>

      {/* Quote text */}
      <blockquote
        className="font-display font-bold leading-snug"
        style={{
          fontSize: "clamp(11px, 1.1vw, 15px)",
          color: accent,
        }}
      >
        &ldquo;{quote}&rdquo;
      </blockquote>

      {/* Decorative bar */}
      <div
        className="mt-4 h-px w-8"
        style={{ background: accent, opacity: 0.4 }}
      />
    </aside>
  );
}
