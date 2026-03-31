"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { EditorialArticle } from "../lib/editorial";
import Masthead from "./Masthead";
import EditorialHero from "./EditorialHero";
import PretextFlow from "./PretextFlow";
import GhostLayer from "./GhostLayer";

const NAV_CATEGORIES = [
  { key: "mix", label: "All" },
  { key: "technology", label: "Tech" },
  { key: "science", label: "Science" },
  { key: "business", label: "Business" },
  { key: "general", label: "General" },
  { key: "health", label: "Health" },
  { key: "entertainment", label: "Culture" },
] as const;

type Props = {
  editorialArticles: EditorialArticle[];
  /** Identifier for the active feed: "mix", "mix:science", "technology", "search", etc. */
  activeCategory?: string;
  query?: string;
};

export default function ArticleStage({
  editorialArticles,
  activeCategory = "mix",
  query,
}: Readonly<Props>) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [autoScan, setAutoScan] = useState(true);
  const [paused, setPaused] = useState(false);
  const [speedMult, setSpeedMult] = useState<1 | 2 | 4 | 8 | 16>(1);
  const baseScanMs = 8000;
  const scanMs = Math.max(650, Math.round(baseScanMs / speedMult));
  const [expanded, setExpanded] = useState(false);
  const [fullTextCache, setFullTextCache] = useState<Record<string, string>>({});
  const [fetchingFull, setFetchingFull] = useState(false);
  const flowRef = useRef<HTMLDivElement>(null);

  const articles = editorialArticles;

  useEffect(() => {
    if (paused) return;
    if (!autoScan || articles.length <= 1) return;
    const t = setInterval(() => {
      setSelectedIdx((i) => (i + 1) % articles.length);
    }, scanMs);
    return () => clearInterval(t);
  }, [autoScan, paused, scanMs, articles.length]);

  const safeSelectedIdx =
    articles.length === 0 ? 0 : Math.min(selectedIdx, articles.length - 1);

  const selected = articles[safeSelectedIdx] ?? articles[0];

  const accentColor = useMemo<"lime" | "cyan">(() => {
    return safeSelectedIdx % 2 === 0 ? "lime" : "cyan";
  }, [safeSelectedIdx]);

  function cycleSpeed() {
    setSpeedMult((m) => (m === 16 ? 1 : ((m * 2) as 2 | 4 | 8 | 16)));
  }

  function pauseNow() {
    setPaused(true);
    setAutoScan(false);
  }

  function resumeNow() {
    setPaused(false);
    setAutoScan(true);
  }

  async function openFull(idx: number) {
    const article = articles[idx];
    setSelectedIdx(idx);
    pauseNow();
    setExpanded(true);
    setTimeout(() => flowRef.current?.scrollIntoView({ behavior: "smooth" }), 40);

    if (!article?.sourceUrl) return;
    const cacheKey = article.id;
    if (fullTextCache[cacheKey]) return;

    setFetchingFull(true);
    try {
      const res = await fetch(
        `/api/full-article?url=${encodeURIComponent(article.sourceUrl)}`,
      );
      const data = (await res.json()) as { text?: string; error?: string };
      if (data.text && data.text.length > 100) {
        setFullTextCache((prev) => ({ ...prev, [cacheKey]: data.text as string }));
      }
    } catch {
      // fall back to bodyFull silently
    } finally {
      setFetchingFull(false);
    }
  }

  /** True for exact match or "mix:science" matching "mix" */
  function isCategoryActive(key: string): boolean {
    return activeCategory === key || activeCategory.startsWith(`${key}:`);
  }

  const accent = accentColor === "cyan" ? "var(--accent-cyan)" : "var(--accent-lime)";

  return (
    <main className="relative min-h-screen bg-bg overflow-x-hidden">
      <GhostLayer words={selected?.ghostWords ?? ["SIGNAL"]} />

      <div className="relative z-10">
        <Masthead query={query} />

        {/* Category quick-nav */}
        <nav
          className="flex gap-0 px-6 md:px-10 overflow-x-auto border-b border-border"
          aria-label="Browse by category"
        >
          {NAV_CATEGORIES.map(({ key, label }) => {
            const isActive = isCategoryActive(key);
            const href = key === "mix" ? "/" : `/?category=${key}`;
            return (
              <a
                key={key}
                href={href}
                className="font-mono text-[9px] tracking-[0.25em] uppercase px-4 py-3 border-r border-border whitespace-nowrap transition hover:text-fg"
                style={{
                  color: isActive ? "var(--accent-lime)" : "var(--muted)",
                  borderBottom: isActive
                    ? "2px solid var(--accent-lime)"
                    : "2px solid transparent",
                  marginBottom: -1,
                }}
              >
                {label}
              </a>
            );
          })}
          {activeCategory === "search" && query ? (
            <span
              className="font-mono text-[9px] tracking-[0.25em] uppercase px-4 py-3 whitespace-nowrap"
              style={{ color: "var(--accent-cyan)", borderBottom: "2px solid var(--accent-cyan)", marginBottom: -1 }}
            >
              ◈ {query}
            </span>
          ) : null}
        </nav>

        <EditorialHero
          title={selected?.title ?? "Loading"}
          category={selected?.category ?? activeCategory.toUpperCase()}
          date={selected?.date ?? "2026.03.31"}
          subtitle={selected?.subtitle}
        />

        {/* Signal rail */}
        <section className="px-6 md:px-10 pt-6 pb-3">
          <div className="flex items-center justify-between gap-4">
            <div className="font-mono text-[9px] tracking-[0.35em] uppercase text-muted">
              Signal Rail
              <span className="ml-2 opacity-50">({articles.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAutoScan((v) => !v)}
                className="font-mono text-[9px] tracking-[0.25em] uppercase border border-border px-3 py-2 hover:text-fg transition"
                style={{
                  color: autoScan ? "var(--accent-lime)" : "var(--fg)",
                  borderColor: autoScan ? "var(--accent-lime)" : "var(--border)",
                }}
              >
                {autoScan ? "Autoscan On" : "Autoscan Off"}
              </button>
              <button
                type="button"
                onClick={() => (paused ? resumeNow() : pauseNow())}
                className="font-mono text-[9px] tracking-[0.25em] uppercase border border-border px-3 py-2 hover:text-fg transition"
                style={{
                  borderColor: paused ? "var(--accent-cyan)" : "var(--border)",
                  color: paused ? "var(--accent-cyan)" : "var(--fg)",
                }}
                aria-label={paused ? "Resume signal rail" : "Pause signal rail"}
              >
                {paused ? "Resume" : "Pause"}
              </button>
              <button
                type="button"
                onClick={cycleSpeed}
                className="font-mono text-[9px] tracking-[0.25em] uppercase border border-border px-3 py-2 hover:text-fg transition"
                aria-label="Toggle autoscan speed"
              >
                Speed ×{speedMult}
              </button>
            </div>
          </div>

          <div
            className="mt-4 flex gap-3 overflow-x-auto pb-2"
            aria-label="Fetched headlines"
          >
            {articles.map((a, idx) => {
              const isSelected = idx === selectedIdx;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    setSelectedIdx(idx);
                    setExpanded(false);
                  }}
                  className="min-w-[240px] text-left border border-border bg-bg/40 hover:bg-bg transition px-3 py-3 rounded-none"
                  style={{
                    borderColor: isSelected
                      ? accentColor === "lime"
                        ? "var(--accent-lime)"
                        : "var(--accent-cyan)"
                      : "var(--border)",
                    boxShadow: isSelected
                      ? `0 0 0 1px ${accentColor === "lime" ? "var(--accent-lime)" : "var(--accent-cyan)"}, 0 0 14px rgba(0,255,255,0.08)`
                      : "none",
                  }}
                  aria-current={isSelected ? "true" : "false"}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-mono text-[9px] tracking-[0.3em] uppercase text-muted">
                      {a.category}
                    </div>
                    <div className="font-mono text-[9px] tracking-[0.25em] uppercase text-muted">
                      {a.date}
                    </div>
                  </div>
                  <div
                    className="mt-2 font-display font-bold leading-snug text-fg text-[13px]"
                    style={{
                      color: isSelected
                        ? accentColor === "lime"
                          ? "var(--accent-lime)"
                          : "var(--accent-cyan)"
                        : "var(--fg)",
                    }}
                  >
                    {a.title}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Body copy section */}
        <section ref={flowRef} className="relative px-6 md:px-10 pt-10 pb-20">
          {expanded ? (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <div className="font-mono text-[9px] tracking-[0.35em] uppercase text-muted">
                Full read mode
              </div>
              <span className="text-border">—</span>
              <button
                type="button"
                className="font-mono text-[9px] tracking-[0.25em] uppercase border px-3 py-2 hover:text-fg transition"
                style={{ borderColor: accent, color: accent }}
                onClick={() => setExpanded(false)}
              >
                Collapse
              </button>
              {selected?.sourceUrl ? (
                <a
                  href={selected.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[9px] tracking-[0.25em] uppercase border border-border px-3 py-2 hover:text-fg transition"
                  style={{ color: "var(--fg)" }}
                >
                  Open source
                </a>
              ) : null}
            </div>
          ) : null}

          <PretextFlow
            key={selected?.id}
            text={
              expanded
                ? (fullTextCache[selected?.id ?? ""] || selected?.bodyFull) ?? ""
                : (selected?.bodyExcerpt) ?? ""
            }
            pullQuote={selected?.pullQuote ?? " "}
            secondPullQuote={selected?.subtitleFull ?? selected?.pullQuote ?? " "}
            accentColor={accentColor}
            imageUrl={selected?.imageUrl}
            imageAlt={selected?.title ?? "Article image"}
            expanded={expanded}
            fetchingFull={fetchingFull}
            sourceUrl={selected?.sourceUrl}
          />

          {!expanded && (
            <div className="mt-6 flex items-center gap-3">
              <div
                className="flex-1 h-px"
                style={{
                  background: "linear-gradient(to right, var(--border) 0%, transparent 100%)",
                }}
              />
              <button
                type="button"
                className="font-mono text-[9px] tracking-[0.35em] uppercase border px-4 py-2 transition hover:text-fg"
                style={{ borderColor: accent, color: accent }}
                onClick={() => openFull(safeSelectedIdx)}
              >
                Read more
              </button>
            </div>
          )}
        </section>

        <footer className="px-6 md:px-10 py-6 border-t border-border flex items-center justify-between">
          <span className="font-mono text-[9px] tracking-[0.3em] uppercase text-muted">
            PRETEXTSKI — All signals monitored
          </span>
          <span
            className="font-mono text-[9px] tracking-[0.2em]"
            style={{ color: "var(--accent-lime)" }}
          >
            ◈
          </span>
        </footer>
      </div>
    </main>
  );
}
