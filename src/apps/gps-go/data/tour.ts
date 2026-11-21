import type { ImageMetadata } from 'astro';
import searchLight from '../assets/screens/search-light.webp';
import searchDark from '../assets/screens/search-dark.webp';
import pickLight from '../assets/screens/pick-light.webp';
import pickDark from '../assets/screens/pick-dark.webp';
import runningLight from '../assets/screens/running-light.webp';
import runningDark from '../assets/screens/running-dark.webp';
import teleportLight from '../assets/screens/teleport-light.webp';
import teleportDark from '../assets/screens/teleport-dark.webp';
import joystickLight from '../assets/screens/joystick-light.webp';
import joystickDark from '../assets/screens/joystick-dark.webp';
import fabLight from '../assets/screens/fab-menu-light.webp';
import fabDark from '../assets/screens/fab-menu-dark.webp';
import drawLight from '../assets/screens/draw-light.webp';
import drawDark from '../assets/screens/draw-dark.webp';
import routeSheetLight from '../assets/screens/route-sheet-light.webp';
import routeSheetDark from '../assets/screens/route-sheet-dark.webp';
import routeRunningLight from '../assets/screens/route-running-light.webp';
import routeRunningDark from '../assets/screens/route-running-dark.webp';
import detourLight from '../assets/screens/detour-light.webp';
import detourDark from '../assets/screens/detour-dark.webp';

/** Left, top, width, height as percentages of the screenshot. */
export type Rect = readonly [x: number, y: number, w: number, h: number];

export interface Hotspot {
  title: string;
  body: string;
  rect: Rect;
}

export interface Chapter {
  id: string;
  title: string;
  body: string;
  image: ImageMetadata;
  dark: ImageMetadata;
  alt: string;
  hotspots: readonly Hotspot[];
  /** Top and bottom edges of the mobile crop, as percentages of the screenshot. */
  mobileCrop: readonly [top: number, bottom: number];
}

