(() => {
  const notice = document.querySelector('[data-privacy-notice]');
  if (!notice) return;
  const key = 'pulsezones.privacyNotice';
  const version = 1;
  const lifetime = 90 * 24 * 60 * 60 * 1000;
  let acknowledged = false;
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    acknowledged = saved?.version === version && saved.expiresAt > Date.now();
    if (saved && !acknowledged) localStorage.removeItem(key);
  } catch { /* A blocked browser store must not prevent dismissal. */ }
  notice.hidden = acknowledged;
  notice.querySelector('button').addEventListener('click', () => {
    notice.hidden = true;
    try {
      localStorage.setItem(key, JSON.stringify({version, expiresAt: Date.now() + lifetime}));
    } catch { /* Dismiss for this page even when persistence is unavailable. */ }
  });
})();
