import { Injectable, inject, signal } from '@angular/core';
import { MatomoService } from './matomo.service';

export type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'wc_info_theme';
  private readonly matomoService = inject(MatomoService);

  readonly themeMode = signal<ThemeMode>('system');
  readonly isDark = signal<boolean>(false);

  private mediaQueryListener?: (e: MediaQueryListEvent) => void;

  constructor() {
    this.initTheme();
  }

  private initTheme(): void {
    if (typeof window === 'undefined') return;

    let savedMode: ThemeMode = 'system';
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY) as ThemeMode | null;
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        savedMode = stored;
      }
    } catch {
      // localStorage may fail in restricted/private contexts
    }

    this.themeMode.set(savedMode);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const systemPrefersDark = mediaQuery.matches;

    const shouldBeDark = savedMode === 'dark' || (savedMode === 'system' && systemPrefersDark);
    this.applyThemeClass(shouldBeDark);

    this.mediaQueryListener = (e: MediaQueryListEvent) => {
      if (this.themeMode() === 'system') {
        this.applyThemeClass(e.matches);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', this.mediaQueryListener);
    } else if ((mediaQuery as any).addListener) {
      (mediaQuery as any).addListener(this.mediaQueryListener);
    }
  }

  setTheme(mode: ThemeMode): void {
    this.themeMode.set(mode);
    try {
      localStorage.setItem(this.STORAGE_KEY, mode);
    } catch {
      // ignore storage write errors
    }

    let isDark = false;
    if (mode === 'system') {
      const systemPrefersDark = typeof window !== 'undefined'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
        : false;
      isDark = systemPrefersDark;
      this.applyThemeClass(systemPrefersDark);
    } else {
      isDark = mode === 'dark';
      this.applyThemeClass(isDark);
    }

    this.matomoService.trackDarkModeToggled(isDark);
  }

  toggleTheme(): void {
    const next: ThemeMode = this.isDark() ? 'light' : 'dark';
    this.setTheme(next);
  }

  private applyThemeClass(dark: boolean): void {
    this.isDark.set(dark);
    if (typeof document !== 'undefined') {
      if (dark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }
}
