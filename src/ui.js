// String templates shared by the static build and the browser.
import {STATUS, pluralise} from './model.js';

export const SERIES = {places: '#008c99', firstChoice: '#e0703f'};
export const STATUS_COLOURS = {oversubscribed: '#cf4b35', full: '#d99a17', spaces: '#1f9a6a', none: '#9aa9b4'};
const STATUS_ICON = {oversubscribed: '!', full: '●', spaces: '✓', none: '–'};

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[ch]);
}

export function num(value) {
  return value === null || value === undefined ? '–' : Number(value).toLocaleString('en-GB');
}

export function ratio(value) {
  return value === null || value === undefined ? '–' : value.toFixed(2).replace(/0$/, '');
}

export function badge(status, extra = '') {
  const info = STATUS[status] || STATUS.none;
  return `<span class="badge badge-${info.tone} ${extra}" title="${esc(info.text)}"><span class="badge-icon" aria-hidden="true">${STATUS_ICON[status] || '–'}</span>${esc(info.label)}</span>`;
}

/** A small single-series line of first-choice applicants per place across intakes. */
export function sparkline(points, label) {
  const values = points.map(p => p && p.demand !== null ? p.demand : null);
  const valid = values.filter(v => v !== null);
  if (valid.length < 2) return '';
  const w = 84, h = 28, pad = 4;
  const max = Math.max(1.2, ...valid);
  const x = i => pad + i * ((w - pad * 2) / (values.length - 1));
  const y = v => h - pad - (v / max) * (h - pad * 2);
  const coords = values.map((v, i) => v === null ? null : [x(i), y(v)]);
  const path = coords.filter(Boolean).map((c, i) => (i ? 'L' : 'M') + c[0].toFixed(1) + ' ' + c[1].toFixed(1)).join(' ');
  const last = coords.filter(Boolean).at(-1);
  const one = y(1).toFixed(1);
  return `<svg class="sparkline" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title>` +
    `<line x1="${pad}" x2="${w - pad}" y1="${one}" y2="${one}" class="spark-ref"/>` +
    `<path d="${path}" class="spark-line"/><circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="3.5" class="spark-dot"/></svg>`;
}

export function trendLabel(points) {
  const valid = points.filter(p => p && p.demand !== null);
  if (valid.length < 2) return 'Not enough history for a trend';
  return 'First-choice applicants per place: ' + valid.map(p => p.year + ' ' + ratio(p.demand)).join(', ');
}

/** A directory card. `href` is the setting page, `points` the summaries for every intake. */
export function settingCard(school, latest, points, href, {headingLevel = 3} = {}) {
  const s = latest;
  const h = 'h' + headingLevel;
  const stats = s ? `
      <div class="mini-stat"><strong>${num(s.places)}</strong><span>places</span></div>
      <div class="mini-stat"><strong>${num(s.firstChoice)}</strong><span>first choices</span></div>
      <div class="mini-stat"><strong>${num(s.placesLeft)}</strong><span>left after Stage 2</span></div>` : '<p class="muted">No record for this intake.</p>';
  return `<article class="setting-card" data-id="${esc(school.id)}">
    <div class="setting-card-head">
      <div>
        <${h} class="setting-name"><a href="${esc(href)}">${esc(school.name)}</a></${h}>
        <p class="setting-meta">${esc(school.area)} · ${esc(school.management)}</p>
      </div>
      ${s ? badge(s.status) : ''}
    </div>
    <div class="setting-card-body">
      <div class="mini-stats">${stats}</div>
      <div class="setting-trend">${sparkline(points, trendLabel(points))}<span class="trend-caption">demand trend</span></div>
    </div>
    <div class="setting-card-foot">
      <span class="setting-note">${s && s.hasTarget ? esc(STATUS[s.status].short) : ''}</span>
      <button type="button" class="btn btn-small add-btn" data-add="${esc(school.id)}" data-name="${esc(school.name)}">+ Shortlist</button>
    </div>
  </article>`;
}

