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

interface Props {
  text: string;
  pullQuote: string;
}

export default function PretextFlow({ text, pullQuote }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState<ColumnResult[]>([]);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;

    function runLayout() {
      const rect = container!.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;
      if (W === 0 || H === 0) return;

      const maxLinesPerCol = Math.floor(H / LINE_HEIGHT);
      const charCount = text.length;

      // Column geometry — all expressed in px
      type ColDef = { left: number; width: number };
      let colDefs: ColDef[];

      if (charCount < 800) {
        // Short article: single off-centre column
        const w = W * 0.58;
        colDefs = [{ left: W * 0.06, width: w }];
      } else if (charCount < 2200) {
        // Medium article: two uneven columns, wider first
        colDefs = [
          { left: 0, width: W * 0.54 },
          { left: W * 0.6, width: W * 0.38 },
        ];
      } else {
        // Long article: three uneven columns
        colDefs = [
          { left: 0, width: W * 0.32 },
          { left: W * 0.35, width: W * 0.38 },
          { left: W * 0.76, width: W * 0.22 },
        ];
      }

      const fontFamily = window.getComputedStyle(container!).fontFamily;
      const fontStr = `${FONT_SIZE}px ${fontFamily}`;
      const prepared = prepareWithSegments(text, fontStr);

      let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
      let exhausted = false;
      const results: ColumnResult[] = [];

      for (let ci = 0; ci < colDefs.length && !exhausted; ci++) {
        const def = colDefs[ci];
        const useObstacle = ci === OBSTACLE_COL && colDefs.length > 1;

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

        results.push({
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

      if (!cancelled) {
        setColumns(results);
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
  }, [text]);

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{
        height: "70vh",
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

      {/* Pretext-computed columns */}
      {ready &&
        columns.map((col, ci) => (
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

      {/* Column dividers — rendered after layout to match exact positions */}
      {ready &&
        columns.slice(1).map((col, ci) => (
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
    </div>
  );
}
