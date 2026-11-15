import { appPaths, apps, studio } from '../../registry';

const paths = appPaths('pingdeck');

export const site = {
  name: apps.pingdeck.name,
  title: 'PingDeck: multi ping monitor for Android',
  description:
    'Ping many hosts at once from your Android phone. Live latency and packet loss in one table, alerts when a host goes down or comes back, and home screen widgets. No root, no account.',
  playStoreUrl: apps.pingdeck.playStoreUrl,
  publisher: studio.name,
  publisherUrl: studio.url,
  privacyUrl: paths.privacy,
  supportUrl: paths.support,
  termsUrl: `${paths.home}/terms`,
  email: studio.email,
  minAndroid: '12',
} as const;

/** The path every PingDeck page lives under; links are `${base}/privacy`, never with a trailing slash. */
export const base = paths.home;

/** The app's free tier (ProFeatures.FREE_HOST_LIMIT in the Android app). */
export const FREE_HOST_LIMIT = 3;
