// Switch the insights page between intakes.
const buttons = [...document.querySelectorAll('.segmented [data-year]')];
const panels = [...document.querySelectorAll('[data-year-panel]')];

function show(year) {
  buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.year === year)));
  panels.forEach(p => { p.hidden = p.dataset.yearPanel !== year; });
}
buttons.forEach(button => button.addEventListener('click', () => {
  show(button.dataset.year);
  history.replaceState(null, '', '#' + button.dataset.year.replace('/', '-'));
}));
const fromHash = location.hash.slice(1).replace('-', '/');
if (buttons.some(b => b.dataset.year === fromHash)) show(fromHash);
