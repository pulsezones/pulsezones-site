(() => {
  const config = document.querySelector('script[data-language-selector]');
  if (!config) return;
  const supported = config.dataset.supportedLanguages.split(',');
  const key = 'pulsezones.language';
  const lifetime = 90 * 24 * 60 * 60 * 1000;

  // Only an explicit language choice is stored, never a detected language.
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[data-language]');
    if (!link || !supported.includes(link.dataset.language)) return;
    try {
      localStorage.setItem(key, JSON.stringify({
        language: link.dataset.language,
        expiresAt: Date.now() + lifetime
      }));
    } catch { /* Language links also work when storage is unavailable. */ }
  });

  // Direct language URLs always keep their language.
  if (config.dataset.autoLanguage !== 'true') return;

  let chosen;
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved && supported.includes(saved.language) && saved.expiresAt > Date.now()) {
      chosen = saved.language;
    } else if (saved) {
      localStorage.removeItem(key);
    }
  } catch { /* Use the browser preferences instead. */ }

  if (!chosen) {
    for (const preference of navigator.languages?.length ? navigator.languages : [navigator.language]) {
      const tag = String(preference || '').toLowerCase().replaceAll('_', '-');
      const primary = tag.split('-')[0];
      const match = supported.find(code => code === tag)
        || supported.find(code => code.split('-')[0] === primary);
      if (match) { chosen = match; break; }
    }
  }

  const link = document.querySelector(`a[data-language="${chosen || 'en'}"]`);
  if (!link) return;
  const target = new URL(link.href);
  if (target.protocol !== 'file:') target.pathname = target.pathname.replace(/index\.html$/, '');
  target.search = location.search;
  target.hash = location.hash;
  location.replace(target.href);
})();
