interface Props {
  quote: string;
  accentColor?: "lime" | "cyan";
}

export default function Interruption({
  quote,
  accentColor = "lime",
}: Readonly<Props>) {
  const accent =
    accentColor === "cyan" ? "var(--accent-cyan)" : "var(--accent-lime)";

  return (
    <aside
      className="h-full flex flex-col justify-center px-3 py-4 glitch-hover overflow-hidden"
      style={{
        borderLeft: `2px solid ${accent}`,
        // Reset the 27px fixed line-height inherited from the column wrapper —
        // otherwise the 9px label has ~3× its font-size as leading.
        lineHeight: 1.4,
      }}
    >
      {/* Label */}
      <span
        className="font-mono text-[9px] uppercase mb-2"
        style={{ color: accent }}
      >
        ◈ Pull Quote
      </span>

      {/* Quote text */}
      <blockquote
        className="font-display font-bold leading-snug"
        style={{
          fontSize: "clamp(11px, 1.3vw, 14px)",
          color: accent,
        }}
      >
        &ldquo;{quote}&rdquo;
      </blockquote>

      {/* Decorative bar */}
      <div
        className="mt-3 h-px w-6"
        style={{ background: accent, opacity: 0.4 }}
      />
    </aside>
  );
}
