import type { NewsApiArticle } from "./newsapi";

export type EditorialArticle = {
  id: string;
  category: string;
  date: string; // yyyy.mm.dd
  title: string;
  subtitle?: string;
  subtitleFull?: string;
  pullQuote: string;
  bodyExcerpt: string;
  bodyFull: string;
  sourceUrl?: string;
  imageUrl?: string;
  sourceName?: string;
  author?: string;
  ghostWords: string[];
  accentHint?: "lime" | "cyan";
};

function toYyyyMmDd(iso?: string | null): string {
  if (!iso) return "2026.03.31";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "2026.03.31";
  return d.toISOString().slice(0, 10).replace(/-/g, ".");
}

function firstSentence(text?: string | null): string {
  if (!text) return "";
  const t = text.trim().replace(/\s+/g, " ");
  if (!t) return "";
  const m = t.match(/(.+?[.!?])(\s|$)/);
  return (m?.[1] ?? t).slice(0, 180);
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function makeExcerpt(body: string): string {
  const t = normalizeWhitespace(body);
  if (t.length <= 1100) return t;

  // Prefer to cut on paragraph boundary; otherwise sentence-ish boundary.
  const paraCut = t.slice(0, 1200).lastIndexOf("\n\n");
  if (paraCut > 650) return t.slice(0, paraCut).trim();

  const slice = t.slice(0, 1100);
  const sentenceCut = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? "),
  );
  if (sentenceCut > 520) return slice.slice(0, sentenceCut + 1).trim();

  return slice.trim();
}

function remixTail(opts: {
  sourceName?: string;
  date: string;
  author?: string;
}): string {
  const source = opts.sourceName ?? "the feed";
  const author = opts.author?.trim() ? `By ${opts.author.trim()}.` : "";

  return normalizeWhitespace(
    [
      "—",
      "SIGNAL NOTES",
      `${author} Captured ${opts.date}.`,
      `Primary source: ${source}.`,
      "What to watch: how the headline frames causality, which verbs it chooses, and what it silently assumes.",
    ]
      .filter(Boolean)
      .join("\n\n"),
  );
}

const STOP_WORDS = new Set([
  "THE",
  "AND",
  "FOR",
  "WITH",
  "THAT",
  "THIS",
  "FROM",
  "ARE",
  "WAS",
  "WERE",
  "BE",
  "HAVE",
  "HAS",
  "NOT",
  "YOU",
  "YOUR",
  "BUT",
  "IN",
  "ON",
  "OF",
  "TO",
  "A",
  "AN",
  "AS",
  "AT",
  "BY",
  "IT",
  "OR",
  "WE",
  "THEY",
  "I",
  "US",
  "OUR",
  "THEIR",
  "NEW",
  "NEWS",
]);

function extractGhostWords(input: string, maxWords = 7): string[] {
  const words = input
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/g)
    .map((w) => w.trim())
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));

  const uniq: string[] = [];
  for (const w of words) {
    if (uniq.includes(w)) continue;
    uniq.push(w);
    if (uniq.length >= maxWords) break;
  }

  // Ensure we always have enough words to place visually.
  while (uniq.length < 5) {
    uniq.push(["VECTOR", "SIGNAL", "LATENT", "NEURAL", "DREAM"][uniq.length % 5]);
  }

  return uniq;
}

function buildEditorialBody(article: NewsApiArticle): string {
  // NewsAPI free tier truncates content at ~200 chars and appends "[+N chars]".
  // Strip that artifact before using the content.
  const rawContent = (article.content ?? "").trim();
  const content = rawContent
    .replace(/…?\s*\[[\+\d]+ chars?\]/gi, "")
    .replace(/\.\.\.\s*\[[\+\d]+ chars?\]/gi, "")
    .trim();
  const description = (article.description ?? "").trim();

  const primary =
    content.length >= 200 ? content : description.length >= 120 ? description : "";
  const capped = primary.length > 8000 ? primary.slice(0, 8000) : primary;

  if (capped) {
    // PretextFlow is sensitive to text size (it changes column geometry),
    // so we ensure we have "just enough" length to exercise different layouts.
    if (capped.length < 700) {
      const source = article.source?.name ?? "the feed";
      const booster = [
        `Signal briefing: ${source}.`,
        "Analysts say the story is less about the headline and more about what the headline attempts to predict.",
        "In the gap between claim and verification, a second narrative emerges: the one you can almost see.",
      ].join(" ");
      return normalizeWhitespace(`${capped}\n\n${booster}`);
    }
    return normalizeWhitespace(capped);
  }

  // Extreme fallback: build a deterministic editorial body.
  const title = article.title?.trim() ?? "Untitled signal";
  const source = article.source?.name ?? "unknown source";
  return normalizeWhitespace(
    [
      `Today's signal: ${title}.`,
      `Source context: ${source}.`,
      "This briefing is intentionally editorial—designed to push Pretext’s line-measurement boundaries when real content is missing.",
      "The interface keeps flowing anyway: spacing, rhythm, interruptions, and the illusion of understanding.",
    ].join("\n\n")
  );
}

