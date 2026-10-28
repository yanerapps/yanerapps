import type { ImageMetadata } from 'astro';
import type { Rect } from './tour';
import overlayLight from '../assets/screens/anatomy-overlay-light.webp';
import overlayDark from '../assets/screens/anatomy-overlay-dark.webp';
import quickTeleportLight from '../assets/screens/frag-quick-teleport-light.webp';
import quickTeleportDark from '../assets/screens/frag-quick-teleport-dark.webp';
import overlayStyleLight from '../assets/screens/frag-overlay-style-light.webp';
import overlayStyleDark from '../assets/screens/frag-overlay-style-dark.webp';
import bubbleLight from '../assets/screens/frag-bubble-light.webp';
import bubbleDark from '../assets/screens/frag-bubble-dark.webp';
import travelTimeLight from '../assets/screens/frag-travel-time-light.webp';
import travelTimeDark from '../assets/screens/frag-travel-time-dark.webp';
import dpadLight from '../assets/screens/frag-dpad-light.webp';
import dpadDark from '../assets/screens/frag-dpad-dark.webp';
import presetsLight from '../assets/screens/frag-presets-light.webp';
import presetsDark from '../assets/screens/frag-presets-dark.webp';

export interface Part {
  id: string;
  title: string;
  body: string;
  /** Percentages of the overlay crop. */
  rect: Rect;
  /** `panel`: the crop is exactly the overlay window, so its rounded corners are masked. */
  fragment?: {
    image: ImageMetadata;
    dark: ImageMetadata;
    alt: string;
    caption: string;
    panel?: boolean;
  };
}

export const overlayImage = {
  image: overlayLight,
  dark: overlayDark,
  alt: 'The GPS-Go joystick window: quick teleport, settings, readouts, collapse and open-app buttons along the top, the round stick pushed up and right, speed, time and steps with a Details button, a Walk preset and a Stop moving button.',
};

export const parts: readonly Part[] = [
  {
    id: 'history',
    title: 'Quick teleport',
    body: 'Your saved places and recent spots. Pick one, then Teleport here or Travel here without leaving the app you are in.',
    rect: [2.6, 4.1, 9.8, 10.7],
    fragment: {
      image: quickTeleportLight,
      dark: quickTeleportDark,
      alt: 'The joystick window listing saved places: Golden Gate Bridge, Ferry Building, Union Square, Times Square, Shibuya Crossing, Eiffel Tower, Big Ben and Sydney Opera House.',
      caption: 'Saved places, one tap away.',
      panel: true,
    },
  },
  {
    id: 'settings',
    title: 'Overlay settings',
    body: 'Choose the 360° joystick or an 8-way D-pad, set how faded and how large the window is, and put the readouts on the left.',
    rect: [24, 4.1, 9.8, 10.7],
    fragment: {
      image: overlayStyleLight,
      dark: overlayStyleDark,
      alt: 'Overlay settings in the joystick window: Joystick or D-pad, opacity, joystick size and Readouts on the left.',
      caption: 'Right inside the window.',
      panel: true,
    },
  },
  {
    id: 'readouts',
    title: 'Hide readouts',
    body: 'Hide the readouts for a narrower window with just the stick, and show them again when you need them.',
    rect: [44.8, 4.1, 9.8, 10.7],
  },
  {
    id: 'collapse',
    title: 'Collapse',
    body: 'Fold the window into a small bubble. Tap the bubble to bring the joystick back.',
    rect: [66.2, 4.1, 9.8, 10.7],
    fragment: {
      image: bubbleLight,
      dark: bubbleDark,
      alt: 'The collapsed joystick: a round bubble with a game controller icon floating over the map.',
      caption: 'Folded away.',
    },
  },
  {
    id: 'app',
    title: 'Back to app',
    body: 'Open GPS-Go’s map without stopping the session.',
    rect: [87.3, 4.1, 9.8, 10.7],
  },
  {
    id: 'readout',
    title: 'Speed, time and steps',
    body: 'Speed, session time, route progress and steps. After a jump it also shows how long that trip would take at your reference speed.',
    rect: [50.7, 16.7, 48.2, 44],
    fragment: {
      image: travelTimeLight,
      dark: travelTimeDark,
      alt: 'Readouts after a jump from Paris to London: 4.3 km/h, a travel time of 78:49:04 left, and the step count.',
      caption: 'After a jump from Paris to London.',
    },
  },
  {
    id: 'stick',
    title: 'The stick',
    body: 'Drag in any direction. The farther you push, the faster you go, up to the preset speed. Let go and it keeps the heading; tap it to stop.',
    rect: [2.2, 16.5, 47, 59],
    fragment: {
      image: dpadLight,
      dark: dpadDark,
      alt: 'The same window with the D-pad style: eight arrow buttons around a centre point.',
      caption: 'Or an 8-way D-pad.',
      panel: true,
    },
  },
  {
    id: 'preset',
    title: 'Speed preset',
    body: 'Walk, Run, Bike or Custom, picked from a list that opens inside the window. The preset speeds are yours to set in Movement settings.',
    rect: [2.6, 80.1, 51.2, 15.3],
    fragment: {
      image: presetsLight,
      dark: presetsDark,
      alt: 'The speed preset list open in the joystick window: Walk, checked, Run, Bike and Custom.',
      caption: 'The preset list, open.',
      panel: true,
    },
  },
  {
    id: 'stop',
    title: 'Stop moving',
    body: 'Hold the position where it is without ending the session. On a route the same place holds Pause and Back on route.',
    rect: [56.8, 80.1, 40.9, 15.3],
  },
];
