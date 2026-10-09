import { describe, expect, it } from 'vitest';
import { diffFreshArticles } from './news-watcher';
import type { Article } from './news';

const mk = (id: string): Article => ({
  id,
  title: `t-${id}`,
  url: `https://hihi2.com/p${id}.html`,
  published: null,
  summary: '',
  image: null,
  paragraphs: [],
  tags: [],
});

describe('diffFreshArticles', () => {
  it('retourne [] si pas de knownId géré par check (vide)', () => {
    expect(diffFreshArticles([mk('3'), mk('2')], null)).toEqual([]);
  });
  it('retourne les articles avant le knownId', () => {
    const articles = [mk('5'), mk('4'), mk('3')];
    expect(diffFreshArticles(articles, '3').map((a) => a.id)).toEqual(['5', '4']);
  });
  it('retourne [] si head inchangé', () => {
    const articles = [mk('5'), mk('4')];
    expect(diffFreshArticles(articles, '5')).toEqual([]);
  });
  it('retourne 1 seul si head inconnu (anti-spam)', () => {
    const articles = [mk('9'), mk('8'), mk('7')];
    expect(diffFreshArticles(articles, '1').map((a) => a.id)).toEqual(['9']);
  });
});
