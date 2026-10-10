import AsyncStorage from '@react-native-async-storage/async-storage';
import { isNativeRuntime } from './runtime';

export const FOOTBALL_API_TOKEN = 'c5fc35a81ece4c65a8db125424d47aff';
export const FOOTBALL_API_BASE_URL = 'https://api.football-data.org/v4';

/**
 * Durées de validité (TTL) optimisées pour respecter le quota gratuit (10 requêtes / minute) :
 */
export const FOOTBALL_CACHE_TTLS = {
  /** Matchs du jour (actualisation modérée pour capter les scores sans saturer) : 3 minutes */
  TODAY_MATCHES: 3 * 60 * 1000,
  /** Matchs passés (terminés, les résultats ne changent plus) : 24 heures */
  PAST_MATCHES: 24 * 60 * 60 * 1000,
  /** Matchs futurs (> aujourd'hui, calendrier stable) : 4 heures */
  FUTURE_MATCHES: 4 * 60 * 60 * 1000,
  /** Classements (mis à jour uniquement à la fin des rencontres) : 20 minutes */
  STANDINGS: 20 * 60 * 1000,
  /** Statistiques et buteurs : 30 minutes */
  STATS_SCORERS: 30 * 60 * 1000,
  /** Journée de championnat passée : 24 heures */
  FINISHED_MATCHDAY: 24 * 60 * 60 * 1000,
  /** Journée de championnat en cours ou future : 20 minutes */
  ACTIVE_MATCHDAY: 20 * 60 * 1000,
} as const;

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface RequestOptions {
  forceReload?: boolean;
  ttl?: number;
  signal?: AbortSignal;
}

export interface CachedResponse<T> {
  data: T;
  stale: boolean;
  rateLimited?: boolean;
  fromCache?: boolean;
}

// L1 : Cache mémoire ultra-rapide (Map)
const memoryCache = new Map<string, CacheEntry<any>>();

// Dédoublonnage des requêtes simultanées en cours
const inFlightRequests = new Map<string, Promise<any>>();

// Suivi de la fenêtre glissante pour la limite de débit (10 appels / 60 secondes)
const RATE_LIMIT_MAX_CALLS = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
let callTimestamps: number[] = [];
let rateLimitLockedUntil = 0;

/**
 * Réinitialise l'état du limiteur et de la mémoire (utile pour les tests et le rafraîchissement global)
 */
export function resetFootballClientState(): void {
  memoryCache.clear();
  inFlightRequests.clear();
  callTimestamps = [];
  rateLimitLockedUntil = 0;
}

/**
 * Retourne le nombre d'appels restants dans la fenêtre de 60s
 */
export function getRateLimitStatus(): { remaining: number; resetInSeconds: number } {
  const now = Date.now();
  callTimestamps = callTimestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  const remaining = Math.max(0, RATE_LIMIT_MAX_CALLS - callTimestamps.length);
  const oldest = callTimestamps[0];
  const resetInSeconds = oldest ? Math.max(0, Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000)) : 0;
  return { remaining, resetInSeconds };
}

/**
 * Vérifie si une nouvelle requête réseau peut être déclenchée
 */
function canMakeNetworkCall(): boolean {
  const now = Date.now();
  if (now < rateLimitLockedUntil) return false;
  callTimestamps = callTimestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  return callTimestamps.length < RATE_LIMIT_MAX_CALLS;
}

function recordNetworkCall(): void {
  callTimestamps.push(Date.now());
}

function recordRateLimit429(): void {
  // Verrouille pendant 60 secondes
  rateLimitLockedUntil = Date.now() + RATE_LIMIT_WINDOW_MS;
}

// Clé de préfixe pour AsyncStorage
const STORAGE_PREFIX = '@football_data_v2_';

async function readFromStorage<T>(key: string): Promise<CacheEntry<T> | null> {
  try {
    if (!isNativeRuntime()) return null;
    const raw = await AsyncStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry<T>;
  } catch {
    return null;
  }
}

async function writeToStorage<T>(key: string, entry: CacheEntry<T>): Promise<void> {
  try {
    if (!isNativeRuntime()) return;
    await AsyncStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(entry));
  } catch {
    // Ignore silencieusement
  }
}

/**
 * Récupère les données en cache (L1 mémoire ou L2 AsyncStorage)
 */
