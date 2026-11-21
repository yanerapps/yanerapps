import { spotlight } from './spotlight';
import { at } from '../../../lib/at';

export function initAnatomy() {
  const root = document.querySelector<HTMLElement>('[data-anatomy]');
  if (!root) return;
  const spots = spotlight(root.querySelector('[data-spots]') as HTMLElement);
  const details = [...root.querySelectorAll<HTMLElement>('[data-detail]')];
  let current = Number(root.dataset.initial);

  const hideClosed = (activeIndex: number) => {
    details.forEach((detail, index) => {
      if (index === activeIndex) {
        detail.setAttribute('data-open', '');
        detail.removeAttribute('hidden');
      } else {
        detail.removeAttribute('data-open');
        detail.setAttribute('hidden', 'until-found');
      }
    });
  };

  hideClosed(current);

  const select = (i: number) => {
    if (i !== current) {
      hideClosed(i);
      current = i;
    }
    spots.markers.forEach((marker, index) =>
      marker.setAttribute('aria-pressed', String(index === i)),
    );
    spots.show(i);
  };

  details.forEach((detail, i) => {
    detail.addEventListener('beforematch', () => select(i));
  });

  spots.markers.forEach((marker, i) => {
    marker.addEventListener('click', () => select(i));
    marker.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'mouse') select(i);
    });
  });

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
