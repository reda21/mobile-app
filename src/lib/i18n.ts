export type Locale = 'ar' | 'fr';

export const DEFAULT_LOCALE: Locale = 'ar';

const messages = {
  ar: {
    appTagline: 'العالم يتكلم كرة',
    football: 'كرة القدم',
    sourceName: 'هاي كورة',
  },
  fr: {
    appTagline: "Le monde parle football",
    football: 'Football',
    sourceName: 'Hihi2',
  },
} as const;

export type MessageKey = keyof typeof messages.ar;

/** Point d'entrée minimal pour ajouter le français sans disperser les libellés. */
export function t(key: MessageKey, locale: Locale = DEFAULT_LOCALE): string {
  return messages[locale][key] ?? messages[DEFAULT_LOCALE][key];
}