export async function getCachedData<T>(key: string): Promise<CacheEntry<T> | null> {
  // Vérifier d'abord L1
  const mem = memoryCache.get(key);
  if (mem) return mem as CacheEntry<T>;

  // Vérifier L2
  const disk = await readFromStorage<T>(key);
  if (disk) {
    memoryCache.set(key, disk);
    return disk;
  }

  return null;
}

/**
 * Enregistre les données dans les deux niveaux de cache (L1 et L2)
 */
export async function setCachedData<T>(key: string, data: T, ttl: number): Promise<void> {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttl,
  };
  memoryCache.set(key, entry);
  void writeToStorage(key, entry);
}

/**
 * Fonction centrale pour exécuter une requête Football-Data avec :
 * 1. Cache L1 & L2 à deux niveaux (mémoire + stockage local)
 * 2. Respect strict du quota 10 appels/min (renvoie le cache si budget épuisé)
 * 3. Dédoublonnage des requêtes simultanées identiques
 * 4. Repli automatique sur le cache en cas d'erreur 429 ou hors-ligne
 */
export async function fetchFootballData<T>(
  endpointOrUrl: string,
  options: RequestOptions = {},
): Promise<CachedResponse<T>> {
  const { forceReload = false, ttl = FOOTBALL_CACHE_TTLS.TODAY_MATCHES, signal } = options;

  const url = endpointOrUrl.startsWith('http')
    ? endpointOrUrl
    : `${FOOTBALL_API_BASE_URL}${endpointOrUrl.startsWith('/') ? '' : '/'}${endpointOrUrl}`;

  const cacheKey = url;
  const now = Date.now();

  // 1. Consulter le cache existant
  const cached = await getCachedData<T>(cacheKey);
  const isFresh = cached && now - cached.timestamp < (cached.ttl || ttl);

  // Si le cache est encore valide et qu'on ne force pas le rechargement, retourner immédiatement
  if (!forceReload && isFresh && cached) {
    return {
      data: cached.data,
      stale: false,
      fromCache: true,
    };
  }

  // 2. Vérification du quota avant appel réseau
  const hasCallBudget = canMakeNetworkCall();

  if (!hasCallBudget) {
    // Le quota de 10 appels / min est atteint :
    // Si on a des données en cache (même périmées), on les sert avec le drapeau rateLimited !
    if (cached) {
      return {
        data: cached.data,
        stale: true,
        rateLimited: true,
        fromCache: true,
      };
    }
  }

  // 3. Dédoublonnage des requêtes en vol
  if (inFlightRequests.has(cacheKey)) {
    try {
      const data = await inFlightRequests.get(cacheKey)!;
      return {
        data,
        stale: false,
        fromCache: true,
      };
    } catch (err) {
      if (cached) {
        return { data: cached.data, stale: true };
      }
      throw err;
    }
  }

  // 4. Lancement de la requête réseau
  const fetchPromise = (async (): Promise<T> => {
    recordNetworkCall();

    const fetchInit: RequestInit = {
      method: 'GET',
      headers: {
        'X-Auth-Token': FOOTBALL_API_TOKEN,
        Accept: 'application/json',
      },
    };
    if (signal) {
      fetchInit.signal = signal;
    }

    const response = await fetch(url, fetchInit);

    if (response.status === 429) {
      recordRateLimit429();
      const rateLimitErr: any = new Error(
        'تم بلوغ حد الطلبات المجاني (10 طلبات/دقيقة). الرجاء الانتظار دقيقة والمحاولة مجددًا.',
      );
      rateLimitErr.status = 429;
      throw rateLimitErr;
    }

    if (!response.ok) {
      throw new Error(`خطأ في استجابة الخادم (${response.status})`);
    }

    const json = await response.json();
    await setCachedData<T>(cacheKey, json, ttl);
    return json;
  })();

  inFlightRequests.set(cacheKey, fetchPromise);

  try {
    const rawData = await fetchPromise;
    return {
      data: rawData,
      stale: false,
      fromCache: false,
    };
  } catch (error: any) {
    if (signal?.aborted) {
      throw error;
    }
    // Repli résilient sur le cache si disponible
    if (cached) {
      return {
        data: cached.data,
        stale: true,
        rateLimited: rateLimitLockedUntil > Date.now(),
        fromCache: true,
      };
    }
    throw error;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
}
