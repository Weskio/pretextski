export type NewsApiSource = {
  id?: string | null;
  name?: string | null;
};

export type NewsApiArticle = {
  source?: NewsApiSource;
  author?: string | null;
  title?: string | null;
  description?: string | null;
  url?: string | null;
  urlToImage?: string | null;
  publishedAt?: string | null;
  content?: string | null;
};

type NewsApiListResponse = {
  status: "ok" | "error";
  totalResults?: number;
  code?: string;
  message?: string;
  articles?: NewsApiArticle[];
};

const ALLOWED_CATEGORIES = new Set([
  "business",
  "entertainment",
  "general",
  "health",
  "science",
  "sports",
  "technology",
  "top-headlines",
]);

function sanitizeCategory(category?: string): string | undefined {
  if (!category) return undefined;
  const normalized = category.trim().toLowerCase();
  if (!ALLOWED_CATEGORIES.has(normalized)) return undefined;
  return normalized;
}

function requireNewsApiKey(): string {
  const key = process.env.NEWS_API_KEY;
  if (!key) {
    throw new Error("Missing NEWS_API_KEY env var.");
  }
  return key;
}

export async function fetchTopHeadlines(params: {
  category?: string;
  country?: string;
  pageSize?: number;
}): Promise<NewsApiArticle[]> {
  const apiKey = requireNewsApiKey();

  const url = new URL("https://newsapi.org/v2/top-headlines");
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("language", "en");
  url.searchParams.set("country", params.country ?? "us");
  url.searchParams.set("pageSize", String(params.pageSize ?? 8));

  const category = sanitizeCategory(params.category);
  if (category) url.searchParams.set("category", category);

  const res = await fetch(url, { cache: "no-store" });
  const data = (await res.json()) as NewsApiListResponse;

  if (!res.ok || data.status !== "ok") {
    const msg = data.message ?? `NewsAPI error (status=${data.status})`;
    throw new Error(msg);
  }

  return data.articles ?? [];
}

export async function fetchEverything(params: {
  q: string;
  language?: string;
  pageSize?: number;
}): Promise<NewsApiArticle[]> {
  const apiKey = requireNewsApiKey();

  const url = new URL("https://newsapi.org/v2/everything");
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("language", params.language ?? "en");
  url.searchParams.set("pageSize", String(params.pageSize ?? 8));
  url.searchParams.set("q", params.q);
  url.searchParams.set("sortBy", "publishedAt");

  const res = await fetch(url, { cache: "no-store" });
  const data = (await res.json()) as NewsApiListResponse;

  if (!res.ok || data.status !== "ok") {
    const msg = data.message ?? `NewsAPI error (status=${data.status})`;
    throw new Error(msg);
  }

  return data.articles ?? [];
}

