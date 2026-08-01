#!/usr/bin/env node
// Post-build SEO pass. Runs after `react-scripts build` (see the "build"
// script in package.json).
//
// Why this exists: this is a client-rendered SPA, so every route is served
// the same build/index.html. Left alone, Google sees ONE page — one title,
// one description, one canonical — no matter how many URLs exist, and the
// crawler has to execute the bundle before it sees any real content. This
// script writes a small static HTML file per public route, each carrying its
// own <title>, description, canonical, Open Graph tags, and JSON-LD, then
// points vercel.json's rewrites at them. The file still boots the same SPA,
// so nothing about the app changes — only what a crawler reads before the
// JavaScript runs.
//
// It also emits sitemap.xml and robots.txt from the same seo.json, so the
// list of indexable URLs is never maintained in three places.
const fs = require('fs');
const path = require('path');

const seo = require('../src/shared/seo.json');

const BUILD_DIR = path.join(__dirname, '..', 'build');
const SITE_URL = (process.env.SITE_URL || process.env.REACT_APP_SITE_URL || seo.siteUrl).replace(/\/$/, '');

const abs = (p) => `${SITE_URL}${p}`;
const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

// --- Structured data ---------------------------------------------------------
// Deliberately limited to facts the site actually states. No address, phone,
// founding date, or social profiles are invented here: structured data that
// contradicts reality is worse than none, and Google penalises it.

function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: seo.siteName,
    legalName: seo.legalName,
    alternateName: seo.shortName,
    url: `${SITE_URL}/`,
    logo: abs(seo.logoPath),
    image: abs(seo.ogImagePath),
    description: seo.defaultDescription,
    email: seo.supportEmail,
    areaServed: { '@type': 'Country', name: 'Nigeria' },
    knowsAbout: ['Skills training', 'Mentorship', 'Cooperative membership', 'Entrepreneurship'],
    contactPoint: [{
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: seo.supportEmail,
      areaServed: 'NG',
      availableLanguage: ['English'],
    }],
  };
}

function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: `${SITE_URL}/`,
    name: seo.siteName,
    description: seo.defaultDescription,
    inLanguage: 'en-NG',
    publisher: { '@id': `${SITE_URL}/#organization` },
  };
}

const SCHEMA_BUILDERS = { organization: organizationSchema, website: websiteSchema };

function schemaBlock(names = []) {
  return names
    .map((name) => SCHEMA_BUILDERS[name])
    .filter(Boolean)
    .map((build) => `<script type="application/ld+json">${JSON.stringify(build())}</script>`)
    .join('\n    ');
}

// --- HTML rewriting ----------------------------------------------------------

// Replaces the value of a meta tag already present in public/index.html.
// Matches on the identifying attribute so attribute order doesn't matter.
function setMeta(html, attr, name, content) {
  const re = new RegExp(`(<meta[^>]*${attr}=["']${name}["'][^>]*content=["'])[^"']*(["'])`, 'i');
  if (re.test(html)) return html.replace(re, `$1${escapeHtml(content)}$2`);
  // Not in the template (e.g. og:url) — add it.
  return html.replace('</head>', `  <meta ${attr}="${name}" content="${escapeHtml(content)}" />\n  </head>`);
}

// The template is build/index.html, which this script also REWRITES — so on
// a second run (npm run build:seo on an existing build) it would be reading
// its own output. Everything this script injects is therefore stripped from
// the template first, making repeated runs converge instead of stacking up
// duplicate canonicals and JSON-LD blocks. Two canonical links on a page is
// not a cosmetic problem: Google either ignores the pair or takes the first,
// which here would have pointed every sub-page at "/" and dropped them all
// from the index. (setMeta replaces in place, so meta tags need no stripping.)
function normalizeTemplate(html) {
  return html
    .replace(/[ \t]*<link[^>]*rel=["']canonical["'][^>]*>\s*\n?/gi, '')
    .replace(/[ \t]*<script type="application\/ld\+json">[\s\S]*?<\/script>\s*\n?/gi, '');
}

function setCanonical(html, href) {
  return html.replace('</head>', `  <link rel="canonical" href="${href}" />\n  </head>`);
}

function renderRoute(template, route) {
  const canonical = route.path === '/' ? `${SITE_URL}/` : abs(route.path);
  let html = template;

  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(route.title)}</title>`);
  html = setMeta(html, 'name', 'description', route.description);
  html = setMeta(html, 'property', 'og:title', route.title);
  html = setMeta(html, 'property', 'og:description', route.description);
  html = setMeta(html, 'property', 'og:url', canonical);
  html = setMeta(html, 'property', 'og:site_name', seo.siteName);
  html = setMeta(html, 'property', 'og:locale', seo.locale);
  html = setMeta(html, 'name', 'twitter:title', route.title);
  html = setMeta(html, 'name', 'twitter:description', route.description);
  if (route.keywords) html = setMeta(html, 'name', 'keywords', route.keywords);

  html = setCanonical(html, canonical);

  const schema = schemaBlock(route.schema);
  return schema ? html.replace('</head>', `  ${schema}\n  </head>`) : html;
}

// --- Sitemap + robots --------------------------------------------------------

function sitemap() {
  const today = new Date().toISOString().slice(0, 10);
  const urls = seo.routes.map((route) => {
    const loc = route.path === '/' ? `${SITE_URL}/` : abs(route.path);
    return [
      '  <url>',
      `    <loc>${loc}</loc>`,
      `    <lastmod>${today}</lastmod>`,
      `    <changefreq>${route.changefreq || 'monthly'}</changefreq>`,
      `    <priority>${route.priority || '0.5'}</priority>`,
      '  </url>',
    ].join('\n');
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}

function robots() {
  const disallow = seo.noindexPrefixes.map((prefix) => `Disallow: ${prefix}`).join('\n');
  return `# https://www.robotstxt.org/robotstxt.html
# Generated by scripts/build-seo.js from src/shared/seo.json — edit there.

User-agent: *
Allow: /
${disallow}

Sitemap: ${SITE_URL}/sitemap.xml
`;
}

// --- Run ---------------------------------------------------------------------

function main() {
  const indexPath = path.join(BUILD_DIR, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error('build-seo: build/index.html not found — run `react-scripts build` first.');
    process.exit(1);
  }

  // Read once, before anything is written, and stripped of this script's own
  // previous output so a re-run is idempotent.
  const template = normalizeTemplate(fs.readFileSync(indexPath, 'utf8'));

  for (const route of seo.routes) {
    const outPath = path.join(BUILD_DIR, route.file);
    fs.writeFileSync(outPath, renderRoute(template, route));
    console.log(`build-seo: ${route.path} -> build/${route.file}`);
  }

  fs.writeFileSync(path.join(BUILD_DIR, 'sitemap.xml'), sitemap());
  fs.writeFileSync(path.join(BUILD_DIR, 'robots.txt'), robots());
  console.log(`build-seo: sitemap.xml + robots.txt written for ${SITE_URL}`);
}

main();
