import { test, assert, vi } from 'vitest';
import { safeStorage, useAppStore, palettes, registerAppVisit } from './store.ts';
import { MAX_SAVED, isSavedArticle, toSavedArticle } from './news.ts';
import type { Article } from './news.ts';

const mockArticle = (id: string): Article => ({
  id: `https://hihi2.com/p${id}.html`,
  url: `https://hihi2.com/p${id}.html`,
  title: `خبر تجريبي ${id}`,
  summary: `ملخص الخبر ${id}`,
  published: new Date().toISOString(),
  image: 'https://sc1.hihi2.com/photo.jpg',
  paragraphs: [`فقرة أولى ${id}`, `فقرة ثانية ${id}`],
  tags: ['رياضة', 'كرة القدم'],
});

test('one launch counts one visit even when mounted twice', async () => {
  await safeStorage.setItem('akhbar-visits-v1', '1');
  await Promise.all([registerAppVisit(), registerAppVisit()]);
  assert.equal(useAppStore.getState().appVisits, 2);
  assert.equal(await safeStorage.getItem('akhbar-visits-v1'), '2');
});

test('alert subscriptions toggle independently of the current category', () => {
  const store = useAppStore.getState();
  const before = store.alertCategories;
  store.toggleAlertCategory('africa');
  assert.equal(useAppStore.getState().alertCategories.includes('africa'), !before.includes('africa'));
  store.toggleAlertCategory('africa');
  assert.deepEqual(useAppStore.getState().alertCategories, before);
});

test('store initializes with correct default values and theme palettes', () => {
  const state = useAppStore.getState();
  assert.equal(state.category, 'latest');
  assert.equal(state.fontSizeDelta, 0);
  assert.equal(typeof state.cacheRetentionDays, 'number');
  assert.deepEqual(palettes.light.green, '#176347');
  assert.deepEqual(palettes.dark.green, '#98BD91');
});

test('store handles theme toggling and category selection', () => {
  const store = useAppStore.getState();
  const initialDark = store.dark;
  
  store.toggleTheme();
  assert.equal(useAppStore.getState().dark, !initialDark);
  
  store.toggleTheme();
  assert.equal(useAppStore.getState().dark, initialDark);

  store.selectCategory('europe');
  assert.equal(useAppStore.getState().category, 'europe');
  
  store.selectCategory('latest');
  assert.equal(useAppStore.getState().category, 'latest');
});

test('store manages saved articles: add, toggle remove, and clear all', () => {
  const store = useAppStore.getState();
  const article1 = mockArticle('101');
  const article2 = mockArticle('102');

  store.clearSaved();
  assert.equal(useAppStore.getState().saved.length, 0);

  // Add article 1
  store.toggleSaved(article1);
  assert.equal(useAppStore.getState().saved.length, 1);
  assert.equal(useAppStore.getState().saved[0].id, article1.id);

  // Add article 2
  store.toggleSaved(article2);
  assert.equal(useAppStore.getState().saved.length, 2);

  // Toggle article 1 again -> should remove it
  store.toggleSaved(article1);
  assert.equal(useAppStore.getState().saved.length, 1);
  assert.equal(useAppStore.getState().saved[0].id, article2.id);

  // Clear all saved
  store.clearSaved();
  assert.equal(useAppStore.getState().saved.length, 0);
});

test('store limits saved articles to a maximum of 50 items (LRU)', () => {
  const store = useAppStore.getState();
  store.clearSaved();

  for (let i = 1; i <= 60; i++) {
    store.toggleSaved(mockArticle(String(i)));
  }

  assert.equal(useAppStore.getState().saved.length, 50);
  // Le plus récent en premier
  assert.equal(useAppStore.getState().saved[0].id, mockArticle('60').id);
  store.clearSaved();
});

test('store persists light saved articles without paragraphs', () => {
  const store = useAppStore.getState();
  store.clearSaved();

  store.toggleSaved(mockArticle('201'));
  const saved = useAppStore.getState().saved;
  assert.equal(saved.length, 1);
  const item = saved[0]!;
  assert.ok(!('paragraphs' in item), 'paragraphs ne doit pas être persisté');
  assert.equal(item.title, 'خبر تجريبي 201');
  assert.equal(item.summary, 'ملخص الخبر 201');
  assert.deepEqual(item.tags, ['رياضة', 'كرة القدم']);
  assert.ok(isSavedArticle(item));
  assert.ok(!Number.isNaN(Date.parse(item.savedAt)));
  store.clearSaved();
});

test('toSavedArticle migre les anciens favoris complets', () => {
  const light = toSavedArticle(mockArticle('301'));
  assert.ok(isSavedArticle(light));
  assert.ok(!('paragraphs' in light));
  assert.equal(MAX_SAVED, 50);
});

test('safeStorage falls back to the in-memory store in the test runtime', async () => {
  const key = 'test-memory-fallback';
  await safeStorage.setItem(key, 'ok');
  assert.equal(await safeStorage.getItem(key), 'ok');
  await safeStorage.removeItem(key);
  assert.equal(await safeStorage.getItem(key), null);
});

test('store handles font size scaling with upper and lower bounds', () => {
  const store = useAppStore.getState();
  store.resetFontSize();
  assert.equal(useAppStore.getState().fontSizeDelta, 0);

  // Increase step by step
  store.increaseFontSize(); // 2
  store.increaseFontSize(); // 4
  store.increaseFontSize(); // 6
  store.increaseFontSize(); // 8
  assert.equal(useAppStore.getState().fontSizeDelta, 8);

  // Should not exceed maximum of 8
  store.increaseFontSize();
  assert.equal(useAppStore.getState().fontSizeDelta, 8);

  // Reset
  store.resetFontSize();
  assert.equal(useAppStore.getState().fontSizeDelta, 0);

  // Decrease step by step
  store.decreaseFontSize(); // -2
  assert.equal(useAppStore.getState().fontSizeDelta, -2);

  // Should not go below minimum of -2
  store.decreaseFontSize();
  assert.equal(useAppStore.getState().fontSizeDelta, -2);

  store.resetFontSize();
  assert.equal(useAppStore.getState().fontSizeDelta, 0);
});

test('store manages retention days setting and updates state', async () => {
  const store = useAppStore.getState();
  await store.setCacheRetentionDays(1);
  assert.equal(useAppStore.getState().cacheRetentionDays, 1);

  await store.setCacheRetentionDays(7);
  assert.equal(useAppStore.getState().cacheRetentionDays, 7);
});

test('store handles toast notices', () => {
  const store = useAppStore.getState();
  store.setNotice('رسالة اختبار');
  assert.equal(useAppStore.getState().notice, 'رسالة اختبار');
});

test('setNotice réarme le timer au lieu de le fuir', () => {
  const store = useAppStore.getState();
  vi.useFakeTimers();
  try {
    store.setNotice('même message');
    vi.advanceTimersByTime(2000);
    store.setNotice('même message');
    vi.advanceTimersByTime(2000);
    assert.equal(useAppStore.getState().notice, 'même message');
    vi.advanceTimersByTime(2000);
    assert.equal(useAppStore.getState().notice, '');
  } finally {
    vi.useRealTimers();
  }
});
