/**
 * Locale de fechas ligado al idioma de la app (i18n).
 *
 * Reemplaza los literales `'es-MX'` que estaban clavados en todo el frontend:
 * `new Date().toLocaleDateString(dateLocale(), …)` ahora respeta el idioma
 * elegido en el navbar. También mantiene el locale global de dayjs en sync.
 */
import i18n from '../i18n';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import 'dayjs/locale/en';
import 'dayjs/locale/pt-br';
import 'dayjs/locale/fr';

/** Idioma i18n (es|en|pt|fr) → etiqueta BCP-47 para `toLocale*` e `Intl`. */
const BCP47: Record<string, string> = {
  es: 'es-MX',
  en: 'en-US',
  pt: 'pt-BR',
  fr: 'fr-FR',
};

/** dayjs usa 'pt-br' en minúsculas para el locale brasileño. */
const DAYJS: Record<string, string> = {
  es: 'es',
  en: 'en',
  pt: 'pt-br',
  fr: 'fr',
};

function baseLang(lang?: string): string {
  return (lang || 'es').split('-')[0];
}

/** Etiqueta de locale (p. ej. 'es-MX' | 'en-US') para el idioma activo. */
export function dateLocale(): string {
  return BCP47[baseLang(i18n.language)] ?? 'es-MX';
}

/** Sincroniza el locale global de dayjs con el idioma activo. */
export function syncDayjsLocale(lang?: string): void {
  dayjs.locale(DAYJS[baseLang(lang ?? i18n.language)] ?? 'es');
}

// Arranca en el idioma inicial y sigue los cambios del selector.
syncDayjsLocale();
i18n.on('languageChanged', (lng) => syncDayjsLocale(lng));
