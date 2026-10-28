import type { Rect } from '../data/tour';
import { at } from '../../../lib/at';

const PAD_PX = 6;

/** Drives one Hotspots overlay: moves the spotlight between rects and marks the active marker. */
export function spotlight(spots: HTMLElement) {
  const light = spots.querySelector('[data-light]') as HTMLElement;
  const markers = [...spots.querySelectorAll<HTMLElement>('[data-marker]')];
  const rects: Rect[] = JSON.parse(spots.dataset.rects ?? '[]');
  let current = -1;

  const apply = ([x, y, w, h]: Rect) => {
    light.style.translate = `calc(${x}cqw - ${PAD_PX}px) calc(${y}cqh - ${PAD_PX}px)`;
    light.style.width = `calc(${w}cqw + ${2 * PAD_PX}px)`;
    light.style.height = `calc(${h}cqh + ${2 * PAD_PX}px)`;
  };

  return {
    markers,
    get current() {
      return current;
    },
    show(index: number) {
      if (index === current) return;
      const wasHidden = current < 0;
      current = index;
      markers.forEach((m, i) => m.toggleAttribute('data-active', i === index));
      if (index < 0) {
        light.style.opacity = '0';
        return;
      }
      // Appearing from hidden jumps straight to the part; only moves between parts glide.
      light.toggleAttribute('data-jump', wasHidden);
      apply(at(rects, index));
      light.getBoundingClientRect();
      light.removeAttribute('data-jump');
      light.style.opacity = '1';
    },
  };
}
