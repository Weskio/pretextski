"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  prepareWithSegments,
  layoutNextLine,
  type LayoutCursor,
} from "@chenglou/pretext";
import Interruption from "./Interruption";

/** Pixels — must match the CSS line-height on body text exactly. */
const LINE_HEIGHT = 27;
const FONT_SIZE = 16;

/**
 * In the column that holds the pull-quote interruption,
 * these are the line indices where the obstacle occupies
 * the right-hand side of the column.
 */
const OBSTACLE_START = 4;
const OBSTACLE_LINES = 8;
/** Fraction of the column width taken by the interruption. */
const OBSTACLE_WIDTH_FRAC = 0.44;
/** Which column index gets the interruption (0-based). */
const OBSTACLE_COL = 1;
/** Minimum px width the obstacle column must have before we show the pull quote.
 *  Below this the interruption becomes too cramped to read. */
const MIN_OBSTACLE_COL_WIDTH = 200;

interface ColumnResult {
  leftPx: number;
  widthPx: number;
  lines: string[];
  obstacle: {
    present: boolean;
    leftPx: number;
    widthPx: number;
    topPx: number;
    heightPx: number;
  };
}

interface PageResult {
  columns: ColumnResult[];
  heightPx: number;
}

interface Props {
  text: string;
  pullQuote: string;
}

