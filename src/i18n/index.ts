/**
 * Trimmed i18n bootstrap for the public demo slice.
 *
 * The production app eagerly registers 174 namespaces × 4 languages; the demo
 * carries only the namespaces the extracted chart actually consumes, in
 * English (default, for the challenge judges) and Spanish (the product's home
 * locale). Clinical DATA stays in Spanish on purpose — it is part of the
 * realistic-noise design — while the UI chrome follows the selected language.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import esAnalyteGraphProvider from './locales/es/analyteGraphProvider.json';
import esCommon from './locales/es/common.json';
import esCreatedByDisplay from './locales/es/createdByDisplay.json';
import esHealthSummarySection from './locales/es/healthSummarySection.json';
import esLabExpertCard from './locales/es/labExpertCard.json';
import esLaboratorySection from './locales/es/laboratorySection.json';
import esNotesSection from './locales/es/notesSection.json';
import esPatientDetailPage from './locales/es/patientDetailPage.json';
import esPdfViewer from './locales/es/pdfViewer.json';
import esResultsSection from './locales/es/resultsSection.json';
import esVitalSignsSection from './locales/es/vitalSignsSection.json';

import enAnalyteGraphProvider from './locales/en/analyteGraphProvider.json';
import enCommon from './locales/en/common.json';
import enCreatedByDisplay from './locales/en/createdByDisplay.json';
import enHealthSummarySection from './locales/en/healthSummarySection.json';
import enLabExpertCard from './locales/en/labExpertCard.json';
import enLaboratorySection from './locales/en/laboratorySection.json';
import enNotesSection from './locales/en/notesSection.json';
import enPatientDetailPage from './locales/en/patientDetailPage.json';
import enPdfViewer from './locales/en/pdfViewer.json';
import enResultsSection from './locales/en/resultsSection.json';
import enVitalSignsSection from './locales/en/vitalSignsSection.json';

const STORAGE_KEY = 'hr-demo:lang';

function storedLanguage(): string | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'es' || v === 'en' ? v : null;
  } catch {
    return null;
  }
}

export function persistLanguage(lang: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* private mode — ignore */
  }
}

i18n.use(initReactI18next).init({
  resources: {
    es: {
      analyteGraphProvider: esAnalyteGraphProvider,
      common: esCommon,
      createdByDisplay: esCreatedByDisplay,
      healthSummarySection: esHealthSummarySection,
      labExpertCard: esLabExpertCard,
      laboratorySection: esLaboratorySection,
      notesSection: esNotesSection,
      patientDetailPage: esPatientDetailPage,
      pdfViewer: esPdfViewer,
      resultsSection: esResultsSection,
      vitalSignsSection: esVitalSignsSection,
    },
    en: {
      analyteGraphProvider: enAnalyteGraphProvider,
      common: enCommon,
      createdByDisplay: enCreatedByDisplay,
      healthSummarySection: enHealthSummarySection,
      labExpertCard: enLabExpertCard,
      laboratorySection: enLaboratorySection,
      notesSection: enNotesSection,
      patientDetailPage: enPatientDetailPage,
      pdfViewer: enPdfViewer,
      resultsSection: enResultsSection,
      vitalSignsSection: enVitalSignsSection,
    },
  },
  lng: storedLanguage() ?? 'en',
  fallbackLng: 'en',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  returnEmptyString: false,
});

export default i18n;