export const pointChapters: readonly Chapter[] = [
  {
    id: 'find',
    mobileCrop: [0, 56],
    title: 'Find a spot',
    body: 'Search for a place, type coordinates in decimal or degrees, minutes and seconds, or paste a map link. Coordinates are read on the phone and never use one of your daily searches.',
    image: searchLight,
    dark: searchDark,
    alt: 'The search panel before typing: Where would you like to go? Two coordinate examples, 48.8584, 2.2945 and 48°51′30″N 2°17′40″E, and a note that you can share a location from another map app.',
    hotspots: [
      {
        title: 'One search box',
        body: 'Place names, coordinates and map links all go in the same field.',
        rect: [2, 6.4, 96, 6.1],
      },
      {
        title: 'Coordinate examples',
        body: 'Tap one to try it. Both formats are recognised on the phone.',
        rect: [4.2, 31.7, 91.7, 15.5],
      },
      {
        title: 'Share from another app',
        body: 'Share a place from Google Maps, Waze or most map apps, or open a GPX file, and it lands on the map.',
        rect: [4.2, 49, 91.7, 3.7],
      },
    ],
  },
  {
    id: 'pick',
    mobileCrop: [38, 98],
    title: 'Pick a spot',
    body: 'Tap anywhere on the map, choose a saved place or a search result. You see the address and exact coordinates before anything changes.',
    image: pickLight,
    dark: pickDark,
    alt: 'GPS-Go map of Paris with the saved place Eiffel Tower selected. A sheet shows its Paris tag, its address, the coordinates 48.858370, 2.294480, a Stop automatically after setting and a Start mock here button.',
    hotspots: [
      {
        title: 'The point you picked',
        body: 'A pin marks it. Nothing is mocked yet.',
        rect: [46.3, 48.3, 7.4, 3.7],
      },
      {
        title: 'Address and coordinates',
        body: 'Filled in for you. Save, tag or share the place from the menu.',
        rect: [5.8, 68.4, 88.3, 12],
      },
      {
        title: 'Start mock here',
        body: 'One tap, and apps on the phone see this location.',
        rect: [5.8, 89.8, 88.3, 4.2],
      },
    ],
  },
  {
    id: 'start',
    mobileCrop: [40, 92],
    title: 'Mocking starts',
    body: 'The sheet closes and the mocked position takes over. The bar at the bottom shows what is running and stops it.',
    image: runningLight,
    dark: runningDark,
    alt: 'The map of Paris during a session. The mocked position sits on the Eiffel Tower, a Stopped status sits above a bar with follow, joystick and Stop buttons.',
    hotspots: [
      {
        title: 'Mocked position',
        body: 'Where every app on the phone now thinks you are.',
        rect: [46.3, 49, 7.4, 3.4],
      },
      {
        title: 'Status',
        body: 'Stopped, running, or off a route, with the current speed.',
        rect: [40.5, 76.6, 19.5, 3.2],
      },
      {
        title: 'Follow and joystick',
        body: 'Keep the camera on the mocked position, and show or hide the floating joystick.',
        rect: [26.8, 82.6, 24, 4.4],
      },
      {
        title: 'Stop',
        body: 'Ends the session and hands the location back to the phone.',
        rect: [52.7, 82.6, 20.5, 4.4],
      },
    ],
  },
  {
    id: 'teleport',
    mobileCrop: [54, 98],
    title: 'Teleport, or travel there',
    body: 'While a session runs, picking another spot gives you three ways to get there: arrive at once, move there in a straight line at your walk speed, or roam at random inside a circle around it.',
    image: teleportLight,
    dark: teleportDark,
    alt: 'The Arc de Triomphe picked during a running session. The sheet shows the address and coordinates, a save button, and Teleport here, Travel here and Wander here buttons.',
    hotspots: [
      {
        title: 'Teleport here',
        body: 'The position jumps straight to the new spot.',
        rect: [5.8, 77.6, 88.3, 4.3],
      },
      {
        title: 'Travel here',
        body: 'The position moves there and holds on arrival.',
        rect: [5.8, 83.7, 88.3, 4.3],
      },
      {
        title: 'Wander here',
        body: 'The position walks at random inside a circle around the spot, until you steer, teleport or stop.',
        rect: [5.8, 89.8, 88.3, 4.3],
      },
      {
        title: 'Save it',
        body: 'Keep the spot as a place for next time.',
        rect: [75.8, 57.3, 7.6, 4.1],
      },
    ],
  },
  {
    id: 'steer',
    mobileCrop: [20, 55],
    title: 'Steer from any app',
    body: 'The joystick floats over whatever app you are using. Push it and the position moves at walking, running or cycling speed; let go and it keeps going until you stop it.',
    image: joystickLight,
    dark: joystickDark,
    alt: 'The floating joystick over a map of Paris, walking at 4.3 km/h. The panel shows speed, time and steps, a Walk preset and a Stop moving button.',
    hotspots: [
      {
        title: 'The stick keeps going',
        body: 'Let go and it holds your heading. Tap the stick to stop.',
        rect: [6.8, 29.7, 35.2, 16.2],
      },
      {
        title: 'Speed, time and steps',
        body: 'Live readouts while you move.',
        rect: [43.5, 29.6, 36.2, 8.9],
      },
      {
        title: 'Speed preset',
        body: 'Walk, Run, Bike or a custom speed.',
        rect: [7, 47.3, 39, 4.5],
      },
      {
        title: 'Stop moving',
        body: 'Holds the position without ending the session.',
        rect: [48.1, 47.3, 30.8, 4.5],
      },
    ],
  },
];

