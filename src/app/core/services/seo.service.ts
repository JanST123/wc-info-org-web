import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';

export interface SeoData {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);

  private readonly defaultDescription = 'Finde saubere und barrierefreie öffentliche Toiletten in deiner Nähe auf wc-info.org';
  private readonly defaultImage = '/assets/logo320.png';
  private readonly siteName = 'wc-info.org';

  updateSeo(data: SeoData): void {
    const title = data.title;
    const description = data.description || this.defaultDescription;
    const image = this.toAbsoluteUrl(data.image || this.defaultImage);
    const url = data.url || (typeof window !== 'undefined' ? window.location.href : 'https://wc-info.org');
    const type = data.type || 'website';

    // 1. Page Title
    this.titleService.setTitle(title);

    // 2. Standard Meta
    this.metaService.updateTag({ name: 'description', content: description });

    // 3. OpenGraph
    this.metaService.updateTag({ property: 'og:title', content: title });
    this.metaService.updateTag({ property: 'og:description', content: description });
    this.metaService.updateTag({ property: 'og:image', content: image });
    this.metaService.updateTag({ property: 'og:url', content: url });
    this.metaService.updateTag({ property: 'og:type', content: type });
    this.metaService.updateTag({ property: 'og:site_name', content: this.siteName });

    // 4. Twitter Card
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: title });
    this.metaService.updateTag({ name: 'twitter:description', content: description });
    this.metaService.updateTag({ name: 'twitter:image', content: image });
  }

  private toAbsoluteUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://wc-info.org';
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    return `${origin}${cleanPath}`;
  }
}
