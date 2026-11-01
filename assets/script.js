const zoneColors = ["#aeb6bd", "#76bddb", "#8dc884", "#e1b95e", "#e8899a"];
const zoneLabel = document.documentElement.dataset.zoneLabel || 'Zone';

function renderZones() {
  const ageInput = document.querySelector("#age");
  const restInput = document.querySelector("#resting");
  const resultNode = document.querySelector("#zone-results");
  if (!ageInput || !restInput || !resultNode) return;

  const age = Math.min(100, Math.max(10, Number(ageInput.value) || 35));
  const resting = Math.min(120, Math.max(35, Number(restInput.value) || 60));
  const maximum = Math.min(240, Math.max(100, 220 - age));
  const method = document.querySelector('input[name="method"]:checked')?.value || "standard";
  document.querySelector("#resting-field").hidden = method !== "karvonen";
  restInput.disabled = method !== "karvonen";
  const percentages = [0.5, 0.6, 0.7, 0.8, 0.9];
  const reserve = maximum - resting;
  const starts = percentages.map((percentage) => Math.ceil(method === "karvonen" ? resting + reserve * percentage : maximum * percentage));

  document.querySelector("#max-heart-rate").textContent = String(maximum);
  resultNode.innerHTML = starts.map((start, index) => {
    const end = index === 4 ? maximum : starts[index + 1] - 1;
    return `<div class="result-row"><span>${zoneLabel} ${index + 1}</span><span class="result-track"><i style="background:${zoneColors[index]}"></i></span><span class="result-value">${start}–${end}</span></div>`;
  }).join("");
}

document.querySelector("#zone-calculator")?.addEventListener("input", renderZones);
renderZones();

// Capture what is actually on screen, rather than an old navigation hash.
document.querySelectorAll('[data-language]').forEach(link => {
  link.addEventListener('click', () => {
    const next = new URL(link.href);
    next.hash = '';
    const sections = [...document.querySelectorAll('main section[id]')];
    const header = document.querySelector('.site-header');
    const inset = getComputedStyle(header).position === 'sticky' ? header.getBoundingClientRect().height : 0;
    const readingY = window.scrollY + inset;
    const section = sections.filter(item => item.getBoundingClientRect().top + window.scrollY <= readingY + 1).at(-1) || sections[0];
    if (section) {
      const top = section.getBoundingClientRect().top + window.scrollY;
      next.searchParams.set('view', section.id);
      next.searchParams.set('progress', String(window.scrollY < 2 ? 0 : Math.max(0, Math.min(1, (readingY - top) / section.getBoundingClientRect().height))));
    }
    link.href = next.href;
  });
});

// The head bootstrap suppresses the first paint until this position is restored.
if (document.documentElement.hasAttribute('data-scroll-restore')) {
  const params = new URLSearchParams(location.search);
  const section = document.getElementById(params.get('view'));
  const progress = Number(params.get('progress'));
  const restore = () => {
    if (section && Number.isFinite(progress)) {
      const header = document.querySelector('.site-header');
      const inset = getComputedStyle(header).position === 'sticky' ? header.getBoundingClientRect().height : 0;
      const top = section.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({top: Math.max(0, top + Math.max(0, Math.min(1, progress)) * section.getBoundingClientRect().height - inset), behavior: 'instant'});
    }
    const clean = new URL(location.href);
    clean.searchParams.delete('view');
    clean.searchParams.delete('progress');
    try { history.replaceState(history.state, '', clean.href); } catch {}
    clearTimeout(window.scrollRestoreFallback);
    document.documentElement.removeAttribute('data-scroll-restore');
    history.scrollRestoration = 'auto';
  };
  requestAnimationFrame(() => requestAnimationFrame(restore));
}

document.addEventListener('click', event => {
  document.querySelectorAll('.language-switch[open]').forEach(menu => {
    if (!menu.contains(event.target)) menu.open = false;
  });
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  document.querySelectorAll('.language-switch[open]').forEach(menu => {
    menu.open = false;
    menu.querySelector('summary').focus();
  });
});
