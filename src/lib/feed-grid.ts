/** Une ligne de grille : `key` stable pour FlashList et les éléments à afficher côte à côte. */
export interface GridRow<T> {
  key: string;
  items: T[];
}

/**
 * Regroupe une liste plate en lignes de `columns` éléments.
 * Avec `columns <= 1`, chaque élément devient sa propre ligne (liste simple).
 * Sert à afficher le fil d'actualités en 1 ou 2 colonnes selon la largeur d'écran.
 */
export function groupIntoRows<T>(items: readonly T[], columns: number, keyOf: (item: T) => string): GridRow<T>[] {
  const width = Math.max(1, Math.floor(columns));
  if (width === 1) return items.map(item => ({ key: keyOf(item), items: [item] }));
  const rows: GridRow<T>[] = [];
  for (let i = 0; i < items.length; i += width) {
    rows.push({ key: keyOf(items[i]!), items: items.slice(i, i + width) });
  }
  return rows;
}
