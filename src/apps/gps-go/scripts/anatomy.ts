import { spotlight } from './spotlight';
import { at } from '../../../lib/at';

export function initAnatomy() {
  const root = document.querySelector<HTMLElement>('[data-anatomy]');
  if (!root) return;
  const spots = spotlight(root.querySelector('[data-spots]') as HTMLElement);
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-part]')];
  const details = [...root.querySelectorAll<HTMLElement>('[data-detail]')];
  let current = Number(root.dataset.initial);

  const select = (i: number) => {
    if (i !== current) {
      at(details, current).removeAttribute('data-open');
      at(details, i).setAttribute('data-open', '');
      current = i;
    }
    buttons.forEach((b, bi) => b.setAttribute('aria-pressed', String(bi === i)));
    spots.show(i);
  };

  buttons.forEach((button, i) => {
    button.addEventListener('click', () => select(i));
    button.addEventListener('keydown', (e) => {
      const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      const next = (i + step + buttons.length) % buttons.length;
      select(next);
      at(buttons, next).focus();
    });
  });
  spots.markers.forEach((m, i) => m.addEventListener('click', () => select(i)));

  const observer = new IntersectionObserver(
    (entries) => {
      if (!at(entries, 0).isIntersecting) return;
      spots.show(current);
      observer.disconnect();
    },
    { threshold: 0.3 },
  );
  observer.observe(root);
}
