import { describe, expect, it } from 'vitest';
import { articleMatchesQuery, filterArticles, normalizeAr } from './search';

describe('normalizeAr', () => {
  it('unifie les variantes du alif', () => {
    expect(normalizeAr('أحمد إبراهيم آمن')).toBe('احمد ابراهيم امن');
  });
  it('convertit ة→ه et ى→ي', () => {
    expect(normalizeAr('مباراة')).toBe('مباراه');
    expect(normalizeAr('إلى')).toBe('الي');
  });
  it('trim + lowercase (+ ة→ه)', () => {
    expect(normalizeAr('  كرة ABC  ')).toBe('كره abc');
  });
});

describe('filterArticles', () => {
  const articles = [
    { title: 'ريال مدريد يفوز بالكلاسيكو', summary: 'مباراة قوية في البرنابيو' },
    { title: 'سوق الانتقالات', summary: 'أخبار اللاعبين' },
  ];
  it('retourne tout si query vide', () => {
    expect(filterArticles(articles, '   ')).toHaveLength(2);
  });
  it('trouve via le titre avec variantes arabes', () => {
    expect(filterArticles(articles, 'مباراه')).toHaveLength(1);
    expect(filterArticles(articles, 'أنتقالات')).toHaveLength(1);
  });
  it('trouve via le résumé', () => {
    expect(filterArticles(articles, 'البرنابيو')).toHaveLength(1);
  });
  it('retourne [] sans match', () => {
    expect(filterArticles(articles, 'تنس')).toHaveLength(0);
  });
  it('articleMatchesQuery accepte query vide normalisée', () => {
    expect(articleMatchesQuery(articles[0]!, '')).toBe(true);
  });
});
