# 21 Conseils pour améliorer ton projet Coachable / Akhbar Al-Kora

> App : Expo SDK 57 + Expo Router + React Native + Zustand + AsyncStorage + RSS (`hihi2.com`)
> Objectif : performance mobile, UX arabe RTL, cache offline, qualité store / build EAS.
> Fichier généré le 09/10/2026. Mis à jour : react-call intégré ✅

## Comment utiliser ce fichier
- Chaque conseil a : `Priorité` (🔴 Haute / 🟡 Moyenne / 🟢 Bonus), `Fichier(s)` concernés, `Pourquoi`, `Action concrète`.
- Coche `[ ]` -> `[x]` quand c'est fait.

---

### 1. Remplacer `FlatList` par `FlashList` sur les listes d'articles
- [x] Fait le 09/10/2026 — `@shopify/flash-list@2.0.2`
- **Priorité :** 🔴 Haute
- **Fichier(s) :** `src/app/index.tsx`, `src/app/saved.tsx`, `src/app/categories.tsx`
- **Pourquoi :** Tu affiches potentiellement 50-100 articles avec images. `FlatList` rame sur Android low-end. `FlashList` de Shopify recycle les vues.
- **Fait :**
  ```bash
  npx expo install @shopify/flash-list
  ```
  `index.tsx` + `saved.tsx` migrés vers `FlashList` (v2 : mesure auto, plus de `estimatedItemSize`), avec `getItemType` hero/row, `drawDistance`, `renderItem`/`keyExtractor` en `useCallback`, filtrage recherche en `useMemo`. `categories.tsx` reste en `ScrollView` (grille statique, pas de liste longue).

