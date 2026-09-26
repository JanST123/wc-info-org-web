import { Injectable, computed, signal } from '@angular/core';
import { TRANSLATIONS_DE } from '../i18n/translations.de';
import { TRANSLATIONS_EN } from '../i18n/translations.en';

export type SupportedLanguage = 'de' | 'en';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private readonly STORAGE_KEY = 'wc_info_lang';
  
  // Dynamic signal for active language
  readonly currentLang = signal<SupportedLanguage>(this.detectInitialLanguage());

  // Dictionaries
  private readonly dictionaries: Record<SupportedLanguage, Record<string, string>> = {
    de: TRANSLATIONS_DE,
    en: TRANSLATIONS_EN
  };

  constructor() {
    this.updateHtmlLang(this.currentLang());
  }

  private updateHtmlLang(lang: string): void {
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = lang;
    }
  }

  private detectInitialLanguage(): SupportedLanguage {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved === 'de' || saved === 'en') {
        return saved;
      }
    } catch {
      // localStorage may fail in private mode
    }

    // Check browser languages: if German (de, de-DE, de-AT, de-CH) -> de, else -> en
    const browserLanguages = typeof navigator !== 'undefined'
      ? (navigator.languages || [navigator.language || ''])
      : [''];

    for (const lang of browserLanguages) {
      const normalized = (lang || '').toLowerCase().trim();
      if (normalized.startsWith('de')) {
        return 'de';
      }
    }

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
  }

  toggleLanguage(): void {
    const next = this.currentLang() === 'de' ? 'en' : 'de';
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
