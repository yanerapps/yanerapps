export type Box = { x: number; y: number; width: number; height: number };

/** Place each junction between its card and the nearest provider edge. */
export function providerJunctions(
  start: Box,
  end: Box,
  providers: readonly Box[],
  vertical: boolean,
) {
  const min = vertical
    ? Math.min(...providers.map((p) => p.y))
    : Math.min(...providers.map((p) => p.x));
  const max = vertical
    ? Math.max(...providers.map((p) => p.y + p.height))
    : Math.max(...providers.map((p) => p.x + p.width));
  return vertical
    ? {
        fork: {
          x: start.x + start.width / 2,
          y: start.y + start.height + (min - start.y - start.height) / 4,
        },
        merge: { x: end.x + end.width / 2, y: end.y - (end.y - max) / 4 },
      }
    : {
        fork: {
          x: start.x + start.width + (min - start.x - start.width) / 4,
          y: start.y + start.height / 2,
        },
        merge: { x: end.x - (end.x - max) / 4, y: end.y + end.height / 2 },
      };
}