### 2. Mémoriser `ArticleCard`, `Photo`, `Header` avec `React.memo`
- [x] Fait le 09/10/2026
- **Priorité :** 🔴 Haute
- **Fichier(s) :** `src/components/news-ui.tsx`
- **Pourquoi :** Aujourd'hui chaque `toggleTheme`, `setQuery` ou `notice` re-render toute la liste. Le scroll devient saccadé.
- **Fait :** `Icon`, `Ball`, `ArabicText`, `Header`, `Photo`, `Bookmark`, `ArticleCard`, `EmptyState` passés en `memo` ; nouveau `NewsRow` mémoïsé pour `renderItem` ; `Intl.DateTimeFormat('ar')` mis en cache module (au lieu d'une instance par carte). Le changement de thème continue de fonctionner car `usePreferences()` est lu à l'intérieur des composants.

### 3. Debouncer la recherche + extraire `normalize`
- [x] Fait le 09/10/2026
- **Priorité :** 🔴 Haute
- **Fichier(s) :** `src/app/index.tsx`, nouveau `src/lib/search.ts`, nouveau `src/hooks/use-debounced-value.ts`
- **Pourquoi :** `normalize()` est recréé et `filter()` tourne à chaque frappe sur tout le feed. Sur 100 articles en arabe c'est coûteux.
- **Fait :**
  - `normalizeAr()` extrait dans `src/lib/search.ts` (أإآ→ا ، ة→ه ، ى→ي ، lowercase + trim) + `filterArticles()` / `articleMatchesQuery()` testés (`search.test.ts`, 8 tests).
  - `useDebouncedValue(query, 250)` : le `TextInput` reste immédiat, seul le filtrage est différé ; indicateur « جارٍ البحث… » pendant le délai.
  - Résultat mémoïsé en `useMemo` sur la query débouncée.

### 4. Ne plus stocker les articles complets dans `AsyncStorage` profil
- [x] Fait le 09/10/2026
- **Priorité :** 🔴 Haute
- **Fichier(s) :** `src/lib/store.ts`, `src/lib/news.ts`, `src/components/news-ui.tsx`, `src/app/article/[id].tsx`, `src/app/saved.tsx`
- **Pourquoi :** `saved: Article[]` avec `paragraphs` + `summary` = payload JSON énorme. `STORAGE_KEY='akhbar-al-kora-profile-v1'` va exploser la limite AsyncStorage et ralentir `init()`.
- **Fait :**
  - Nouveau type `SavedArticle` (`news.ts`) : `{id, url, title, summary, image, published, tags, savedAt}` — sans `paragraphs` (le champ lourd). `summary`+`tags` conservés pour garder l'UX identique (listes + mode hors-ligne).
  - `toggleSaved()` convertit via `toSavedArticle()` + LRU plafonné à `MAX_SAVED = 50` (au lieu de 100 complets).
  - `init()` migre les anciens favoris complets (`isArticle` → `toSavedArticle`) et valide les nouveaux (`isSavedArticle`).
  - `article/[id].tsx` affiche le favori léger instantanément puis recharge le corps via `getArticle(id)` ; repli « texte après connexion » si hors-ligne.
  - `Photo`/`Bookmark`/`ArticleCard`/`NewsRow` acceptent `CardArticle = Article | SavedArticle`.

### 5. Ajouter pagination / infinite scroll réel
- [x] Fait le 09/10/2026
- **Priorité :** 🟡 Moyenne
- **Fichier(s) :** `src/app/index.tsx`
- **Pourquoi :** Tu charges tout le flux RSS d'un coup. Pas de `onEndReached`, pas de `initialNumToRender` optimisé au-delà de 6.
- **Fait :** Fenêtre cliente `PAGE_SIZE = 12` : `visibleArticles = listData.slice(0, visibleCount)`, `onEndReached` + bouton « عرض المزيد (باقي X) » (`ListFooterComponent`), reset auto au changement de catégorie (ajustement au rendu, sans effet). La pagination serveur (`?paged=2`) reste une étape ultérieure si `hihi2.com` la supporte.

### 6. Sécuriser le cache : taille max, TTL par catégorie, `persistFeeds` throttled
- [x] Fait le 09/10/2026
- **Priorité :** 🔴 Haute
- **Fichier(s) :** `src/lib/news.ts`, nouveau `src/lib/news-cache.test.ts`
- **Pourquoi :** `persistFeeds()` est appelé à chaque fetch sans `await` + sans throttle. `JSON.stringify(obj)` de tous les feeds peut faire des ANR.
- **Fait :**
  - Plafonds : `MAX_FEED_ARTICLES = 30` (tronqué dans `getNews` + au chargement), `MAX_DETAILS = 100` (déjà appliqué à l'insertion, désormais aussi au chargement + validation `isArticle`).
  - Persistance throttlée 500 ms (`schedulePersistFeeds` / `schedulePersistDetails`, un seul timer) + `flushCachePersist()` pour forcer l'écriture.
  - Clés versionnées `...-cache-v2` avec relecture du `v1` existant (migration transparente).
  - Fenêtre de fraîcheur 120 s conservée. Tests : plafond à 30, réutilisation cache sans fetch.

### 7. Corriger les fuites `setTimeout` / `AbortController`
- [x] Fait le 09/10/2026
- **Priorité :** 🔴 Haute
- **Fichier(s) :** `src/lib/store.ts`, `src/lib/news.ts`, `src/app/index.tsx`, `src/app/article/[id].tsx`
- **Pourquoi :** `setNotice` crée un `setTimeout` jamais clearé. `readRSS` crée un `new AbortController()` par défaut même si un controller est passé. `key = ${category}:${reload}` recrée l'effet en boucle.
- **Fait :**
  - `setNotice` : `noticeTimer` stocké + `clearTimeout` avant chaque appel (test fake-timers : double appel identique ne s'efface plus en avance).
  - `readRSS(url, controller?)` : `const ctrl = controller ?? new AbortController()` — plus d'instance jetable quand un controller est fourni.
  - `index.tsx` + `article/[id].tsx` : `key` calculée dans l'effet, deps réduites à `[category, reload, ready]` / `[id, ready, retry]`.

### 8. Ajouter `ErrorBoundary` + écran d'erreur global
- [ ] À faire
- **Priorité :** 🔴 Haute
- **Fichier(s) :** `src/app/_layout.tsx`, nouveau `src/components/error-boundary.tsx`
- **Pourquoi :** Si `parseFeed` throw (`Invalid RSS`), ou `fonts` fail, l'app écran blanc. Aucun `expo-router/error-boundary` actuellement.
- **Action :** Crée un `ErrorBoundary` avec bouton "Réessayer" + `Sentry.captureException`. Ajoute `export { ErrorBoundary }` dans `_layout.tsx` et `+not-found.tsx` pour les 404 article.

### 9. Ajouter Sentry (crash + perf) dès maintenant
- [ ] À faire
- **Priorité :** 🔴 Haute
- **Fichier(s) :** `app.json`, `src/app/_layout.tsx`, `eas.json`
- **Pourquoi :** App news = RSS externe instable, parsing XML fragile. Sans crash reporting tu ne verras jamais les `Missing RSS channel` en prod.
- **Action :**
  ```bash
  npx expo install @sentry/react-native
  npx @sentry/wizard@latest -i reactNative
  ```
  Active `tracesSampleRate: 0.2`, source maps EAS (`sentry-expo-upload-sourcemaps`).

### 10. Passer en mode offline-first crédible (stale-while-revalidate + indicateur)
- [ ] À faire
- **Priorité :** 🟡 Moyenne
- **Fichier(s) :** `src/lib/news.ts:209`, `src/app/index.tsx:29`
- **Pourquoi :** Tu as déjà `stale: true` mais pas de `netinfo`, pas de retry auto, pas de pull-to-refresh fiable (`refreshing={loading && !!feed}` est faux pendant premier chargement).
- **Action :** `npx expo install @react-native-community/netinfo`. Si offline -> retourne cache + badge "hors-ligne". `refreshing` avec vrai state `isRefreshing`. Bouton retry avec backoff exponentiel.

### 11. Optimiser les images : `expo-image` + blurhash + tailles
- [ ] À faire
- **Priorité :** 🟡 Moyenne
- **Fichier(s) :** `src/components/news-ui.tsx:64-68`
- **Pourquoi :** `Photo` utilise bien `expo-image` mais sans `placeholder`, sans `priority` pour hero, sans `recyclingKey`. Les images RSS `hihi2` sont lourdes.
- **Action :** Ajoute `placeholder={blurhash}`, `priority={hero ? 'high' : 'low'}`, `recyclingKey={article.id}`, `allowDownscaling`. Prévois fallback `Ball` déjà OK. Mesure avec `expo-image` perf.

### 12. Accessibilité RTL arabe : direction, fontScale, TalkBack
- [ ] À faire
- **Priorité :** 🟡 Moyenne
- **Fichier(s) :** `src/components/news-ui.tsx:43`, `src/app/index.tsx:41`, `app.json:15-18`
- **Pourquoi :** Tu forces `direction: 'ltr'` sur `Frame` pour contrer un bug web, mais ça casse le RTL natif. `writingDirection: 'rtl'` seulement sur input. Pas de `maxFontSizeMultiplier`.
- **Action :** Utilise `I18nManager.forceRTL(true)` + `allowRTL(true)` au démarrage. Ajoute `accessible`, `accessibilityHint`, `maxFontSizeMultiplier={1.3}` sur titres. Teste avec TalkBack + VoiceOver. `fontSizeDelta` existe déjà, relie-le à `allowFontScaling`.

### 13. Internationalisation propre + date/number en `ar-EG`
- [ ] À faire
- **Priorité :** 🟢 Bonus
- **Fichier(s) :** `src/lib/categories.ts`, `src/components/news-ui.tsx:77`, `src/app/index.tsx:29`
- **Pourquoi :** Textes en dur en arabe partout, `toLocaleString('ar')` et `Intl.DateTimeFormat('ar')` recréés à chaque render.
- **Action :** Centralise `formatDateAr(date)`, `formatCount(n)` dans `src/lib/format.ts` avec memo du formatter. Prépare `i18n` (ex: `ar` par défaut, `fr` plus tard) même si tu restes 100% arabe pour l'instant.

### 14. Tests : couvrir store, cache expiry, parseFeed edge cases
- [ ] À faire
- **Priorité :** 🟡 Moyenne
- **Fichier(s) :** `src/lib/news.test.ts`, `src/lib/categories.test.ts`, nouveau `src/lib/store.test.ts`
- **Pourquoi :** Tu as déjà `vitest` + 2 fichiers de test, c'est bien. Mais `store.toggleSaved`, `pruneExpiredArticles`, `isArticle`, `getArticleId` ne sont pas couverts. C'est là que les bugs prod arrivent.
- **Action :** Ajoute tests : 1) `parseFeed` avec XML invalide / item sans link / doublons, 2) `pruneExpiredArticles(7)` supprime vieux feeds, 3) `toggleSaved` LRU 100, 4) `safeStorage` fallback memory. Vise 80% sur `lib/`. Lance `pnpm test:run --coverage`.

