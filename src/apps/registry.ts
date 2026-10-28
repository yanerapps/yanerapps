/** The studio and its apps, described once for every page that names them. */
export const studio = {
  name: 'Yaner Apps',
  email: 'yanerapps@gmail.com',
  url: 'https://yanerapps.com/',
} as const;

export const apps = {
  'gps-go': {
    name: 'GPS-Go',
    /** One line for the privacy and support lists. */
    blurb: 'no-root location simulator for Android',
    // null turns every Play call to action back into "Coming soon to Google Play".
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.yanerapps.gpsgo' as
      string | null,

    /** Shown on the studio home page; an app without one is not listed there yet. */
    showcase: {
      icon: '/gps-go/favicon.svg',
      tagline: 'A no-root location simulator',
      summary:
        'Pick a point on the map, mock device coordinates, and control movement with a floating joystick overlay. Built for developers and QA testing location-based apps.',
      highlights: [
        'Jump to any coordinate or saved place, or replay a route or GPX track at walking, running or cycling speed',
        'Floating joystick with rocker and D-pad controls',
        'No account needed — your places, routes and history stay on your device',
      ],
    },
  },
  pingdeck: { name: 'PingDeck', blurb: 'pings many hosts at once, for Android' },
} as const;

export type AppId = keyof typeof apps;
export const appIds = Object.keys(apps) as AppId[];

/** Each app's pages live under /<id>; its privacy policy and support page are always there. */
export const appPaths = (id: AppId) => ({
  home: `/${id}`,
  privacy: `/${id}/privacy`,
  support: `/${id}/support`,
});

export const mailto = (subject?: string) =>
  `mailto:${studio.email}` + (subject ? `?subject=${encodeURIComponent(subject)}` : '');
