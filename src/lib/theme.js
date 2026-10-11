// Light / dark theme. The choice ('light' | 'dark' | 'system') is a per-browser preference kept in
// localStorage; 'system' follows the operating system setting. The resolved theme is set as
// data-theme on <html> (index.html applies it before first paint to avoid a flash).
const KEY = 'agilemetrix-theme';
const media = () => window.matchMedia('(prefers-color-scheme: dark)');

export function getThemeChoice() {
  try {
    return localStorage.getItem(KEY) || 'light';
  } catch {
    return 'light';
  }
}

export const resolveTheme = (choice) => (choice === 'system' ? (media().matches ? 'dark' : 'light') : choice);

export function applyTheme(choice = getThemeChoice()) {
  document.documentElement.dataset.theme = resolveTheme(choice);
}

export function setThemeChoice(choice) {
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    // storage unavailable (private mode): the theme still applies for this visit
  }
  applyTheme(choice);
}

// Re-apply when the OS theme changes while 'system' is selected
export function watchSystemTheme() {
  const onChange = () => getThemeChoice() === 'system' && applyTheme('system');
  media().addEventListener('change', onChange);
  return () => media().removeEventListener('change', onChange);
}
