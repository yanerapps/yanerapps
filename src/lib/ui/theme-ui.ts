import { initTheme } from '../theme';

const toggle = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
initTheme((theme) => {
  toggle?.setAttribute('aria-pressed', String(theme === 'dark'));
  if (toggle) toggle.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#08090b' : '#f6f7f9');
});
