export type Theme = 'light' | 'dark';

const key = 'theme';
const system = matchMedia('(prefers-color-scheme: dark)');
const systemTheme = (): Theme => (system.matches ? 'dark' : 'light');
const parse = (value: string | null): Theme | null =>
  value === 'light' || value === 'dark' ? value : null;

/**
 * Keeps `data-theme` on <html> set to the stored choice or, without one, the system theme, and turns
 * every `[data-theme-toggle]` into a switch. Only a choice that differs from the system is stored, so
 * switching back to the system theme follows it again. `onApply` lets a page sync its own UI.
 */
export function initTheme(onApply?: (theme: Theme) => void) {
  let choice: Theme | null = null;
  try {
    choice = parse(localStorage.getItem(key));
  } catch {
    // Without storage the choice lasts for this page.
  }
  const apply = () => {
    const theme = choice ?? systemTheme();
    document.documentElement.dataset.theme = theme;
    onApply?.(theme);
  };
  apply();
  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element) || !event.target.closest('[data-theme-toggle]')) return;
    const next: Theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    choice = next === systemTheme() ? null : next;
    try {
      if (choice) localStorage.setItem(key, choice);
      else localStorage.removeItem(key);
    } catch {
      // The in-memory choice is enough.
    }
    apply();
  });
  system.addEventListener('change', () => {
    if (!choice) apply();
  });
  addEventListener('storage', (event) => {
    if (event.key !== key && event.key !== null) return;
    choice = parse(event.newValue);
    apply();
  });
}
