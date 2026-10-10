import { useWindowDimensions } from 'react-native';

/**
 * Seuils de largeur (en dp/points CSS) séparant les formats d'écran.
 * - `medium`   : tablette en portrait, grand téléphone en paysage, petite fenêtre web.
 * - `expanded` : tablette en paysage, pliable ouvert, ordinateur de bureau.
 */
export const breakpoints = {
  medium: 700,
  expanded: 1080,
} as const;

export interface Responsive {
  /** Largeur courante de la fenêtre. */
  width: number;
  /** Hauteur courante de la fenêtre. */
  height: number;
  /** Téléphone en portrait (comportement d'origine). */
  isCompact: boolean;
  /** Tablette en portrait / grande fenêtre intermédiaire. */
  isMedium: boolean;
  /** Tablette en paysage / bureau : navigation latérale permanente. */
  isExpanded: boolean;
  isLandscape: boolean;
  /** Nombre de cartes par ligne dans le fil d'actualités. */
  feedColumns: number;
  /** Nombre de tuiles par ligne dans les grilles (catégories…). */
  tileColumns: number;
  /** Largeur maximale confortable de la colonne de contenu. */
  contentMaxWidth: number;
  /** Largeur maximale d'un bloc de lecture (article, réglages…). */
  readingMaxWidth: number;
  /** Affiche la navigation latérale à la place de la barre d'onglets. */
  showSideNav: boolean;
  /** Ratio largeur/hauteur de l'image « hero », adapté à la largeur disponible. */
  heroAspectRatio: number;
}

/**
 * Adapte la mise en page à la taille de l'écran (téléphone, tablette, pliable, web/desktop).
 * Se recalcule automatiquement à la rotation de l'appareil ou au redimensionnement de la fenêtre.
 */
export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();
  const isExpanded = width >= breakpoints.expanded;
  const isMedium = !isExpanded && width >= breakpoints.medium;
  const isCompact = !isExpanded && !isMedium;

  return {
    width,
    height,
    isCompact,
    isMedium,
    isExpanded,
    isLandscape: width > height,
    feedColumns: isCompact ? 1 : 2,
    tileColumns: isCompact ? 2 : isMedium ? 3 : 4,
    contentMaxWidth: isCompact ? 640 : isMedium ? 800 : 960,
    readingMaxWidth: 720,
    showSideNav: isExpanded,
    heroAspectRatio: isCompact ? 1.55 : isMedium ? 1.85 : 2.1,
  };
}
