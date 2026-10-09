import type { Article } from './news';

/** Normalisation arabe pour la recherche : أإآ→ا ، ة→ه ، ى→ي ، casse + trim. */
export function normalizeAr(value: string): string {
  return value
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase()
    .trim();
}

export function articleMatchesQuery(
  article: Pick<Article, 'title' | 'summary'>,
  normalizedQuery: string,
): boolean {
  if (!normalizedQuery) return true;
  return normalizeAr(`${article.title} ${article.summary}`).includes(normalizedQuery);
}

/** Filtre insensible aux variantes arabes. Retourne le tableau tel quel si query vide. */
export function filterArticles<T extends Pick<Article, 'title' | 'summary'>>(
  articles: T[],
  query: string,
): T[] {
  const q = normalizeAr(query);
  if (!q) return articles;
  return articles.filter((a) => articleMatchesQuery(a, q));
}
