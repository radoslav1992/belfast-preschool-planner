import {esc} from '../ui.js';
import {SITE_NAME, OFFICIAL} from './content.mjs';

export const NAV = [
  ['settings/', 'Find a setting', 'settings'],
  ['planner/', 'My planner', 'planner'],
  ['insights/', 'Insights', 'insights'],
  ['guide/', 'Guide', 'guide'],
  ['faq/', 'FAQ', 'faq'],
  ['about/', 'About the data', 'about']
];

const brandMark = '<span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 11 12 4l8.5 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/></svg></span>';

export function makeLayout({base, siteUrl, builtAt}) {
  const href = path => base + path.replace(/^\//, '');
  return function layout({title, description, path = '', active = '', body, scripts = [], jsonld = [], noindex = false, crumbs = []}) {
    const canonical = siteUrl ? siteUrl.replace(/\/$/, '') + base + path : '';
    const image = siteUrl ? siteUrl.replace(/\/$/, '') + href('images/kindergarten-play.webp') : '';
    const breadcrumb = crumbs.length ? {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [['Home', ''], ...crumbs].map(([name, p], i) => ({
        '@type': 'ListItem', position: i + 1, name, ...(siteUrl ? {item: siteUrl.replace(/\/$/, '') + base + p} : {})
      }))
    } : null;
    const ld = [...jsonld, ...(breadcrumb ? [breadcrumb] : [])];
    return `<!doctype html>
<html lang="en-GB" data-base="${esc(base)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="${noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'}">
<meta name="theme-color" content="#087f8c">
<meta name="geo.region" content="GB-BFS">
<meta name="geo.placename" content="Belfast">
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
<link rel="icon" type="image/svg+xml" href="${href('favicon.svg')}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:locale" content="en_GB">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
${canonical ? `<meta property="og:url" content="${esc(canonical)}">` : ''}
${image ? `<meta property="og:image" content="${esc(image)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="800"><meta property="og:image:alt" content="Children playing outside a sunny nursery"><meta name="twitter:card" content="summary_large_image">` : ''}
<link rel="stylesheet" href="${href('assets/style.css')}">
${ld.map(item => `<script type="application/ld+json">${JSON.stringify(item).replace(/</g, '\\u003c')}</script>`).join('\n')}
<script type="module" src="${href('assets/app.js')}"></script>
${scripts.map(name => `<script type="module" src="${href('assets/' + name)}"></script>`).join('\n')}
</head>
<body>
<a href="#main-content" class="skip-link">Skip to content</a>
<header class="site-header">
  <a href="${href('')}" class="logo">${brandMark}<span>Belfast <span class="logo-soft">Preschool Planner</span></span></a>
  <button class="hamburger" id="hamburger" type="button" aria-label="Menu" aria-expanded="false" aria-controls="nav-links">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
  </button>
  <nav aria-label="Main navigation">
    <ul class="nav-links" id="nav-links">
      ${NAV.map(([p, label, key]) => `<li><a href="${href(p)}"${key === active ? ' class="active" aria-current="page"' : ''}>${label}${key === 'planner' ? ' <span class="nav-count" data-shortlist-count hidden>0</span>' : ''}</a></li>`).join('\n      ')}
    </ul>
  </nav>
</header>
${crumbs.length ? `<nav class="breadcrumbs" aria-label="Breadcrumb"><ol><li><a href="${href('')}">Home</a></li>${crumbs.map(([name, p], i) => i === crumbs.length - 1 ? `<li aria-current="page">${esc(name)}</li>` : `<li><a href="${href(p)}">${esc(name)}</a></li>`).join('')}</ol></nav>` : ''}
<main id="main-content">
${body}
</main>
<div class="toast" id="toast" role="status" aria-live="polite" hidden></div>
<footer class="site-footer">
  <div class="footer-content">
    <div>
      <div class="footer-brand">${brandMark}<span>${SITE_NAME}</span></div>
      <p class="footer-text">Independent planning help for funded preschool places in Belfast. Not affiliated with the Education Authority or the Department of Education.</p>
    </div>
    <div class="footer-contact">
      <div class="footer-contact-label">Ready to apply or need official advice?</div>
      <a href="${OFFICIAL.admissions}" class="footer-email" rel="noopener">Education Authority admissions <span aria-hidden="true">↗</span></a>
    </div>
  </div>
  <nav class="footer-nav" aria-label="Footer navigation">
    <a href="${href('settings/')}">All Belfast settings</a>
    <a href="${href('planner/')}">My planner</a>
    <a href="${href('insights/')}">Demand insights</a>
    <a href="${href('guide/')}">How admissions work</a>
    <a href="${href('guide/#age-check')}">Age group checker</a>
    <a href="${href('faq/')}">Questions</a>
    <a href="${href('about/')}">About the data</a>
  </nav>
  <div class="footer-copyright">Figures: Education Authority end-of-Stage-2 workbooks. Site built ${esc(builtAt)}. Historical figures do not predict an individual offer.</div>
</footer>
</body>
</html>
`;
  };
}
