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

// ── Excerpt (collapsed) image obstacle ──────────────────────────────────────
const OBSTACLE_START = 4;
const OBSTACLE_LINES = 8;
const OBSTACLE_WIDTH_FRAC = 0.44;
const OBSTACLE_COL = 1;
const MIN_OBSTACLE_COL_WIDTH = 200;

const IMAGE_START = 2;
const IMAGE_LINES = 11;
const IMAGE_WIDTH_FRAC = 0.42;
const IMAGE_COL = 0;
const MIN_IMAGE_COL_WIDTH = 260;

// ── Expanded image obstacle (page 1 only) ───────────────────────────────────
const EXP_IMG_LINES_P1 = 15;
const EXP_IMG_WIDTH_FRAC_P1 = 0.52;
const EXP_IMG_COL_P1 = 1;

// ── Second pull-quote interruption (expanded, page 2, col 0, right side) ────
const EXP_QUOTE2_START = 5;
const EXP_QUOTE2_LINES = 8;
const EXP_QUOTE2_WIDTH_FRAC = 0.44;
const EXP_QUOTE2_COL = 0;

const MIN_EXP_COL_WIDTH = 220;

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
  secondObstacle: {
    present: boolean;
    leftPx: number;
    widthPx: number;
    topPx: number;
    heightPx: number;
  };
  imageObstacle: {
    present: boolean;
    leftPx: number;
    widthPx: number;
    topPx: number;
    heightPx: number;
    side: "left" | "right";
    pageIndex: number;
  };
}

interface PageResult {
  columns: ColumnResult[];
  heightPx: number;
}

interface Props {
  text: string;
  pullQuote: string;
  secondPullQuote?: string;
  accentColor?: "lime" | "cyan";
  imageUrl?: string;
  imageAlt?: string;
  expanded?: boolean;
  fetchingFull?: boolean;
  sourceUrl?: string;
}

/** CSS-only pixelated image with scanlines for the Y2K editorial vibe. */
function PixelatedImage({
  src,
  alt,
  accentColor,
  sourceUrl,
  side,
}: {
  src: string;
  alt: string;
  accentColor: "lime" | "cyan";
  sourceUrl?: string;
  side: "left" | "right";
}) {
  const accent =
    accentColor === "cyan" ? "var(--accent-cyan)" : "var(--accent-lime)";

  return (
    <div
      className="h-full w-full overflow-hidden relative"
      style={{
        border: `1px solid ${accent}`,
        boxShadow: `0 0 0 1px rgba(0,255,255,0.06), 0 14px 50px rgba(0,0,0,0.55)`,
        transform: side === "left" ? "rotate(-0.8deg)" : "rotate(0.7deg)",
        background: "rgba(255,255,255,0.015)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover"
        style={{
          // Degrade colour to a washed-out Y2K CRT palette
          filter:
            "saturate(0.38) contrast(1.25) brightness(0.78) sepia(0.12)",
          // Nearest-neighbour upscale when the browser rescales
          imageRendering: "pixelated",
        }}
      />

      {/* Scanline overlay */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.18) 3px, rgba(0,0,0,0.18) 4px)",
          pointerEvents: "none",
        }}
      />

      {/* Vignette corner tint */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.45) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Accent glow edge */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          boxShadow: `inset 0 0 0 1px ${accent}22`,
          pointerEvents: "none",
        }}
      />

      {sourceUrl ? (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="absolute font-mono text-[8px] tracking-[0.3em] uppercase px-2 py-1"
          style={{
            bottom: side === "left" ? 6 : "auto",
            top: side === "right" ? 6 : "auto",
            right: 6,
            background: "rgba(10,10,10,0.88)",
            border: `1px solid ${accent}`,
            color: accent,
            letterSpacing: "0.25em",
          }}
        >
          SRC ◈
        </a>
      ) : null}
    </div>
  );
}

