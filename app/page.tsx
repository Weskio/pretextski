import ArticleStage from "./components/ArticleStage";
import { fetchEverything, fetchTopHeadlines } from "./lib/newsapi";
import {
  fallbackEditorialArticles,
  toEditorialArticle,
  type EditorialArticle,
} from "./lib/editorial";

export const dynamic = "force-dynamic";

const EXTRA_CATEGORIES = [
  "science",
  "business",
  "general",
  "health",
  "entertainment",
] as const;

type ExtraCategory = (typeof EXTRA_CATEGORIES)[number];

/** Rotates daily so the second block of 10 changes every 24 h. */
function dailySecondaryCategory(): ExtraCategory {
  const dayIndex = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
  return EXTRA_CATEGORIES[dayIndex % EXTRA_CATEGORIES.length];
}

async function fetchDefaultArticles(): Promise<{
  articles: EditorialArticle[];
  secondaryCategory: string;
}> {
  const secondary = dailySecondaryCategory();

  const [techResult, secResult] = await Promise.allSettled([
    fetchTopHeadlines({ category: "technology", pageSize: 10 }),
    fetchTopHeadlines({ category: secondary, pageSize: 12 }),
  ]);

  const tech = techResult.status === "fulfilled" ? techResult.value : [];
  const sec = secResult.status === "fulfilled" ? secResult.value : [];

  const techArticles = tech.map((a) =>
    toEditorialArticle(a, { fallbackCategory: "technology" }),
  );
  const secArticles = sec.map((a) =>
    toEditorialArticle(a, { fallbackCategory: secondary }),
  );

  // Deduplicate by id then interleave: tech, sec, tech, sec…
  const seen = new Set<string>();
  const interleaved: EditorialArticle[] = [];
  const maxLen = Math.max(techArticles.length, secArticles.length);

  for (let i = 0; i < maxLen; i++) {
    for (const pool of [techArticles, secArticles]) {
      if (i < pool.length) {
        const a = pool[i];
        if (!seen.has(a.id) && a.title.trim().length > 0) {
          seen.add(a.id);
          interleaved.push(a);
        }
      }
    }
  }

  return { articles: interleaved.slice(0, 22), secondaryCategory: secondary };
}

async function fetchCategoryArticles(
  category: string,
): Promise<EditorialArticle[]> {
  const raw = await fetchTopHeadlines({ category, pageSize: 20 });
  return raw
    .map((a) => toEditorialArticle(a, { fallbackCategory: category }))
    .filter((a) => a.title.trim().length > 0)
    .slice(0, 20);
}

async function fetchSearchArticles(q: string): Promise<EditorialArticle[]> {
  const raw = await fetchEverything({ q, pageSize: 20 });
  return raw
    .map((a) => toEditorialArticle(a, { fallbackCategory: "SEARCH" }))
    .filter((a) => a.title.trim().length > 0)
    .slice(0, 20);
}

export default async function Home({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>) {
  type SP = Record<string, string | string[] | undefined>;
  const sp: SP = await (searchParams ?? Promise.resolve<SP>({}));

  const qRaw = sp.q;
  const q =
    typeof qRaw === "string"
      ? qRaw.trim() || undefined
      : Array.isArray(qRaw) && typeof qRaw[0] === "string"
        ? qRaw[0].trim() || undefined
        : undefined;

  const categoryRaw = sp.category;
  const categoryParam =
    typeof categoryRaw === "string"
      ? categoryRaw.trim() || undefined
      : Array.isArray(categoryRaw) && typeof categoryRaw[0] === "string"
        ? categoryRaw[0].trim() || undefined
        : undefined;

  let editorialArticles: EditorialArticle[] = [];
  let activeCategory = categoryParam ?? "mix";

  try {
    if (q) {
      editorialArticles = await fetchSearchArticles(q);
      activeCategory = "search";
    } else if (categoryParam) {
      editorialArticles = await fetchCategoryArticles(categoryParam);
      activeCategory = categoryParam;
    } else {
      const { articles, secondaryCategory } = await fetchDefaultArticles();
      editorialArticles = articles;
      activeCategory = `mix:${secondaryCategory}`;
    }
  } catch (err) {
    console.error("NewsAPI fetch failed:", err);
  }

  if (editorialArticles.length > 0) {
    return (
      <ArticleStage
        editorialArticles={editorialArticles}
        activeCategory={activeCategory}
        query={q}
      />
    );
  }

  return (
    <ArticleStage
      editorialArticles={fallbackEditorialArticles()}
      activeCategory="signal"
      query={q}
    />
  );
}
