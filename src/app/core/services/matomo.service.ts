import { Injectable, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { environment } from '../../../environments/environment';

declare global {
  interface Window {
    _paq?: any[];
  }
}

@Injectable({
  providedIn: 'root'
})
export class MatomoService {
  private readonly router = inject(Router);
  private initialized = false;
  private previousUrl = '';

  constructor() {
    if (typeof window !== 'undefined') {
      window._paq = window._paq || [];
    }
  }

  private ensurePaq(): any[] | null {
    if (typeof window === 'undefined') return null;
    window._paq = window._paq || [];
    return window._paq;
  }

  init(): void {
    if (this.initialized || typeof window === 'undefined') {
      return;
    }

    const matomoConfig = environment.matomo;
    if (!matomoConfig || !matomoConfig.trackerUrl || !matomoConfig.siteId) {
      return;
    }

    const paq = this.ensurePaq();
    if (!paq) return;

    // Format tracker URL to ensure trailing slash
    let trackerUrl = matomoConfig.trackerUrl.trim();
    if (!trackerUrl.endsWith('/')) {
      trackerUrl += '/';
    }

    paq.push(['setTrackerUrl', trackerUrl + 'matomo.php']);
    paq.push(['setSiteId', matomoConfig.siteId]);
    paq.push(['enableLinkTracking']);

    // Inject Matomo tracking script
    const doc = document;
    const script = doc.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = trackerUrl + 'matomo.js';
    const firstScript = doc.getElementsByTagName('script')[0];
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else {
      doc.head.appendChild(script);
    }

    this.initialized = true;

    // Listen to router events for SPA pageview tracking
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.trackPageView(event.urlAfterRedirects || event.url);
      });
  }

  trackPageView(customUrl?: string, customTitle?: string): void {
    const paq = this.ensurePaq();
    if (!paq) return;

    const url = customUrl || (typeof window !== 'undefined' ? window.location.href : '');
    if (this.previousUrl && this.previousUrl !== url) {
      paq.push(['setReferrerUrl', this.previousUrl]);
    }
    this.previousUrl = url;

    paq.push(['setCustomUrl', url]);
    if (customTitle || (typeof document !== 'undefined' && document.title)) {
      paq.push(['setDocumentTitle', customTitle || document.title]);
    }
    paq.push(['trackPageView']);
  }

  trackEvent(category: string, action: string, name?: string, value?: number): void {
    const paq = this.ensurePaq();
    if (!paq) return;
    const eventParams: any[] = ['trackEvent', category, action];
    if (name !== undefined) eventParams.push(name);
    if (value !== undefined) eventParams.push(value);
    paq.push(eventParams);
  }

  trackSiteSearch(keyword: string, category?: string, count?: number): void {
    const paq = this.ensurePaq();
    if (!paq) return;
    paq.push(['trackSiteSearch', keyword, category || false, count !== undefined ? count : false]);
  }

  trackResultsOpened(type: 'nearby' | 'place', placeName?: string | null): void {
    if (type === 'nearby') {
      this.trackEvent('Results', 'Open Results', 'nearby');
    } else {
      const name = placeName || 'Unknown Place';
      this.trackEvent('Results', 'Open Results', name);
      this.trackSiteSearch(name, 'Place Search');
    }
  }

  trackDetailOpened(toiletId: number, source: 'card' | 'map' | 'direct', toiletName?: string | null): void {
    const label = toiletName ? `${toiletName} (#${toiletId})` : `Toilet #${toiletId}`;
    this.trackEvent('Detail View', `Open from ${source}`, label, toiletId);
  }

  trackDarkModeToggled(isDark: boolean): void {
    this.trackEvent('Settings', 'Toggle Dark Mode', isDark ? 'dark' : 'light');
  }

  trackHelpUsed(): void {
    this.trackEvent('Header', 'Help Used');
  }

  trackLanguageSwitched(lang: string): void {
    this.trackEvent('Language', 'Switch Language', lang);
    if (typeof window !== 'undefined' && window._paq) {
      window._paq.push(['setCustomVariable', 1, 'Language', lang, 'visit']);
    }
  }

  trackUrgentUsed(toiletId?: number | null, toiletName?: string | null): void {
    if (toiletId) {
      const label = toiletName ? `${toiletName} (#${toiletId})` : `Toilet #${toiletId}`;
      this.trackEvent('Navigation', 'Urgent Toilet Selected', label, toiletId);
    } else {
      this.trackEvent('Navigation', 'Urgent Navigation Emergency');
    }
  }
}
