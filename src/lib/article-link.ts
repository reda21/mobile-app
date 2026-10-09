import { isSourceUrl, type CategoryId } from "./categories.ts";

export function getArticleId(sourceUrl: string): string | null {
  if (!isSourceUrl(sourceUrl)) return null;
  const url = new URL(sourceUrl);
  const id = url.pathname.match(/\/p([1-9]\d{0,11})\.html$/)?.[1] ?? url.searchParams.get("p");
  return id && /^[1-9]\d{0,11}$/.test(id) ? id : null;
}

export function getArticleHref(sourceUrl: string, category: CategoryId = "latest"): string {
  const id = getArticleId(sourceUrl);
  return `/article/${id ?? "unknown"}${category === "latest" ? "" : `?category=${category}`}`;
}
