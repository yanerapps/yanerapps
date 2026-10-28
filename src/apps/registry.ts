/** The studio and its apps, described once for every page that names them. */
export const studio = {
  name: 'Yaner Apps',
  email: 'yanerapps@gmail.com',
  url: 'https://yanerapps.com/',
} as const;

export const apps = {
  'gps-go': {
    name: 'GPS-Go',
    // null turns every Play call to action back into "Coming soon to Google Play".
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.yanerapps.gpsgo' as
      string | null,
  },
  pingdeck: { name: 'PingDeck' },
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