### 15. Typage strict + lint sans `any` + `tsc --noEmit` en CI
- [ ] À faire
- **Priorité :** 🟡 Moyenne
- **Fichier(s) :** `tsconfig.json`, `eslint.config.cjs`, `.github/workflows/ci.yml` (à créer)
- **Pourquoi :** `safeStorage` utilise `(globalThis as any).nativeEventEmitter`, `data.rss.channel.item` non typé. Pas de CI visible.
- **Action :** Active `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. Remplace `any` par `unknown` + guards. Crée CI : `pnpm lint && pnpm typecheck && pnpm test:run`. Bloque le merge si rouge.

### 16. EAS : OTA Updates + versioning auto + channels
- [ ] À faire
- **Priorité :** 🔴 Haute
- **Fichier(s) :** `eas.json`, `app.json`, `src/app/_layout.tsx`
- **Pourquoi :** `eas.json` a `development/preview/production` mais pas de `updates.channel`, pas de `runtimeVersion`. Impossible de faire `eas update` sans casser les clients.
- **Action :**
  ```json
  { "updates": { "url": "https://u.expo.dev/xxx", "channel": "production" }, "runtimeVersion": { "policy": "appVersion" } }
  ```
  Puis `eas update --channel preview`. Ajoute `expo-updates` + écran "Nouvelle version disponible". `autoIncrement: true` déjà OK, garde-le.

### 17. SEO / Partage / Deep linking : `article/[id]` partageable
- [ ] À faire
- **Priorité :** 🟡 Moyenne
- **Fichier(s) :** `src/app/article/[id].tsx`, `app.json:scheme`, `src/lib/article-link.ts`
- **Pourquoi :** `scheme: akhbarkora` défini mais pas de `intentFilters` Android, pas de `associatedDomains` iOS, pas de `expo-sharing` / `expo-linking`. Une app news vit du partage WhatsApp.
- **Action :** Ajoute `expo-linking` config universal links `https://akhbarkora.app/a/:id`. Bouton Partager natif (`Share.share({message: title + url})`). `generateStaticParams` / metadata pour web (`output: single` actuellement, passe en `static` si tu veux du vrai SEO web).

