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
- [x] Fait le 09/10/2026
- **Priorité :** 🔴 Haute
- **Fichier(s) :** `src/app/_layout.tsx`, nouveau `src/components/error-boundary.tsx`, nouveau `src/app/+not-found.tsx`
- **Pourquoi :** Si `parseFeed` throw (`Invalid RSS`), ou `fonts` fail, l'app écran blanc. Aucun `expo-router/error-boundary` actuellement.
- **Fait :**
  - Composant `ErrorBoundary` personnalisé conforme à l'API Expo Router (`ErrorBoundaryProps`) avec intégration Sentry, design RTL élégant en arabe, bouton de réessai (`props.retry()`) et redirection vers l'accueil.
  - Exporté depuis `src/app/_layout.tsx` (`export { ErrorBoundary }`).
  - Écran `+not-found.tsx` ajouté pour intercepter et guider les erreurs 404 (article introuvable ou mauvais lien profond).

### 9. Ajouter Sentry (crash + perf) dès maintenant
- [x] Fait le 09/10/2026
- **Priorité :** 🔴 Haute
- **Fichier(s) :** `src/lib/sentry.ts`, `src/app/_layout.tsx`, `package.json`
- **Pourquoi :** App news = RSS externe instable, parsing XML fragile. Sans crash reporting tu ne verras jamais les `Missing RSS channel` en prod.
- **Fait :**
  - `@sentry/react-native` installé et configuré de manière sécurisée via `src/lib/sentry.ts`.
  - `initSentry()` activé au démarrage avec `tracesSampleRate: 0.2`, support des DSN via `Constants.expoConfig?.extra?.sentryDsn` et `EXPO_PUBLIC_SENTRY_DSN`.
  - `Sentry.wrap(RootLayout)` appliqué dans `src/app/_layout.tsx`.
  - Fonction `captureException` sécurisée pour rapporter les crashs et erreurs critiques sans impacter l'exécution ni les tests unitaires.

### 10. Passer en mode offline-first crédible (stale-while-revalidate + indicateur)
- [x] Fait le 09/10/2026
- **Priorité :** 🟡 Moyenne
- **Fichier(s) :** `src/lib/network.ts`, `src/lib/news.ts`, `src/app/index.tsx`, `src/app/_layout.tsx`
- **Pourquoi :** Tu as déjà `stale: true` mais pas de `netinfo`, pas de retry auto, pas de pull-to-refresh fiable (`refreshing={loading && !!feed}` est faux pendant premier chargement).
- **Fait :**
  - `@react-native-community/netinfo` installé et enveloppé dans `src/lib/network.ts` (`isOnline`, `useNetworkStatus`) avec compatibilité web et natif.
  - Injection `setOnlineChecker` dans `src/lib/news.ts` permettant un bypass immédiat sans attendre le timeout de 15s si l'appareil est hors ligne.
  - Bannière d'état hors ligne discrète et élégante en arabe dans l'en-tête de la liste d'articles.
  - `RefreshControl` corrigé avec séparation du state `isRefreshing` et de l'indicateur de chargement initial.
  - Tests unitaires validant le comportement hors ligne instantané sans appel réseau inutile.

### 11. Optimiser les images : `expo-image` + blurhash + tailles
- [x] Fait le 09/10/2026
- **Priorité :** 🟡 Moyenne
- **Fichier(s) :** `src/components/news-ui.tsx:64-68`
- **Pourquoi :** `Photo` utilise bien `expo-image` mais sans `placeholder`, sans `priority` pour hero, sans `recyclingKey`. Les images RSS `hihi2` sont lourdes.
- **Fait :** `Photo` utilise un BlurHash commun pendant le chargement, `priority="high"` pour le hero, `priority="low"` pour les lignes, `recyclingKey={article.id}` pour FlashList et `allowDownscaling`. Le fallback `Ball` est conservé et l'image est annoncée avec son titre aux lecteurs d'écran.

### 12. Accessibilité RTL arabe : direction, fontScale, TalkBack
- [x] Fait le 09/10/2026
- **Priorité :** 🟡 Moyenne
- **Fichier(s) :** `src/components/news-ui.tsx:43`, `src/app/index.tsx:41`, `app.json:15-18`
- **Pourquoi :** Tu forces `direction: 'ltr'` sur `Frame` pour contrer un bug web, mais ça casse le RTL natif. `writingDirection: 'rtl'` seulement sur input. Pas de `maxFontSizeMultiplier`.
- **Fait :** `I18nManager.allowRTL(true)` + `forceRTL(true)` sont exécutés au démarrage, le contournement `direction: 'ltr'` a été supprimé et le web déclare `lang="ar"`/`dir="rtl"`. `ArabicText` autorise le scaling système avec `maxFontSizeMultiplier={1.3}` ; les titres et actions principales ont des rôles, labels et hints accessibles. Le `fontSizeDelta` manuel reste cumulable avec `allowFontScaling`.

