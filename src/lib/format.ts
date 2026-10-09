const shortDateFormatter = new Intl.DateTimeFormat('ar-EG', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

const longDateFormatter = new Intl.DateTimeFormat('ar-EG', {
  dateStyle: 'long',
  timeStyle: 'short',
});

const countFormatter = new Intl.NumberFormat('ar-EG');

export type DateFormatStyle = 'short' | 'long';

/** Formatters Arabic/Égypte partagés : ils ne sont créés qu'une seule fois. */
export function formatDateAr(value: string | Date | null | undefined, style: DateFormatStyle = 'short'): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return (style === 'long' ? longDateFormatter : shortDateFormatter).format(date);
}

export function formatCount(value: number): string {
  return countFormatter.format(Number.isFinite(value) ? value : 0);
}
