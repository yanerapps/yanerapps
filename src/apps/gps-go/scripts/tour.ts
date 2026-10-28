import { spotlight } from './spotlight';
import { at } from '../../../lib/at';

/**
 * Sticky-phone tour. On wide screens the chapter crossing the middle of the viewport picks the
 * screenshot, and the callout crossing it picks the highlighted part; hovering, focusing or pressing
 * a callout (or tapping a marker) overrides that. Narrow screens use each chapter's inline phone.
 */
export function initTour() {
  document.querySelectorAll<HTMLElement>('[data-tour]').forEach(initOne);
}

function initOne(root: HTMLElement) {
  const list = root.querySelector('[data-chapters]') as HTMLElement;
  const chapters = [...root.querySelectorAll<HTMLElement>('[data-chapter]')];
  const frames = [...root.querySelectorAll<HTMLElement>('[data-frame]')];
  const stage = frames.map((f) => spotlight(f.querySelector('[data-spots]') as HTMLElement));
  const inline = chapters.map((c) => spotlight(c.querySelector('[data-spots]') as HTMLElement));
  const buttons = chapters.map((c) => [...c.querySelectorAll<HTMLButtonElement>('[data-spot]')]);
  const callouts = [...root.querySelectorAll<HTMLElement>('[data-callout]')];
  const wide = matchMedia('(min-width: 1024px)');

  const scrolled: number[] = chapters.map(() => -1);
  const pinned: number[] = chapters.map(() => -1);
  const preview: number[] = chapters.map(() => -1);
  let active = 0;

  const resolve = (c: number) =>
    at(preview, c) >= 0
      ? at(preview, c)
      : at(pinned, c) >= 0
        ? at(pinned, c)
        : wide.matches
          ? at(scrolled, c)
          : -1;

  const render = (c: number) => {
    const spot = resolve(c);
    at(wide.matches ? stage : inline, c).show(spot);
    at(buttons, c).forEach((b, i) => b.setAttribute('aria-pressed', String(i === pinned[c])));
    at(buttons, c).forEach((b, i) => b.toggleAttribute('data-lit', i === spot));
  };

  const setChapter = (c: number) => {
    if (c === active) return;
    active = c;
    chapters.forEach((el, i) => {
      el.toggleAttribute('data-active', i === c);
      el.toggleAttribute('data-passed', i < c);
    });
    frames.forEach((f, i) => {
      f.setAttribute('aria-hidden', String(i !== c));
      f.toggleAttribute('data-shown', i === c);
    });
    render(c);
  };

  const center = { rootMargin: '-50% 0px -50% 0px' };
  const chapterObserver = new IntersectionObserver((entries) => {
    for (const e of entries)
      if (e.isIntersecting && wide.matches) setChapter(chapters.indexOf(e.target as HTMLElement));
  }, center);
  chapters.forEach((c) => chapterObserver.observe(c));

  const calloutObserver = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const li = e.target as HTMLElement;
      const c = chapters.indexOf(li.closest('[data-chapter]') as HTMLElement);
      scrolled[c] = Number(li.dataset.callout);
      render(c);
    }
  }, center);
  callouts.forEach((li) => calloutObserver.observe(li));

  const press = (c: number, i: number) => {
    pinned[c] = pinned[c] === i ? -1 : i;
    render(c);
  };

  buttons.forEach((group, c) =>
    group.forEach((button, i) => {
      button.addEventListener('click', () => press(c, i));
      const on = () => {
        preview[c] = i;
        render(c);
      };
      const off = () => {
        preview[c] = -1;
        render(c);
      };
      button.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && on());
      button.addEventListener('pointerleave', off);
      button.addEventListener('focus', on);
      button.addEventListener('blur', off);
    }),
  );

  [stage, inline].forEach((set) =>
    set.forEach((s, c) =>
      s.markers.forEach((m, i) => m.addEventListener('click', () => press(c, i))),
    ),
  );

  // Progress runs from the list's top reaching mid-viewport to its bottom leaving it.
  const progress = () => {
    const { top, height } = list.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight / 2 - top) / height));
    root.style.setProperty('--progress', p.toFixed(4));
  };
  addEventListener('scroll', progress, { passive: true });
  addEventListener('resize', progress);
  progress();

  wide.addEventListener('change', () => {
    stage.forEach((s) => s.show(-1));
    inline.forEach((s) => s.show(-1));
    render(active);
    // Observing again reports the current intersections at once, so the sticky phone catches up.
    const reobserve = (observer: IntersectionObserver, targets: Element[]) =>
      targets.forEach((t) => {
        observer.unobserve(t);
        observer.observe(t);
      });
    reobserve(chapterObserver, chapters);
    reobserve(calloutObserver, callouts);
  });

  at(chapters, 0).setAttribute('data-active', '');
  render(0);
}