/** A segmented bar showing how many settings fell in each status. */
export function statusBar(counts, caption) {
  const order = ['oversubscribed', 'full', 'spaces'];
  const total = order.reduce((sum, key) => sum + (counts[key] || 0), 0) || 1;
  const segments = order.filter(key => counts[key]).map(key =>
    `<span class="seg" style="flex-grow:${counts[key]};background:${STATUS_COLOURS[key]}" title="${esc(STATUS[key].label)}: ${counts[key]} settings"></span>`).join('');
  const legend = order.map(key => `<li><span class="swatch" style="background:${STATUS_COLOURS[key]}"></span><strong>${counts[key] || 0}</strong> ${esc(STATUS[key].label.toLowerCase())} <span class="muted">(${Math.round(100 * (counts[key] || 0) / total)}%)</span></li>`).join('');
  return `<figure class="status-figure"><div class="status-bar" role="img" aria-label="${esc(caption)}">${segments}</div><ul class="status-legend">${legend}</ul></figure>`;
}

/** Grouped columns: places vs first-choice target-age applicants for each intake. */
export function historyChart(points, name) {
  const valid = points.filter(Boolean);
  if (!valid.length) return '';
  const max = Math.max(1, ...valid.flatMap(p => [p.places, p.firstChoice]));
  const w = 380, h = 200, top = 24, bottom = 36, left = 8;
  const band = (w - left * 2) / points.length;
  const bar = Math.min(24, band / 4);
  const scale = v => (v / max) * (h - top - bottom);
  const base = h - bottom;
  const column = (x, v, colour, label) => {
    const height = Math.max(scale(v), v > 0 ? 2 : 0);
    const r = Math.min(4, height);
    const yTop = base - height;
    const shape = height > 0
      ? `<path d="M${x} ${base} V${yTop + r} Q${x} ${yTop} ${x + r} ${yTop} H${x + bar - r} Q${x + bar} ${yTop} ${x + bar} ${yTop + r} V${base} Z" fill="${colour}"><title>${esc(label)}</title></path>`
      : '';
    return shape + `<text x="${x + bar / 2}" y="${yTop - 6}" class="chart-value" text-anchor="middle">${num(v)}</text>`;
  };
  let marks = '';
  points.forEach((p, i) => {
    const cx = left + band * i + band / 2;
    if (p) {
      marks += column(cx - bar - 1, p.places, SERIES.places, `${p.year}: ${p.places} places`);
      marks += column(cx + 1, p.firstChoice, SERIES.firstChoice, `${p.year}: ${p.firstChoice} first-choice target-age applicants`);
    }
    marks += `<text x="${cx}" y="${h - 14}" class="chart-axis" text-anchor="middle">${esc(p ? p.year : '')}</text>`;
  });
  return `<figure class="history-chart">
    <ul class="chart-legend"><li><span class="swatch" style="background:${SERIES.places}"></span>Funded places</li><li><span class="swatch" style="background:${SERIES.firstChoice}"></span>Target-age children who chose it first</li></ul>
    <svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(`Places and first-choice applicants at ${name} by intake`)}">
      <line x1="${left}" x2="${w - left}" y1="${base}" y2="${base}" class="chart-baseline"/>${marks}
    </svg>
  </figure>`;
}

/** Horizontal bars for a ranked list. rows: [{label, href, value, display, note}] */
export function barList(rows, {colour = SERIES.firstChoice, max} = {}) {
  const top = max ?? Math.max(1, ...rows.map(r => r.value));
  return `<ol class="bar-list">${rows.map(r => `<li>
    <div class="bar-label">${r.href ? `<a href="${esc(r.href)}">${esc(r.label)}</a>` : esc(r.label)}${r.note ? `<span class="muted"> · ${esc(r.note)}</span>` : ''}</div>
    <div class="bar-track"><span class="bar-fill" style="width:${Math.max(1.5, (100 * r.value) / top).toFixed(1)}%;background:${colour}"></span></div>
    <div class="bar-value">${esc(r.display ?? num(r.value))}</div>
  </li>`).join('')}</ol>`;
}

export function rankCells(counts) {
  return counts.map((n, i) => `<td class="${i === 4 ? 'total' : ''}">${num(n)}</td>`).join('');
}

export {pluralise};
