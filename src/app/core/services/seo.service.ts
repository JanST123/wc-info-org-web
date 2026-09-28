import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { Toilet } from '../models/toilet.model';

export interface SeoData {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  geo?: { lat: number; lon: number };
  schema?: object;
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
  private readonly baseUrl = 'https://wc-info.org';

  updateSeo(data: SeoData): void {
    const title = data.title;
    const description = data.description || this.defaultDescription;
    const image = this.toAbsoluteUrl(data.image || this.defaultImage);
    const url = data.url || (typeof window !== 'undefined' ? window.location.href : this.baseUrl);
    const type = data.type || 'website';

    // 1. Page Title
    this.titleService.setTitle(title);

    // 2. Standard Meta & Robots
    this.metaService.updateTag({ name: 'description', content: description });
    this.metaService.updateTag({ name: 'robots', content: 'index, follow' });

    // 3. OpenGraph
    this.metaService.updateTag({ property: 'og:title', content: title });
    this.metaService.updateTag({ property: 'og:description', content: description });
    this.metaService.updateTag({ property: 'og:image', content: image });
    this.metaService.updateTag({ property: 'og:url', content: url });
    this.metaService.updateTag({ property: 'og:type', content: type });
    this.metaService.updateTag({ property: 'og:site_name', content: this.siteName });
    this.metaService.updateTag({ property: 'og:locale', content: 'de_DE' });

    // 4. Twitter Card
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: title });
    this.metaService.updateTag({ name: 'twitter:description', content: description });
    this.metaService.updateTag({ name: 'twitter:image', content: image });

    // 5. Geo Meta Tags (if coordinates provided)
    if (data.geo) {
      this.metaService.updateTag({ name: 'geo.position', content: `${data.geo.lat};${data.geo.lon}` });
      this.metaService.updateTag({ name: 'ICBM', content: `${data.geo.lat}, ${data.geo.lon}` });
      this.metaService.updateTag({ property: 'place:location:latitude', content: String(data.geo.lat) });
      this.metaService.updateTag({ property: 'place:location:longitude', content: String(data.geo.lon) });
    } else {
      this.metaService.removeTag('name="geo.position"');
      this.metaService.removeTag('name="ICBM"');
      this.metaService.removeTag('property="place:location:latitude"');
      this.metaService.removeTag('property="place:location:longitude"');
    }

    // 6. Canonical Link
    this.updateCanonicalUrl(url);

    // 7. Schema.org JSON-LD structured data
    this.updateJsonLd(data.schema);
  }

  setHomeSeo(): void {
    const title = 'WC-Info - wc-info.org';
    const description = this.defaultDescription;
    const url = typeof window !== 'undefined' ? window.location.origin : this.baseUrl;

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      'name': this.siteName,
      'url': url,
      'description': description,
      'potentialAction': {
        '@type': 'SearchAction',
        'target': `${url}/toiletten/{search_term_string}`,
        'query-input': 'required name=search_term_string'
      }
    };

    this.updateSeo({
      title,
      description,
      url,
      schema
    });
  }

  setPlacesSeo(placeName: string): void {
    const cleanPlace = placeName.trim();
    const title = `${cleanPlace} - wc-info.org`;
    const description = `Öffentliche Toiletten und barrierefreie WCs in ${cleanPlace} finden auf wc-info.org.`;
    const url = typeof window !== 'undefined' ? window.location.href : this.baseUrl;

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': title,
      'description': description,
      'url': url,
      'isPartOf': {
        '@type': 'WebSite',
        'name': this.siteName,
        'url': this.baseUrl
      }
    };

    this.updateSeo({
      title,
      description,
      url,
      schema
    });
  }

  setToiletSeo(toilet: Toilet, placeName?: string): void {
    const titlePart = (toilet.owner && toilet.owner.trim().length > 0)
      ? toilet.owner.trim()
      : (toilet.name && toilet.name.trim().length > 0 ? toilet.name.trim() : 'Toilette');

    const title = `${titlePart} - wc-info.org`;
    const address = toilet.address ? `${toilet.address} · ` : '';
    const desc = `${address}${toilet.name || titlePart} - Öffentliche Toilette auf wc-info.org`;
    const image = toilet.photos && toilet.photos.length > 0 ? toilet.photos[0].url : undefined;
    const url = typeof window !== 'undefined' ? window.location.href : this.baseUrl;

    const amenities: any[] = [];
    if (toilet.hasWheelchairAccess) {
      amenities.push({
        '@type': 'LocationFeatureSpecification',
        'name': 'Wheelchair Accessible',
        'value': true
      });
    }
    if (toilet.hasChangingTable) {
      amenities.push({
        '@type': 'LocationFeatureSpecification',
        'name': 'Changing Table',
        'value': true
      });
    }
    if (toilet.isUnisex) {
      amenities.push({
        '@type': 'LocationFeatureSpecification',
        'name': 'Unisex Restroom',
        'value': true
      });
    }

    const schema: any = {
      '@context': 'https://schema.org',
      '@type': 'PublicToilet',
      'name': toilet.name || titlePart,
      'description': desc,
      'url': url,
      'geo': {
        '@type': 'GeoCoordinates',
        'latitude': toilet.lat,
        'longitude': toilet.lon
      }
    };

    if (toilet.address) {
      schema.address = {
        '@type': 'PostalAddress',
        'streetAddress': toilet.address
      };
    }

    if (image) {
      schema.image = this.toAbsoluteUrl(image);
    }

    if (amenities.length > 0) {
      schema.amenityFeature = amenities;
    }

    this.updateSeo({
      title,
      description: desc,
      image,
      url,
      geo: { lat: toilet.lat, lon: toilet.lon },
      schema
    });
  }

  setUrgentSeo(): void {
    const title = 'Notfall-Navigation - wc-info.org';
    const description = 'Schnellste Notfall-Navigation zur nächsten barrierefreien öffentlichen Toilette auf wc-info.org.';
    const url = typeof window !== 'undefined' ? window.location.href : `${this.baseUrl}/Urgent`;

    this.updateSeo({
      title,
      description,
      url
    });
  }

  private updateCanonicalUrl(url: string): void {
    if (typeof document === 'undefined') return;
    let link: HTMLLinkElement | null = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private updateJsonLd(schema?: object): void {
    if (typeof document === 'undefined') return;
    let script: HTMLScriptElement | null = document.getElementById('seo-jsonld') as HTMLScriptElement | null;
    if (!schema) {
      if (script) {
        script.remove();
      }
      return;
    }
    if (!script) {
      script = document.createElement('script');
      script.id = 'seo-jsonld';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.text = JSON.stringify(schema, null, 2);
  }

  private toAbsoluteUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : this.baseUrl;
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    return `${origin}${cleanPath}`;
  }
}
