import { at } from '../../../lib/at';
/** Static rounded buses, sized from the actual card edges; no animation clock. */
export function connectProviders() {
  const flow = document.querySelector<HTMLElement>('[data-provider-flow]');
  const wires = flow?.querySelector<SVGSVGElement>('[data-flow-wires]');
  const source = flow?.querySelector<HTMLElement>('[data-flow-source]');
  const target = flow?.querySelector<HTMLElement>('[data-flow-target]');
  const sinks = flow?.querySelector<HTMLElement>('[data-flow-sinks]');
  const providers = [...(flow?.querySelectorAll<HTMLElement>('[data-flow-provider]') ?? [])];
  if (!flow || !wires || !source || !target || !sinks || !providers.length) return;

  type Point = readonly [number, number];
  const vertical = matchMedia('(max-width: 860px)');

  function roundedPath(points: readonly Point[]) {
    const [x0, y0] = at(points, 0);
    let path = `M${x0},${y0}`;
    for (let i = 1; i < points.length - 1; i++) {
      const previous = at(points, i - 1),
        corner = at(points, i),
        next = at(points, i + 1);
      const before = Math.hypot(corner[0] - previous[0], corner[1] - previous[1]);
      const after = Math.hypot(next[0] - corner[0], next[1] - corner[1]);
      if (!before || !after) continue;
      const radius = Math.min(16, before / 2, after / 2);
      const entry = [
        corner[0] + ((previous[0] - corner[0]) * radius) / before,
        corner[1] + ((previous[1] - corner[1]) * radius) / before,
      ];
      const exit = [
        corner[0] + ((next[0] - corner[0]) * radius) / after,
        corner[1] + ((next[1] - corner[1]) * radius) / after,
      ];
      path += ` L${entry[0]},${entry[1]} Q${corner[0]},${corner[1]} ${exit[0]},${exit[1]}`;
    }
    const [x, y] = points.at(-1) as Point;
    return `${path} L${x},${y}`;
  }

  const diagram = flow,
    svg = wires,
    from = source,
    to = target,
    group = sinks;
  function draw() {
    const frame = diagram.getBoundingClientRect();
    if (!frame.width || !frame.height) return;
    const port = (node: HTMLElement, outgoing: boolean): Point => {
      const rect = node.getBoundingClientRect();
      return vertical.matches
        ? [rect.left - frame.left + rect.width / 2, (outgoing ? rect.bottom : rect.top) - frame.top]
        : [
            (outgoing ? rect.right : rect.left) - frame.left,
            rect.top - frame.top + rect.height / 2,
          ];
    };
    const start = port(from, true),
      end = port(to, false);
    const incoming = port(group, false),
      outgoing = port(group, true);
    const fork: Point = vertical.matches
      ? [start[0], start[1] + (incoming[1] - start[1]) / 4]
      : [start[0] + (incoming[0] - start[0]) / 4, start[1]];
    const merge: Point = vertical.matches
      ? [end[0], end[1] - (end[1] - outgoing[1]) / 4]
      : [end[0] - (end[0] - outgoing[0]) / 4, end[1]];
    const paths = [roundedPath([start, fork]), roundedPath([merge, end])];
    providers.forEach((node) => {
      const entry = port(node, false),
        exit = port(node, true);
      if (vertical.matches) {
        const inputRail = (fork[1] + entry[1]) / 2;
        const outputRail = (exit[1] + merge[1]) / 2;
        paths.push(roundedPath([fork, [fork[0], inputRail], [entry[0], inputRail], entry]));
        paths.push(roundedPath([exit, [exit[0], outputRail], [merge[0], outputRail], merge]));
      } else {
        const inputRail = (fork[0] + entry[0]) / 2;
        const outputRail = (exit[0] + merge[0]) / 2;
        paths.push(roundedPath([fork, [inputRail, fork[1]], [inputRail, entry[1]], entry]));
        paths.push(roundedPath([exit, [outputRail, exit[1]], [outputRail, merge[1]], merge]));
      }
    });
    svg.setAttribute('viewBox', `0 0 ${frame.width} ${frame.height}`);
    svg.replaceChildren(
      ...paths.map((d) => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d);
        return path;
      }),
    );
  }

  // Recalculate geometry only on layout changes, including font loading.
  const observer = new ResizeObserver(draw);
  [diagram, from, to, group, ...providers].forEach((node) => observer.observe(node));
  vertical.addEventListener('change', draw);
  document.fonts.ready.then(draw);
  draw();
}