export default function PretextFlow({
  text,
  pullQuote,
  secondPullQuote,
  accentColor = "lime",
  imageUrl,
  imageAlt = "Article image",
  expanded = false,
  fetchingFull = false,
  sourceUrl,
}: Readonly<Props>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<PageResult[]>([]);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    let prevWidth = -1;
    let ro: ResizeObserver | null = null;

    document.fonts.ready.then(() => {
      if (cancelled) return;

      const fontFamily = globalThis.getComputedStyle(container).fontFamily;
      const prepared = prepareWithSegments(text, `${FONT_SIZE}px ${fontFamily}`);
      const charCount = text.length;

      type ColDef = { left: number; width: number };

      function colDefsFor(W: number): ColDef[] {
        if (expanded) {
          // Expanded: always 2-column — more comfortable for long-form reading
          return [
            { left: 0, width: W * 0.46 },
            { left: W * 0.53, width: W * 0.45 },
          ];
        }
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
        if (prevWidth !== -1 && Math.abs(W - prevWidth) < 1) return;
        prevWidth = W;

        const pageHeight = Math.max(480, window.innerHeight * 0.7);
        const maxLinesPerCol = Math.floor(pageHeight / LINE_HEIGHT);
        const colDefs = colDefsFor(W);

        let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
        let exhausted = false;
        const allPages: PageResult[] = [];

        while (!exhausted) {
          const pageColumns: ColumnResult[] = [];
          const isFirstPage = allPages.length === 0;
          const isSecondPage = allPages.length === 1;

          for (let ci = 0; ci < colDefs.length && !exhausted; ci++) {
            const def = colDefs[ci];

            // ── Pull-quote interruption (collapsed mode only) ────────────────
            const useObstacle =
              !expanded &&
              isFirstPage &&
              ci === OBSTACLE_COL &&
              colDefs.length > 1 &&
              def.width >= MIN_OBSTACLE_COL_WIDTH;

            const obstacleWidth = useObstacle ? def.width * OBSTACLE_WIDTH_FRAC : 0;
            const obstacleTop = OBSTACLE_START * LINE_HEIGHT;
            const obstacleHeight = OBSTACLE_LINES * LINE_HEIGHT;
            const obstacleLeft = def.width - obstacleWidth;

            // ── Image obstacle (collapsed mode, first page) ──────────────────
            const useImageCollapsed =
              !expanded &&
              Boolean(imageUrl) &&
              isFirstPage &&
              ci === IMAGE_COL &&
              def.width >= MIN_IMAGE_COL_WIDTH;

            // ── Image obstacle (expanded page 1 only) ────────────────────────
            const useImageExpandedP1 =
              expanded &&
              Boolean(imageUrl) &&
              isFirstPage &&
              ci === EXP_IMG_COL_P1 &&
              def.width >= MIN_EXP_COL_WIDTH;

            const useImage = useImageCollapsed || useImageExpandedP1;

            const imgWidthFrac = useImageExpandedP1 ? EXP_IMG_WIDTH_FRAC_P1 : IMAGE_WIDTH_FRAC;
            const imgLineCount = useImageExpandedP1 ? EXP_IMG_LINES_P1 : IMAGE_LINES;
            const imgSide: "left" | "right" = useImageExpandedP1 ? "right" : "left";

            const imageWidth = useImage ? def.width * imgWidthFrac : 0;
            const imageTop = IMAGE_START * LINE_HEIGHT;
            const imageHeight = imgLineCount * LINE_HEIGHT;
            const imageLeft = useImageExpandedP1 ? def.width - imageWidth : 0;

            // ── Second pull-quote interruption (expanded, page 2, col 0) ─────
            const useSecondObstacle =
              expanded &&
              isSecondPage &&
              ci === EXP_QUOTE2_COL &&
              def.width >= MIN_EXP_COL_WIDTH;

            const q2Width = useSecondObstacle ? def.width * EXP_QUOTE2_WIDTH_FRAC : 0;
            const q2Top = EXP_QUOTE2_START * LINE_HEIGHT;
            const q2Height = EXP_QUOTE2_LINES * LINE_HEIGHT;
            // Sits on the right side of column 0
            const q2Left = def.width - q2Width;

            const lines: string[] = [];

            for (let li = 0; li < maxLinesPerCol; li++) {
              const inObstacleZone =
                useObstacle &&
                li >= OBSTACLE_START &&
                li < OBSTACLE_START + OBSTACLE_LINES;

              const inImageZone =
                useImage && li >= IMAGE_START && li < IMAGE_START + imgLineCount;

              const inQ2Zone =
                useSecondObstacle &&
                li >= EXP_QUOTE2_START &&
                li < EXP_QUOTE2_START + EXP_QUOTE2_LINES;

              let lineWidth = def.width;
              if (inObstacleZone) lineWidth -= obstacleWidth;
              if (inImageZone) lineWidth -= imageWidth;
              if (inQ2Zone) lineWidth -= q2Width;

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
              secondObstacle: {
                present: useSecondObstacle,
                leftPx: q2Left,
                widthPx: q2Width,
                topPx: q2Top,
                heightPx: q2Height,
              },
              imageObstacle: {
                present: useImage,
                leftPx: imageLeft,
                widthPx: imageWidth,
                topPx: imageTop,
                heightPx: imageHeight,
                side: imgSide,
                pageIndex: allPages.length,
              },
            });
          }

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
  }, [text, imageUrl, expanded]);

  const totalHeight = pages.reduce((sum, p) => sum + p.heightPx, 0);
  const accent = accentColor === "cyan" ? "var(--accent-cyan)" : "var(--accent-lime)";

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
      {/* Pre-hydration fallback */}
      {!ready && (
        <p
          className="absolute inset-0 overflow-hidden opacity-0 select-none"
          aria-hidden="true"
        >
          {text}
        </p>
      )}

      {/* Fetching indicator — floats above the flow */}
      {fetchingFull && (
        <div
          className="absolute top-0 left-0 right-0 font-mono text-[9px] tracking-[0.35em] uppercase z-20"
          style={{ color: accent, opacity: 0.7 }}
        >
          ◈ Loading full article…
        </div>
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
              {/* Page number (expanded mode only, after first page) */}
              {expanded && pi > 0 && (
                <div
                  className="absolute font-mono text-[8px] tracking-[0.3em] uppercase"
                  style={{
                    top: 0,
                    right: 0,
                    color: accent,
                    opacity: 0.45,
                  }}
                >
                  {pi + 1} ◈
                </div>
              )}

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

                  {/* Pull-quote interruption */}
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
                      <Interruption
                        quote={pullQuote}
                        accentColor={accentColor}
                      />
                    </div>
                  )}

                  {/* Second pull-quote interruption (expanded, page 2) */}
                  {col.secondObstacle.present && (
                    <div
                      className="absolute"
                      style={{
                        left: col.secondObstacle.leftPx,
                        top: col.secondObstacle.topPx,
                        width: col.secondObstacle.widthPx,
                        height: col.secondObstacle.heightPx,
                      }}
                    >
                      <Interruption
                        quote={secondPullQuote ?? pullQuote}
                        accentColor={accentColor === "lime" ? "cyan" : "lime"}
                      />
                    </div>
                  )}

                  {/* Image obstacle */}
                  {col.imageObstacle.present && imageUrl ? (
                    <div
                      className="absolute"
                      style={{
                        left: col.imageObstacle.leftPx,
                        top: col.imageObstacle.topPx,
                        width: col.imageObstacle.widthPx,
                        height: col.imageObstacle.heightPx,
                        paddingRight: col.imageObstacle.side === "left" ? 10 : 0,
                        paddingLeft: col.imageObstacle.side === "right" ? 10 : 0,
                      }}
                    >
                      <PixelatedImage
                        src={imageUrl}
                        alt={imageAlt}
                        accentColor={accentColor}
                        sourceUrl={
                          // Only show source link on first image
                          col.imageObstacle.pageIndex === 0 ? sourceUrl : undefined
                        }
                        side={col.imageObstacle.side}
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          );
        })}
    </div>
  );
}