### 13. Internationalisation propre + date/number en `ar-EG`
- [x] Fait le 09/10/2026
- **Priorité :** 🟢 Bonus
- **Fichier(s) :** nouveau `src/lib/format.ts`, nouveau `src/lib/i18n.ts`, `src/components/news-ui.tsx`, `src/app/index.tsx`, `src/app/article/[id].tsx`
- **Pourquoi :** Textes en dur en arabe partout, `toLocaleString('ar')` et `Intl.DateTimeFormat('ar')` recréés à chaque render.
- **Fait :** Nouveau `src/lib/format.ts` avec `Intl.DateTimeFormat`/`Intl.NumberFormat` `ar-EG` instanciés une seule fois ; les dates des cartes, de l'article et les compteurs passent par ces helpers. Nouveau `src/lib/i18n.ts` avec locale `ar` par défaut et messages `fr` prêts pour une extension ultérieure.

### 14. Tests : couvrir store, cache expiry, parseFeed edge cases
- [x] Fait le 09/10/2026
- **Priorité :** 🟡 Moyenne
- **Fichier(s) :** `src/lib/news.test.ts`, `src/lib/categories.test.ts`, `src/lib/format.test.ts`, `src/lib/store.test.ts`
- **Pourquoi :** Tu as déjà `vitest` + 2 fichiers de test, c'est bien. Mais `store.toggleSaved`, `pruneExpiredArticles`, `isArticle`, `getArticleId` ne sont pas couverts. C'est là que les bugs prod arrivent.
- **Fait :** Tests ajoutés pour XML invalide, item sans lien, doublons, expiration réelle de `pruneExpiredArticles(7)`, `toggleSaved`/LRU (plafond actuel `MAX_SAVED = 50`), `isArticle`, `getArticleId` et le fallback mémoire de `safeStorage`. Les suites `lib/` passent en mono-worker sous Windows ; la couverture chiffrée reste à lancer avec le provider Vitest dédié.