export function toEditorialArticle(
  article: NewsApiArticle,
  opts: { fallbackCategory?: string } = {}
): EditorialArticle {
  const title = (article.title ?? "").trim() || "Untitled signal";
  const subtitleFull =
    (article.description ?? "").trim() ||
    (article.source?.name ? `${article.source.name} brief` : undefined);
  const subtitle = subtitleFull?.slice(0, 190);

  const category =
    (opts.fallbackCategory ?? "").trim().toUpperCase() ||
    (article.source?.name ?? "SIGNAL").trim().toUpperCase();

  const date = toYyyyMmDd(article.publishedAt);
  const pullQuote = firstSentence(article.description ?? article.content ?? title) ||
    title.slice(0, 120);

  const sourceUrl = (article.url ?? "").trim() || undefined;
  const sourceName = (article.source?.name ?? "").trim() || undefined;
  const imageUrl = (article.urlToImage ?? "").trim() || undefined;
  const author = (article.author ?? "").trim() || undefined;

  const baseBody = buildEditorialBody(article);
  const bodyFull = normalizeWhitespace(
    `${baseBody}\n\n${remixTail({ sourceName, date, author })}`,
  );
  const bodyExcerpt = makeExcerpt(baseBody);

  const ghostWords = extractGhostWords(`${title} ${subtitle ?? ""} ${pullQuote}`);

  const id = sourceUrl ? sourceUrl : `${date}-${title}`.replace(/\s+/g, "-").toLowerCase();

  return {
    id,
    category,
    date,
    title,
    subtitle,
    subtitleFull,
    pullQuote,
    bodyExcerpt,
    bodyFull,
    sourceUrl,
    imageUrl,
    sourceName,
    author,
    ghostWords,
  };
}

