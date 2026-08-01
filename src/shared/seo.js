import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import seo from './seo.json';

// Per-page metadata for client-side navigation.
//
// Crawlers get their tags from the STATIC html generated at build time by
// scripts/build-seo.js — Googlebot fetches each URL fresh and never
// client-navigates, so that file is what decides how a page is indexed. This
// hook keeps the tab title, canonical, and link-preview tags correct for real
// people moving around the SPA, and is the only way private routes (which
// have no static file of their own) get their noindex.
//
// Both read the same src/shared/seo.json, so the two can't drift apart.

// Canonical URLs always point at the production origin from seo.json, never
// window.location.origin: preview deployments and the *.vercel.app domain
// serve identical content, and without this each one competes with the real
// site for the same keywords.
const SITE_URL = (process.env.REACT_APP_SITE_URL || seo.siteUrl).replace(/\/$/, '');

function upsertMeta(attr, name, content) {
  const selector = `meta[${attr}="${name}"]`;
  let tag = document.head.querySelector(selector);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function upsertCanonical(href) {
  let tag = document.head.querySelector('link[rel="canonical"]');
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', 'canonical');
    document.head.appendChild(tag);
  }
  tag.setAttribute('href', href);
}

// Metadata for a route straight from seo.json, so page components don't
// restate copy that the build script and the sitemap also depend on.
export function routeMeta(path) {
  const route = seo.routes.find((r) => r.path === path);
  if (!route) return { title: seo.siteName, description: seo.defaultDescription };
  return { title: route.title, description: route.description };
}

export function useSeo({ title, description, noindex = false } = {}) {
  const { pathname } = useLocation();

  useEffect(() => {
    const pageTitle = title || seo.siteName;
    const pageDescription = description || seo.defaultDescription;
    // "/register/" and "/register" are one page — pick one spelling so they
    // can't be indexed as two. The root keeps its trailing slash, matching
    // exactly what scripts/build-seo.js writes into the static files and the
    // sitemap; a canonical that disagrees with them is worse than none.
    const trimmed = pathname.replace(/\/+$/, '');
    const canonical = trimmed ? `${SITE_URL}${trimmed}` : `${SITE_URL}/`;

    document.title = pageTitle;
    upsertMeta('name', 'description', pageDescription);
    // Written on every page, not just private ones: a stale noindex left
    // behind after navigating away from /admin would quietly deindex the
    // page the visitor landed on next.
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
    upsertCanonical(canonical);

    upsertMeta('property', 'og:title', pageTitle);
    upsertMeta('property', 'og:description', pageDescription);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('name', 'twitter:title', pageTitle);
    upsertMeta('name', 'twitter:description', pageDescription);
  }, [pathname, title, description, noindex]);
}

export default seo;
