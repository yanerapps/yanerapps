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
      tagline: 'Test your app from anywhere',
      summary:
        'Explore how your app behaves in different places, without leaving your desk. Pick a location, follow a route or move around freely.',
      highlights: [
        'Jump to a place or travel along a route at your chosen pace',
        'Steer from a floating joystick while using another app',
        'No account needed — your places, routes and history stay on your device',
      ],
    },
  },
  pingdeck: {
    name: 'PingDeck',
    blurb: 'pings many hosts at once, for Android',
    playStoreUrl: null as string | null,
    showcase: {
      icon: '/pingdeck/icon.png',
      tagline: 'Know when your connections need attention',
      summary:
        'Keep an eye on your network from your phone and spot connection problems as they happen.',
      highlights: [
        'See which devices and services are reachable at a glance',
        'Track response times and see how connections change over time',
        'Get alerts when a connection goes down or recovers, and check status from your home screen',
      ],
    },
  },
  paperdot: {
    name: 'Paperdot',
    blurb: 'a Bullet Journal for Android',
    playStoreUrl: null as string | null,
    showcase: {
      icon: '/paperdot/icon.svg',
      tagline: 'A Bullet Journal that feels like paper',
      summary:
        'Log tasks, events and notes the Bullet Journal way, in a notebook you turn page by page, and decide each month what moves forward.',
      highlights: [
        'Quick logging with signifiers in daily, monthly and future logs',
        'A guided review migrates unfinished tasks one by one, never all at once',
        'No account needed — your journal stays on your device, with backups you own',
      ],
    },
  },
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