### 15. Typage strict + lint sans `any` + `tsc --noEmit` en CI
- [x] Fait le 09/10/2026
- **Priorité :** 🟡 Moyenne
- **Fichier(s) :** `tsconfig.json`, `src/lib/runtime.ts`, `src/lib/news.ts`, `.github/workflows/ci.yml` (créé)
- **Pourquoi :** `safeStorage` utilise `(globalThis as any).nativeEventEmitter`, `data.rss.channel.item` non typé. Pas de CI visible.
- **Fait :**
  - `strict` déjà actif ; ajouté `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` (0 erreur hors 4 sites `undefined` explicite corrigés : `EmptyState` accepte `... | undefined`, `sound: undefined` retirés).
  - Zéro `any` restant : test d'environnement centralisé dans `isNativeRuntime()` (`runtime.ts`, testé), `parseFeed` typé (`RssItem`/`RssChannel`), mocks de tests typés (`CategoryId`, `string | URL | Request`).
  - Pas de plugin `@typescript-eslint` ajouté (indisponible sans nouvelle dép, et `eslint-config-expo` ne l'expose pas) : le garde-fou est `tsc` strict + CI.
  - CI créée : `pnpm lint && pnpm typecheck && pnpm test:run` sur push/PR (Node 22, pnpm 12, `--frozen-lockfile`).

### 16. EAS : OTA Updates + versioning auto + channels
- [x] Fait le 09/10/2026 (config + UI ; publication restante côté EAS)
- **Priorité :** 🔴 Haute
- **Fichier(s) :** `eas.json`, `app.json`, nouveau `src/hooks/use-app-updates.ts`, `src/app/settings.tsx`
- **Pourquoi :** `eas.json` a `development/preview/production` mais pas de `updates.channel`, pas de `runtimeVersion`. Impossible de faire `eas update` sans casser les clients.
- **Fait :**
  ```bash
  npx expo install expo-updates  # ~57.0.25, doctor 21/21 OK
  ```
  - `app.json` : `runtimeVersion: { policy: appVersion }` + `updates: { url, checkAutomatically: ON_LOAD }`. ⚠️ `url` pointe `YOUR_EAS_PROJECT_ID` : lance `eas init` puis remplace par ton ID avant `eas update`.
  - `eas.json` : `channel` par profil (`development`/`preview`/`production`, `release-apk` → `preview`). `autoIncrement: true` conservé.
  - Nouveau hook `useAppUpdates()` (`checkForUpdateAsync` → `fetchUpdateAsync` → toast react-call « إعادة التشغيل » → `reloadAsync`, garde `Updates.isEnabled`) + section « تحديثات التطبيق » dans Réglages (version, channel, statut).
- **Reste à faire côté compte EAS :** `eas init` → remplacer l'URL → build prod → `eas update --channel production`.

### 17. SEO / Partage / Deep linking : `article/[id]` partageable
- [x] Fait le 09/10/2026 (partage + titres web ; universal links volontairement exclus)
- **Priorité :** 🟡 Moyenne
- **Fichier(s) :** `src/app/article/[id].tsx`, `src/app/_layout.tsx`, `app.json:scheme`
- **Pourquoi :** `scheme: akhbarkora` défini mais pas de `intentFilters` Android, pas de `associatedDomains` iOS, pas de `expo-sharing` / `expo-linking`. Une app news vit du partage WhatsApp.
- **Fait :**
  - Partage natif (`Share.share`, déjà en place) enrichi avec le deep link `akhbarkora://article/<id>` : un destinataire avec l'app ouvre l'article directement (le tap notif → `router.push` existait déjà).
  - Titres `Stack.Screen` par onglet dans `_layout` → `<title>` correct sur web.
  - Non fait exprès : `intentFilters` explicites (Expo CNG génère déjà le filtre du `scheme`), `associatedDomains`/`expo-linking` https (exige un domaine possédé + fichiers `assetlinks`/`AASA` — à ajouter quand `akhbarkora.app` t'appartient), `output: static` (risque d'exclure la route dynamique `[id]` sans `generateStaticParams` — à tester à part).

### 18. Notifications push + favoris intelligents (phase coachable)
- [x] Phase locale faite le 09/10/2026 — push distants à connecter avec un backend
- **Priorité :** 🟢 Bonus
- **Fichier(s) :** `src/lib/local-notifications.ts`, `src/lib/store.ts`, `src/lib/preferences.tsx`, `src/hooks/use-news-watcher.ts`, `src/app/settings.tsx`, `src/app/_layout.tsx`
- **Pourquoi :** Pour une app sport, la rétention vient des alertes match / transferts. Tu as déjà `categories` + `saved`, c'est la base parfaite.
- **Fait :** Réutilisation d'`expo-notifications` déjà installé. Catégories/clubs d'alerte persistés, vérifiés pendant l'utilisation de l'accueil ; notifications nouvelles désactivées par défaut. Rappel local fixe à 19 h (heure du téléphone), identifiant stable et annulation individuelle, pas de doublons ni de suppression des autres notifications. Permission à partir du deuxième lancement (compté une seule fois malgré Strict Mode), uniquement via Réglages. Gestion du tap lors d'un démarrage à froid.
- **Limites :** Rappel invitant à ouvrir l'app, sans téléchargement des cinq titres en arrière-plan. Push distants/alertes match nécessitent backend et credentials EAS. Permission et livraison à valider sur appareil natif.

### 19. README, screenshots, store listing et privacy
- [x] Préparation locale faite le 09/10/2026 — finalisation store ci-dessous
- **Priorité :** 🟡 Moyenne
- **Fichier(s) :** `README.md`, `privacy-policy.md`, `store-listing.md`, `src/app/privacy.tsx`, `app.json`, `assets/store/`, `scripts/capture-store.cjs`
- **Pourquoi :** `README.md` est encore le template `create-expo-app`. Pas de description FR/AR, pas de `privacy policy` (obligatoire Play Store car RSS externe + AsyncStorage). Icône/splash génériques.
- **Fait :** README FR/AR avec commandes pnpm/EAS, architecture, limites offline et configuration analytics. Fiche store FR/AR, politique technique FR et écran arabe accessible dans Réglages ; route interne `/privacy` référencée dans `app.json`. Deux captures réelles du rendu web mobile 1080×1920 et bandeau 1024×500 générés et vérifiés visuellement.
- **Avant publication :** Compléter responsable/contact/rétention, héberger la politique publique, renseigner les consoles, valider/remplacer les captures sur build Android réel, vérifier droits RSS/photos/marques et icône/splash actuels. URL OTA `YOUR_EAS_PROJECT_ID` encore à remplacer. Aucun compte store ni publication modifié.

### 20. Observabilité produit : analytics + feedback + perf budget
- [x] Instrumentation faite le 09/10/2026 — budget JS encore dépassé
- **Priorité :** 🟢 Bonus
- **Fichier(s) :** `src/lib/analytics.ts`, `src/lib/analytics.test.ts`, `src/lib/feedback.ts`, `src/lib/store.ts`, `src/app/index.tsx`, `src/app/article/[id].tsx`, `src/app/settings.tsx`, `src/components/news-ui.tsx`, `scripts/check-perf.cjs`
- **Pourquoi :** Tu ne sais pas quelles catégories sont lues, quel taux d'erreur RSS, quel temps de chargement réel.
- **Fait :** Capture PostHog via API HTTP, sans dépendance ajoutée. Consentement persisté désactivé par défaut + token public obligatoire ; événements `feed_view`, `article_open`, `article_save`, `search`, `feed_error`, durée de chargement, aucun texte recherché/contenu d'article. Identifiant temporaire, pas de replay/profils ni file offline ; révocation annule les requêtes. Signalement dans Réglages et états d'erreur via partage système (ou copie du formulaire sur web), sans envoi automatique.
- **Vérification :** 54 tests passent, lint/typecheck passent. Export web réussi : **2 765 973 octets** de JS non compressé contre budget **1 500 000** ; `scripts/check-perf.cjs` échoue correctement au dépassement. TTI < 2 s sur Pixel 4 et images < 200 Ko restent des objectifs à mesurer sur appareil/requêtes réelles. Service PostHog à activer avec ses variables publiques.

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
