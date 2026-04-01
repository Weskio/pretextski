"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  prepareWithSegments,
  layoutNextLine,
  type LayoutCursor,
} from "@chenglou/pretext";
import { useScrollReveal } from "./useScrollReveal";

interface HeroLine {
  text: string;
  width: number;
}

interface Props {
  title: string;
  category: string;
  date: string;
  subtitle?: string;
}

export default function EditorialHero({
  title,
  category,
  date,
  subtitle,
}: Readonly<Props>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const revealRef = useScrollReveal<HTMLElement>();

  const [lines, setLines] = useState<HeroLine[]>([]);
  const [fontSize, setFontSize] = useState(80);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    function runLayout() {
      const width = container!.getBoundingClientRect().width;
      if (width === 0) return;

      const fontFamily = globalThis.getComputedStyle(container!).fontFamily;

      // Short titles → fill 1 line at max size.
      // Long titles → break into 2-3 artistic lines.
      const isShort = title.length < 30;
      const targetMin = isShort ? 1 : 2;
      const targetMax = isShort ? 1 : 3;

      // Hard pixel cap on the heading block so subtitle/content stays visible.
      const MAX_HEADING_HEIGHT = 180;

      let lo = 24,
        hi = 300,
        bestFontSize = 64,
        bestLines: HeroLine[] = [];

      for (let iter = 0; iter < 16; iter++) {
        if (lo > hi) break;
        const mid = Math.round((lo + hi) / 2);

        // Larger font → wider chars → more lines.
        const font = `700 ${mid}px ${fontFamily}`;
        const prepared = prepareWithSegments(title, font);

        const measured: HeroLine[] = [];
        let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
        while (true) {
          const line = layoutNextLine(prepared, cursor, width);
          if (!line) break;
          measured.push({ text: line.text, width: line.width });
          cursor = line.end;
        }

        const lc = measured.length;
        const lineHeight = Math.round(mid * 0.94);
        const totalHeight = lineHeight * lc;

        if (lc > targetMax || totalHeight > MAX_HEADING_HEIGHT) {
          // Too many lines or too tall → font too large → shrink
          hi = mid - 1;
        } else if (lc < targetMin) {
          // Too few lines → font too small → grow
          lo = mid + 1;
        } else {
          // Valid — save and try larger to maximise visual impact
          bestFontSize = mid;
          bestLines = measured;
          lo = mid + 1;
        }
      }

      // Fallback: use whatever bestFontSize we have
      if (bestLines.length === 0) {
        const font = `700 ${bestFontSize}px ${fontFamily}`;
        const prepared = prepareWithSegments(title, font);
        let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
        while (true) {
          const line = layoutNextLine(prepared, cursor, width);
          if (!line) break;
          bestLines.push({ text: line.text, width: line.width });
          cursor = line.end;
        }
      }

      if (!cancelled) {
        setFontSize(bestFontSize);
        setLines(bestLines);
        setReady(true);
      }
    }

    document.fonts.ready.then(() => {
      if (!cancelled) runLayout();
    });

    const ro = new ResizeObserver(() => {
      if (!cancelled) runLayout();
    });
    ro.observe(container);

    return () => {
      cancelled = true;
      ro.disconnect();
    };
  }, [title]);

  return (
    <section
      ref={revealRef as React.RefObject<HTMLElement>}
      className="reveal relative px-6 md:px-10 pt-12 pb-10 overflow-hidden"
      style={{ minHeight: 200, maxHeight: 360 }}
    >
      {/* Category + date bar */}
      <div className="flex items-center gap-3 mb-8 font-mono text-[10px] tracking-[0.35em] uppercase">
        <span className="text-accent-lime">{category}</span>
        <span className="text-border">—</span>
        <span className="text-muted">{date}</span>
      </div>

      {/* Pretext-driven headline */}
      <div ref={containerRef} className="w-full">
        <h1
          className="font-display font-black text-fg leading-none"
          style={{
            fontSize,
            lineHeight: `${Math.round(fontSize * 0.94)}px`,
            visibility: ready ? "visible" : "hidden",
            letterSpacing: fontSize > 80 ? "-0.02em" : "-0.01em",
          }}
          aria-label={title}
        >
          {ready ? (
            lines.map((line, i) => (
              <span
                key={i}
                className="block"
                style={{
                  // Off-grid alternating offsets — the Y2K editorial signature move
                  paddingLeft:
                    lines.length > 1 && i % 2 === 1
                      ? `${Math.round(fontSize * 0.18)}px`
                      : 0,
                  // Last line gets a subtle cyan tint if multi-line
                  color:
                    lines.length > 1 && i === lines.length - 1
                      ? "var(--accent-cyan)"
                      : "var(--fg)",
                }}
              >
                {line.text}
              </span>
            ))
          ) : (
            // Hidden SSR placeholder — preserves layout space
            <span className="opacity-0">{title}</span>
          )}
        </h1>
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p className="mt-6 max-w-xl text-muted text-sm leading-relaxed font-sans reveal reveal-d2">
          {subtitle}
        </p>
      )}

      {/* Decorative lime rule */}
      <div
        className="absolute bottom-0 left-6 right-6 h-px"
        style={{
          background:
            "linear-gradient(to right, var(--accent-lime) 0%, transparent 100%)",
          opacity: 0.35,
        }}
      />
    </section>
  );
}
