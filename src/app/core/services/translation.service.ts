import { Injectable, computed, inject, signal } from '@angular/core';
import { TRANSLATIONS_DE } from '../i18n/translations.de';
import { TRANSLATIONS_EN } from '../i18n/translations.en';
import { TRANSLATIONS_NL } from '../i18n/translations.nl';
import { MatomoService } from './matomo.service';

export type SupportedLanguage = 'de' | 'en' | 'nl';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private readonly STORAGE_KEY = 'wc_info_lang';
  private readonly matomoService = inject(MatomoService);
  
  // Dynamic signal for active language
  readonly currentLang = signal<SupportedLanguage>(this.detectInitialLanguage());

  // Dictionaries
  private readonly dictionaries: Record<SupportedLanguage, Record<string, string>> = {
    de: TRANSLATIONS_DE,
    en: TRANSLATIONS_EN,
    nl: TRANSLATIONS_NL
  };

  constructor() {
    const lang = this.currentLang();
    this.updateHtmlLang(lang);
    this.matomoService.trackLanguageSwitched(lang);
  }

  private updateHtmlLang(lang: string): void {
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = lang;
    }
  }

  private detectInitialLanguage(): SupportedLanguage {
    // 1. Check URL path prefix first (e.g. /nl/..., /en/..., /de/...)
    if (typeof window !== 'undefined' && window.location.pathname) {
      const firstSegment = window.location.pathname.split('/')[1]?.toLowerCase();
      if (firstSegment === 'de' || firstSegment === 'en' || firstSegment === 'nl') {
        try {
          localStorage.setItem(this.STORAGE_KEY, firstSegment);
        } catch {
          // Ignore localStorage errors
        }
        return firstSegment;
      }
    }

    // 2. Check saved preference in localStorage
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved === 'de' || saved === 'en' || saved === 'nl') {
        return saved;
      }
    } catch {
      // localStorage may fail in private mode
    }

    // 3. Check browser languages: if German -> de, Dutch -> nl, else -> en
    const browserLanguages = typeof navigator !== 'undefined'
      ? (navigator.languages || [navigator.language || ''])
      : [''];

    for (const lang of browserLanguages) {
      const normalized = (lang || '').toLowerCase().trim();
      if (normalized.startsWith('de')) {
        return 'de';
      }
      if (normalized.startsWith('nl')) {
        return 'nl';
      }
    }

    // 4. Default fallback
    return 'en';
  }

  setLanguage(lang: SupportedLanguage): void {
    this.currentLang.set(lang);
    this.updateHtmlLang(lang);
    try {
      localStorage.setItem(this.STORAGE_KEY, lang);
    } catch {
      // Ignore localStorage errors
    }
    this.matomoService.trackLanguageSwitched(lang);
  }

  toggleLanguage(): void {
    const current = this.currentLang();
    const next: SupportedLanguage = current === 'de' ? 'en' : current === 'en' ? 'nl' : 'de';
    this.setLanguage(next);
  }

  t(key: string, params?: Record<string, string | number>): string {
    const lang = this.currentLang();
    const dictionary = this.dictionaries[lang] || this.dictionaries.de;
    let text = dictionary[key] || this.dictionaries.en[key] || key;

    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        text = text.replaceAll(`{${paramKey}}`, String(paramValue));
      }
    }

    return text;
  }
}