### 18. Notifications push + favoris intelligents (phase coachable)
- [ ] À faire
- **Priorité :** 🟢 Bonus
- **Fichier(s) :** nouveau `src/lib/notifications.ts`, `src/app/settings.tsx`
- **Pourquoi :** Pour une app sport, la rétention vient des alertes match / transferts. Tu as déjà `categories` + `saved`, c'est la base parfaite.
- **Action :** `npx expo install expo-notifications expo-device`. Permets "M'alerter : transferts / matchs Europe". Utilise `expo-notifications` + EAS Push ou OneSignal. Commence simple : notification locale quotidienne "Top 5 du jour". Demande permission seulement après 2e visite.

### 19. README, screenshots, store listing et privacy
- [ ] À faire
- **Priorité :** 🟡 Moyenne
- **Fichier(s) :** `README.md`, `app.json`, `assets/`, `eas.json:submit`
- **Pourquoi :** `README.md` est encore le template `create-expo-app`. Pas de description FR/AR, pas de `privacy policy` (obligatoire Play Store car RSS externe + AsyncStorage). Icône/splash génériques.
- **Action :** Réécris README : features, `pnpm install && npx expo start`, screenshots, `eas build`, archi `src/`. Ajoute `privacy-policy.md` + lien dans `app.json`. Prépare 2 screenshots 1080x1920 + feature graphic avant `eas submit`.

### 20. Observabilité produit : analytics + feedback + perf budget
- [ ] À faire
- **Priorité :** 🟢 Bonus
- **Fichier(s) :** nouveau `src/lib/analytics.ts`, `src/app/settings.tsx`, `src/components/news-ui.tsx:EmptyState`
- **Pourquoi :** Tu ne sais pas quelles catégories sont lues, quel taux d'erreur RSS, quel temps de chargement réel.
- **Action :** Ajoute PostHog ou Mixpanel (gratuit) : events `feed_view`, `article_open`, `article_save`, `search`, `feed_error`. Ajoute bouton "Signaler un problème" dans `EmptyState`. Fixe un budget : TTI < 2s sur Pixel 4, JS bundle < 1.5MB (`npx expo export --dump-sourcemap`), images < 200KB.

### 21. react-call : Toast system + Confirm centralisés (FAIT ✅)
- [x] Fait le 09/10/2026 — https://react-call.desko.dev/
- **Priorité :** 🔴 Haute
- **Fichier(s) :** `src/lib/toast.tsx`, `src/app/_layout.tsx`, `src/lib/local-notifications.ts`, `src/lib/news-watcher.ts`, `src/hooks/use-news-watcher.ts`
- **Pourquoi :** `react-call` (`createCallable`) transforme un composant en promesse awaitable : parfait pour toasts et confirmations sans prop-drilling. 1KB, zéro dép, compatible React Native.
- **Implémenté :** `AppToast` monté dans `_layout`, `showToast()` + `showNewNewsToast()` en `upsert()` singleton, toast + notif système (channel `news`), vérificateur `checkForNewNews()` + poll 3 min, réglages dans `settings.tsx`, plugin `expo-notifications` dans `app.json`.
- **Usage :** `import { showToast } from '../lib/toast'; await showToast({ title: 'تم الحفظ' });`

## Ordre d'exécution recommandé (si peu de temps)

1. **Semaine 1 (stabilité) :** 7, 8, 9, 6, 4
2. **Semaine 2 (perf) :** 1, 2, 3, 11, 10
3. **Semaine 3 (ship) :** 16, 15, 14, 19, 17
4. **Plus tard (croissance) :** 5, 12, 13, 18, 20

## Commandes utiles rappel (projet en `pnpm`)
```bash
pnpm install
npx expo start
npx expo lint
npx tsc --noEmit
pnpm test:run
npx expo-doctor
npx expo install --fix
bunx eas-cli build -p android --profile preview
```
