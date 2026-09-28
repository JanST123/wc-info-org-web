import { Page } from '@playwright/test';

export const MOCK_TOILETS = [
  {
    id: 101,
    name: 'Hauptbahnhof WC Ost',
    owner: 'Deutsche Bahn AG',
    lat: 52.525,
    lon: 13.369,
    place_id: 'ChIJ578H2VFRqEcR6_mock',
    status: 'active',
    is_qualified: true,
    is_unisex: false,
    is_gender_separated: true,
    has_wheelchair_access: true,
    has_changing_table: true,
    public_accessible: false,
    accessible_outside_opening_times: false,
    euro_key: 'yes',
    storage_space: 'much',
    is_open: true,
    open_timestamp: '2026-09-28T06:00:00Z',
    close_timestamp: '2026-09-28T22:00:00Z',
    place_opening_hours: [
      { open: { day: 1, hour: 6, minute: 0 }, close: { day: 1, hour: 22, minute: 0 } },
      { open: { day: 2, hour: 6, minute: 0 }, close: { day: 2, hour: 22, minute: 0 } },
      { open: { day: 3, hour: 6, minute: 0 }, close: { day: 3, hour: 22, minute: 0 } },
      { open: { day: 4, hour: 6, minute: 0 }, close: { day: 4, hour: 22, minute: 0 } },
      { open: { day: 5, hour: 6, minute: 0 }, close: { day: 5, hour: 22, minute: 0 } },
      { open: { day: 6, hour: 8, minute: 0 }, close: { day: 6, hour: 20, minute: 0 } },
      { open: { day: 0, hour: 8, minute: 0 }, close: { day: 0, hour: 20, minute: 0 } },
    ],
    address: 'Europaplatz 1, 10557 Berlin',
    website: 'https://www.bahnhof.de/berlin-hauptbahnhof',
    comment: 'Sehr sauber, Euro-Schlüssel für Rollstuhl-WC erforderlich.',
    distance: 0.35,
    photos: [
      {
        id: 1,
        toilet_id: 101,
        url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400',
        url_thumb: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=100',
        is_main: true,
        filename: 'hbf_photo_1.jpg'
      },
      {
        id: 2,
        toilet_id: 101,
        url: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400',
        url_thumb: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=100',
        is_main: false,
        filename: 'hbf_photo_2.jpg'
      }
    ]
  },
  {
    id: 102,
    name: 'Park-Toilette Mauerpark',
    owner: null,
    lat: 52.543,
    lon: 13.403,
    place_id: null,
    status: 'active',
    is_qualified: false,
    is_unisex: true,
    is_gender_separated: false,
    has_wheelchair_access: false,
    has_changing_table: false,
    public_accessible: true,
    accessible_outside_opening_times: true,
    euro_key: 'no',
    storage_space: 'none',
    is_open: true,
    open_timestamp: null,
    close_timestamp: null,
    place_opening_hours: null,
    address: 'Gleimstraße 55, 10437 Berlin',
    website: null,
    comment: 'Öffentliche City-Toilette rund um die Uhr zugänglich.',
    distance: 1.2,
    photos: []
  }
];

