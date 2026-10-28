export interface Faq {
  q: string;
  a: string;
}

export const faqs: readonly Faq[] = [
  {
    q: 'Does GPS-Go need root?',
    a: 'No. It uses the mock location setting Android provides for developers: turn on Developer options, then choose GPS-Go under Select mock location app. The app walks you through it on first launch.',
  },
  {
    q: 'Which apps see the simulated location?',
    a: 'Apps that read Android’s GPS or network location providers, and apps that use the fused location provider in Google Play services. GPS-Go sends the same position to all three.',
  },
  {
    q: 'An app says it can’t find a GPS signal.',
    a: 'That app checks whether a location is simulated and refuses it. Android marks every simulated location, and GPS-Go doesn’t hide the mark, so nothing in GPS-Go can change the app’s decision. Use your real location with that app.',
  },
  {
    q: 'My position snaps back to where I really am.',
    a: 'Some apps also use nearby Wi-Fi networks and Bluetooth beacons, or Android may put GPS-Go to sleep in the background. Set GPS-Go’s battery usage to Unrestricted, and consider turning off Wi-Fi scanning and Bluetooth scanning in the system location settings while you test.',
  },
  {
    q: 'After I stop, apps still show the simulated location.',
    a: 'Android and map apps can cache the last known location. In Help, Restore my real location asks the system for a fresh fix. If that isn’t enough, set Select mock location app to Nothing, toggle location or airplane mode, and let a map app get a fix outdoors.',
  },
  {
    q: 'Can I bring in places and routes from other apps?',
    a: 'Yes. Share a place from Google Maps, Apple Maps, Waze, HERE, OpenStreetMap, Bing or Yandex, or any geo: link or plain coordinates, and it lands on the map. GPX files import as routes, and routes export as GPX. Amap, Baidu and Tencent use a different coordinate system and aren’t supported yet.',
  },
  {
    q: 'Is GPS-Go free?',
    a: 'Yes, with daily limits on new sessions and place searches. Watching an optional ad adds more, and typing coordinates never uses a search. Paid plans that lift the limits are on the way.',
  },
  {
    q: 'Which phones does it run on?',
    a: 'Android 12 and later. The layout adapts to foldables and tablets as well as phones, and the app is available in English, Simplified and Traditional Chinese, Japanese, Spanish, German and French.',
  },
];