export function fallbackEditorialArticles(): EditorialArticle[] {
  const base = {
    category: "SILICON MINDS",
    date: "2026.03.30",
    title: "The Machine Learns to Dream in Latent Space",
    subtitle:
      "Inside the recursive hallucinations powering the next frontier of generative intelligence — and why the line between prediction and understanding is already blurred.",
    subtitleFull:
      "Inside the recursive hallucinations powering the next frontier of generative intelligence — and why the line between prediction and understanding is already blurred.",
    pullQuote:
      "The model doesn't understand — it interpolates. But interpolation at sufficient depth begins to look indistinguishable from understanding.",
    bodyFull: `There is a geometry to thought that we are only beginning to trace. Deep inside the embedding spaces of large language models, ideas do not sit as discrete objects — they fold, curve, and collapse into one another in ways that mirror, with uncanny fidelity, the associative architectures of human memory. Researchers call this the latent space. Engineers call it an accident of scale. Philosophers are still arguing about what to call it at all.

The question that animates a generation of researchers is deceptively simple: when a model predicts the next token with superhuman consistency, is it understanding the sentence, or is it executing an extraordinarily sophisticated statistical average? The empiricists say it does not matter — capability is the measure. The rationalists say it matters enormously, because a system that mimics understanding without possessing it is, at some point, guaranteed to fail in ways we will not anticipate.

What both camps agree on is that the scale of the disagreement has never been higher. We are now training models whose parameter counts exceed the number of neurons in a human cerebral cortex, on datasets that dwarf the text a single human could read in ten thousand lifetimes. The emergent behaviours that arise at these scales — chain-of-thought reasoning, spontaneous tool use, compositional generalisation — were not designed. They were discovered, often by researchers who ran a benchmark and found results they did not expect.

This is the strange epistemology of modern AI development: we build the experiment and then try to understand what happened. The model is not a hypothesis. It is an observation.

Inside Anthropic's SF offices, the conversation has shifted from capability benchmarks to something harder to quantify — alignment. The question is not merely whether a model can solve a problem, but whether its solution path is legible, auditable, and stable under distribution shift. A model that solves the training distribution perfectly and fails catastrophically on the first novel input is not a model that understands. It is a model that has overfit to a world that no longer exists.

The dream, if you can call it that, is a system that generalises the way a skilled engineer does — not by memorising solutions, but by decomposing problems into primitives it has never seen combined in quite this way, and reasoning its way through. Whether the transformer architecture is capable of this remains genuinely open. The evidence is mixed, and the stakes are not.`,
    ghostWords: ["LATENT", "NEURAL", "DREAM", "VECTORS", "SPACE", "SIGNAL"],
  };

  return [
    {
      ...base,
      id: "fallback-001",
      date: "2026.03.30",
      bodyExcerpt: makeExcerpt(base.bodyFull),
    },
    {
      ...base,
      id: "fallback-002",
      date: "2026.03.29",
      title: "Broadcast Compression and the Politics of Attention",
      subtitle:
        "When every feed is optimized, what remains is not news—but the shape of the choices you were never allowed to see.",
      subtitleFull:
        "When every feed is optimized, what remains is not news—but the shape of the choices you were never allowed to see.",
      pullQuote:
        "The interface is the newsroom: it decides what fits, what loads, and what gets remembered.",
      ghostWords: ["ATTENTION", "COMPRESSION", "FEED", "SIGNAL", "CACHE", "GLITCH"],
      bodyFull: normalizeWhitespace(
        [
          "Every era believes it is seeing the world for the first time. But the world you see is the one your pipeline can represent.",
          "Compression is not merely about bandwidth; it is about epistemology—what counts as detail, what gets averaged away, and which edges remain sharp enough to feel like truth.",
          "In a feed, the headline is a promise. The promise can be kept with precision—or with choreography.",
          "This briefing is editorial by design: it forces Pretext to recalculate line geometry as the text lengths shift, while the layout stays consistent.",
        ].join("\n\n")
      ),
      bodyExcerpt: makeExcerpt(
        normalizeWhitespace(
          [
            "Every era believes it is seeing the world for the first time. But the world you see is the one your pipeline can represent.",
            "Compression is not merely about bandwidth; it is about epistemology—what counts as detail, what gets averaged away, and which edges remain sharp enough to feel like truth.",
            "In a feed, the headline is a promise. The promise can be kept with precision—or with choreography.",
          ].join("\n\n"),
        ),
      ),
    },
    {
      ...base,
      id: "fallback-003",
      date: "2026.03.28",
      title: "The New Typography of Machine Time",
      subtitle:
        "From reflow to rhythm: how systems teach us to read faster than we think.",
      subtitleFull:
        "From reflow to rhythm: how systems teach us to read faster than we think.",
      pullQuote:
        "If typography is tempo, then computation is the conductor you can't see.",
      ghostWords: ["TIME", "RHYTHM", "TYPE", "TEMPO", "SIGNAL", "LATENT"],
      bodyFull: normalizeWhitespace(
        [
          "In machine time, reflow is a heartbeat. Every resize becomes a sentence re-written in real time.",
          "Designers used to promise stability. Now we build illusions—layout that believes it will remain the same, even as the device insists otherwise.",
          "The glitch is not a bug. It is a reminder that the page is an event, not an artifact.",
          "Pretext helps you feel that event: the lines are measured, segmented, and then set back into a rhythm that looks inevitable.",
        ].join("\n\n")
      ),
      bodyExcerpt: makeExcerpt(
        normalizeWhitespace(
          [
            "In machine time, reflow is a heartbeat. Every resize becomes a sentence re-written in real time.",
            "Designers used to promise stability. Now we build illusions—layout that believes it will remain the same, even as the device insists otherwise.",
          ].join("\n\n"),
        ),
      ),
    },
  ];
}