export async function setupApiMocks(page: Page, customToilets: any[] = MOCK_TOILETS) {
  // Ensure consistent German language across all tests
  await page.addInitScript(() => {
    try {
      localStorage.setItem('wc_info_lang', 'de');
    } catch {}
  });

  // Mock health check
  await page.route('**/health', async (route) => {
    await route.fulfill({ json: { status: 'OK' } });
  });

  // Mock nearby search
  await page.route('**/toilets/nearby/**', async (route) => {
    await route.fulfill({ json: customToilets });
  });

  // Mock bounds search
  await page.route('**/toilets/bounds/**', async (route) => {
    await route.fulfill({ json: customToilets });
  });

  // Mock single toilet get
  await page.route('**/toilet/**', async (route) => {
    const url = route.request().url();
    if (route.request().method() === 'GET') {
      const match = url.match(/\/toilet\/(\d+)/);
      if (match) {
        const id = parseInt(match[1], 10);
        const found = customToilets.find((t) => t.id === id) || customToilets[0];
        await route.fulfill({ json: found });
        return;
      }
    }
    await route.fallback();
  });

  // Mock Nominatim geocoding
  await page.route('https://nominatim.openstreetmap.org/**', async (route) => {
    await route.fulfill({
      json: [
        {
          lat: '52.5200',
          lon: '13.4050',
          display_name: 'Berlin, Deutschland',
          name: 'Berlin',
          place_id: 12345
        }
      ]
    });
  });

  // Mock Matomo analytics requests
  await page.route('**/piwik.jan8.de/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: 'window._paq = window._paq || [];'
    });
  });

  // Mock Google Maps / Places JS API loader to avoid network failures
  await page.route('https://maps.googleapis.com/**', async (route) => {
    const reqUrl = route.request().url();
    let callbackName = '';
    try {
      const parsedUrl = new URL(reqUrl);
      callbackName = parsedUrl.searchParams.get('callback') || '';
    } catch {
      // ignore URL parse error
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `
        window.google = window.google || {};
        window.google.maps = window.google.maps || {
          MapTypeId: { ROADMAP: 'roadmap', SATELLITE: 'satellite', HYBRID: 'hybrid', TERRAIN: 'terrain' },
          Animation: { DROP: 1, BOUNCE: 2 },
          ControlPosition: {
            TOP_LEFT: 1, TOP_CENTER: 2, TOP_RIGHT: 3,
            LEFT_TOP: 4, LEFT_CENTER: 5, LEFT_BOTTOM: 6,
            RIGHT_TOP: 7, RIGHT_CENTER: 8, RIGHT_BOTTOM: 9,
            BOTTOM_LEFT: 10, BOTTOM_CENTER: 11, BOTTOM_RIGHT: 12
          },
          LatLng: function(lat, lng) { return { lat: () => lat, lng: () => lng }; },
          importLibrary: function(lib) {
            if (lib === 'places') {
              return Promise.resolve({
                Place: {
                  searchNearby: function() { return Promise.resolve({ places: [] }); }
                },
                SearchNearbyRankPreference: { DISTANCE: 'DISTANCE' }
              });
            }
            return Promise.resolve({});
          },
          InfoWindow: function() {
            return {
              setContent: function() {},
              setOptions: function() {},
              getPosition: function() { return null; },
              open: function() {},
              close: function() {},
              setPosition: function() {},
              addListener: function() {}
            };
          },
          Map: function() {
            return {
              controls: Array.from({ length: 15 }, () => ({ push: () => {} })),
              setCenter: function() {},
              panTo: function() {},
              setZoom: function() {},
              setOptions: function() {},
              addListener: function() {},
              getBounds: function() { return null; }
            };
          },
          Marker: function() {
            return {
              setMap: function() {},
              setPosition: function() {},
              addListener: function() {},
              setIcon: function() {},
              setVisible: function() {},
              getTitle: function() { return ''; }
            };
          },
          Geocoder: function() {
            return {
              geocode: function(req, cb) {
                cb([
                  {
                    geometry: {
                      location: {
                        lat: function() { return 52.52; },
                        lng: function() { return 13.405; }
                      }
                    },
                    address_components: [{ long_name: "Berlin" }],
                    formatted_address: "Berlin, Deutschland",
                    place_id: "ChIJAVkDP28q1scRcOMddgahac0"
                  }
                ], 'OK');
              }
            };
          },
          places: {
            PlacesService: function() {
              return {
                getDetails: function(req, cb) {
                  cb({
                    geometry: {
                      location: {
                        lat: function() { return 52.52; },
                        lng: function() { return 13.405; }
                      }
                    },
                    name: 'Berlin',
                    formatted_address: 'Berlin, Deutschland'
                  }, 'OK');
                }
              };
            },
            AutocompleteService: function() {
              return {
                getPlacePredictions: function(req, cb) {
                  cb([], 'ZERO_RESULTS');
                }
              };
            }
          }
        };
        if ('${callbackName}' && typeof window['${callbackName}'] === 'function') {
          window['${callbackName}']();
        }
      `
    });
  });
}