export const routeChapters: readonly Chapter[] = [
  {
    id: 'add',
    mobileCrop: [55, 90],
    title: 'Add a place or a route',
    body: 'The + button on the map adds a place where you are looking, starts a drawing, or imports a GPX or KML file.',
    image: fabLight,
    dark: fabDark,
    alt: 'The map of Paris with the + menu open: Add place, Draw route and Import GPX / KML.',
    hotspots: [
      {
        title: 'Add place',
        body: 'Save a spot on the map as a place.',
        rect: [58.9, 61.4, 37, 6.2],
      },
      {
        title: 'Draw route',
        body: 'Draw a route by finger on the map.',
        rect: [57.5, 68.3, 38.4, 6.1],
      },
      {
        title: 'Import GPX or KML',
        body: 'Load a recorded track from a file.',
        rect: [44.6, 75, 51.3, 6.2],
      },
    ],
  },
  {
    id: 'draw',
    mobileCrop: [28, 92],
    title: 'Draw a route',
    body: 'Draw on the map with a finger. Add as many strokes as you like; each one continues from where the last one ended.',
    image: drawLight,
    dark: drawDark,
    alt: 'A loop drawn by finger around the Champ de Mars in Paris, starting near the Eiffel Tower, with Curve and Straight modes and close, draw, undo and Next controls.',
    hotspots: [
      {
        title: 'Curve or Straight',
        body: 'Freehand lines, or straight segments from point to point.',
        rect: [27.1, 75, 45.8, 4.3],
      },
      {
        title: 'Draw, undo, Next',
        body: 'Turn drawing off to pan and zoom, undo the last stroke, then name and save the route.',
        rect: [20, 82.3, 59.5, 5.1],
      },
      {
        title: 'Close the loop',
        body: 'Finish near the start and GPS-Go offers to join the ends.',
        rect: [30, 32, 9, 6],
      },
    ],
  },
  {
    id: 'run',
    mobileCrop: [27, 93],
    title: 'Run it your way',
    body: 'Before you start, choose the pace, and under Advanced settings one-way or round trip, how many laps and what happens at the end. You can change the pace while it runs.',
    image: routeSheetLight,
    dark: routeSheetDark,
    alt: 'The saved route Champ de Mars loop, tagged Paris: 2.4 km, about 33 minutes at Walk, 4.3 km/h. Walk, Run, Bike and Custom buttons sit above Advanced settings, a Stop automatically after setting and a Start route button.',
    hotspots: [
      {
        title: 'Your route',
        body: 'Saved with a name and tags. GPX files import straight onto the map.',
        rect: [15, 27, 62, 26],
      },
      {
        title: 'Distance and time',
        body: 'Length and duration at the chosen pace, before you commit.',
        rect: [5.8, 62.8, 88.3, 2.8],
      },
      { title: 'Pace', body: 'Walk, Run, Bike or a custom speed.', rect: [5.8, 66.2, 88.3, 5.4] },
      {
        title: 'Advanced settings',
        body: 'One-way or round trip, the number of laps, and whether to stay at the end or stop mocking.',
        rect: [5.8, 74.2, 88.3, 5.4],
      },
    ],
  },
  {
    id: 'follow',
    mobileCrop: [25, 85],
    title: 'Follow it exactly',
    body: 'The position follows the line you drew, not an approximation of it. What you have covered and what is left look different on the map.',
    image: routeRunningLight,
    dark: routeRunningDark,
    alt: 'The Champ de Mars loop being run at 10.1 km/h. The covered part from the start is a solid line, the rest is dashed.',
    hotspots: [
      { title: 'Covered', body: 'The part of the route behind you.', rect: [37, 26, 25, 18] },
      { title: 'Still to go', body: 'The rest of the lap, dashed.', rect: [15, 44, 70, 23] },
      { title: 'Status', body: 'Running, with the current speed.', rect: [32, 76.2, 37, 4] },
    ],
  },
  {
    id: 'detour',
    mobileCrop: [20, 65],
    title: 'Wander off, then come back',
    body: 'Nudge the joystick in the middle of a route and you are on a detour. The route remembers exactly where you left it.',
    image: detourLight,
    dark: detourDark,
    alt: 'A route paused on a detour: the position has been steered off the Champ de Mars loop, the joystick panel reads On a detour and shows a Back on route button, and the status reads Off route.',
    hotspots: [
      {
        title: 'On a detour',
        body: 'Following pauses, while the lap and progress are kept.',
        rect: [43.5, 36.6, 36.4, 2.8],
      },
      {
        title: 'Off the route',
        body: 'The joystick is steering now, not the route.',
        rect: [86, 55.3, 6.5, 3.5],
      },
      {
        title: 'Back on route',
        body: 'Returns to the point where you left and carries on at the same pace.',
        rect: [46, 49.2, 33, 4.6],
      },
    ],
  },
];
