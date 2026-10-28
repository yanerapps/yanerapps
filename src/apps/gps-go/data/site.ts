import { appPaths, apps, studio } from '../../registry';

const paths = appPaths('gps-go');

export const site = {
  name: apps['gps-go'].name,
  title: 'GPS-Go: mock location and route simulator for Android',
  description:
    'Set the location your Android phone reports to apps. Tap a point, draw a route, or steer with a joystick that floats over any app. No root: it uses Developer options.',
  playStoreUrl: apps['gps-go'].playStoreUrl,
  publisher: studio.name,
  publisherUrl: studio.url,
  privacyUrl: paths.privacy,
  supportUrl: paths.support,
  email: studio.email,
  minAndroid: '12',
} as const;

/** The path every GPS-Go page lives under. The site drops trailing slashes, so links are `${base}/guide`, never `${base}/guide/`. */
export const base = paths.home;
