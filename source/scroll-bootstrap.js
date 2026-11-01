if (new URLSearchParams(location.search).has('view')) {
  document.documentElement.setAttribute('data-scroll-restore', '');
  history.scrollRestoration = 'manual';
  window.scrollRestoreFallback = setTimeout(() => {
    document.documentElement.removeAttribute('data-scroll-restore');
    history.scrollRestoration = 'auto';
  }, 1800);
}
