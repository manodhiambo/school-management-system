import { useEffect } from 'react';

interface SEOOptions {
  title: string;
  description: string;
  /** Relative path, e.g. "/faq" — combined with the production origin for canonical/OG URLs */
  path: string;
  noindex?: boolean;
}

const SITE_URL = 'https://skulmanager.org';

function setMetaByName(name: string, content: string) {
  let tag = document.querySelector(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function setMetaByProperty(property: string, content: string) {
  let tag = document.querySelector(`meta[property="${property}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('property', property);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function setCanonical(href: string) {
  let tag = document.querySelector('link[rel="canonical"]');
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', 'canonical');
    document.head.appendChild(tag);
  }
  tag.setAttribute('href', href);
}

/**
 * Sets document title + meta description/OG/canonical/robots for the current page.
 * This is a SPA, so index.html's static tags only describe "/" — every other public
 * route needs to override them on mount or every page shows the homepage's title in
 * search results and social previews.
 */
export function useSEO({ title, description, path, noindex = false }: SEOOptions) {
  useEffect(() => {
    const url = `${SITE_URL}${path}`;
    document.title = title;
    setMetaByName('description', description);
    setMetaByName('robots', noindex ? 'noindex, nofollow' : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1');
    setCanonical(url);
    setMetaByProperty('og:title', title);
    setMetaByProperty('og:description', description);
    setMetaByProperty('og:url', url);
    setMetaByName('twitter:title', title);
    setMetaByName('twitter:description', description);
  }, [title, description, path, noindex]);
}