export default function PretextFlow({ text, pullQuote }: Readonly<Props>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<PageResult[]>([]);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    let prevWidth = -1;
    // Held so the cleanup function can disconnect after fonts.ready resolves.
    let ro: ResizeObserver | null = null;

    document.fonts.ready.then(() => {
      if (cancelled) return;

      // prepareWithSegments is the expensive phase: text analysis + canvas
      // measurement. Call it once after fonts are ready so the result is stable.
      // layoutNextLine (called on every resize) is pure arithmetic after this.
      const fontFamily = globalThis.getComputedStyle(container).fontFamily;
      const prepared = prepareWithSegments(text, `${FONT_SIZE}px ${fontFamily}`);

      const charCount = text.length;

      // Column geometry — all expressed in px. Width-independent; recalculated
      // on each resize from the same `prepared` handle.
      type ColDef = { left: number; width: number };
      function colDefsFor(W: number): ColDef[] {
        if (charCount < 800) {
          return [{ left: W * 0.06, width: W * 0.58 }];
        } else if (charCount < 2200) {
          return [
            { left: 0, width: W * 0.54 },
            { left: W * 0.6, width: W * 0.38 },
          ];
        }
        return [
          { left: 0, width: W * 0.32 },
          { left: W * 0.35, width: W * 0.38 },
          { left: W * 0.76, width: W * 0.22 },
        ];
      }

      function runLayout() {
        const W = container!.getBoundingClientRect().width;
        if (W === 0) return;

        // Skip re-layout when only height changed (avoids feedback loop from our
        // own container growing as pages are added).
        if (prevWidth !== -1 && Math.abs(W - prevWidth) < 1) return;
        prevWidth = W;

        // Page height derived from viewport so it stays stable across re-layouts.
        const pageHeight = Math.max(480, window.innerHeight * 0.7);
        const maxLinesPerCol = Math.floor(pageHeight / LINE_HEIGHT);
        const colDefs = colDefsFor(W);

        let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
        let exhausted = false;
        const allPages: PageResult[] = [];

        // Paginate: keep filling pages of columns until all text is consumed.
        // layoutNextLine is the right primitive here — layoutWithLines has no
        // cursor param so it can't continue from mid-text across pages.
        while (!exhausted) {
          const pageColumns: ColumnResult[] = [];
          const isFirstPage = allPages.length === 0;

          for (let ci = 0; ci < colDefs.length && !exhausted; ci++) {
            const def = colDefs[ci];
            // Interruption only in first-page obstacle column, not repeated.
            // Also skip when the column is too narrow — pull quote becomes unreadable.
            const useObstacle =
              isFirstPage &&
              ci === OBSTACLE_COL &&
              colDefs.length > 1 &&
              def.width >= MIN_OBSTACLE_COL_WIDTH;

            const obstacleWidth = useObstacle ? def.width * OBSTACLE_WIDTH_FRAC : 0;
            const obstacleTop = OBSTACLE_START * LINE_HEIGHT;
            const obstacleHeight = OBSTACLE_LINES * LINE_HEIGHT;
            // Obstacle sits on the right side of the column
            const obstacleLeft = def.width - obstacleWidth;

            const lines: string[] = [];

            for (let li = 0; li < maxLinesPerCol; li++) {
              // Reduce available width while the interruption is alongside
              const inObstacleZone =
                useObstacle &&
                li >= OBSTACLE_START &&
                li < OBSTACLE_START + OBSTACLE_LINES;

              const lineWidth = inObstacleZone
                ? def.width - obstacleWidth
                : def.width;

              const line = layoutNextLine(prepared, cursor, lineWidth);
              if (!line) {
                exhausted = true;
                break;
              }
              lines.push(line.text);
              cursor = line.end;
            }

            pageColumns.push({
              leftPx: def.left,
              widthPx: def.width,
              lines,
              obstacle: {
                present: useObstacle,
                leftPx: obstacleLeft,
                widthPx: obstacleWidth,
                topPx: obstacleTop,
                heightPx: obstacleHeight,
              },
            });
          }

          // Guard: if a full page produced no lines, stop to avoid infinite loop.
          if (pageColumns.every((c) => c.lines.length === 0)) break;

          allPages.push({ columns: pageColumns, heightPx: pageHeight });
        }

        if (!cancelled) {
          setPages(allPages);
          setReady(true);
        }
      }

      runLayout();

      ro = new ResizeObserver(() => {
        if (!cancelled) runLayout();
      });
      ro.observe(container);
    });

    return () => {
      cancelled = true;
      ro?.disconnect();
    };
  }, [text]);

  const totalHeight = pages.reduce((sum, p) => sum + p.heightPx, 0);

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{
        height: ready ? totalHeight : "70vh",
        minHeight: 480,
        fontSize: FONT_SIZE,
        lineHeight: `${LINE_HEIGHT}px`,
        color: "var(--fg)",
      }}
    >
      {/* Pre-hydration fallback — plain text, invisible */}
      {!ready && (
        <p
          className="absolute inset-0 overflow-hidden opacity-0 select-none"
          aria-hidden="true"
        >
          {text}
        </p>
      )}

      {/* Paginated column layout */}
      {ready &&
        pages.map((page, pi) => {
          const pageTop = pages
            .slice(0, pi)
            .reduce((sum, p) => sum + p.heightPx, 0);

          return (
            <div
              key={pi}
              className="absolute w-full"
              style={{ top: pageTop, height: page.heightPx }}
            >
              {/* Column dividers */}
              {page.columns.slice(1).map((col, ci) => (
                <div
                  key={`divider-${ci}`}
                  className="absolute top-0 bottom-0 w-px"
                  style={{
                    left: col.leftPx - 12,
                    background:
                      "linear-gradient(to bottom, var(--border) 0%, transparent 100%)",
                  }}
                />
              ))}

              {/* Columns */}
              {page.columns.map((col, ci) => (
                <div
                  key={ci}
                  className="absolute top-0 font-sans"
                  style={{
                    left: col.leftPx,
                    width: col.widthPx,
                    height: col.lines.length * LINE_HEIGHT,
                  }}
                >
                  {/* Text lines — each at an exact fixed height */}
                  {col.lines.map((lineText, li) => (
                    <div
                      key={li}
                      style={{
                        height: LINE_HEIGHT,
                        overflow: "hidden",
                        whiteSpace: "pre",
                      }}
                    >
                      {lineText}
                    </div>
                  ))}

                  {/* Pull-quote interruption, positioned absolutely in its column */}
                  {col.obstacle.present && (
                    <div
                      className="absolute"
                      style={{
                        left: col.obstacle.leftPx,
                        top: col.obstacle.topPx,
                        width: col.obstacle.widthPx,
                        height: col.obstacle.heightPx,
                      }}
                    >
                      <Interruption quote={pullQuote} accentColor="lime" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
    </div>
  );
}
