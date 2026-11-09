import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { metaForPath } from '@/lib/routeMeta';

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/** Keeps title, description, canonical and robots in step with the route (see src/lib/routeMeta.ts). */
export const RouteMeta = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    const meta = metaForPath(pathname);
    document.title = meta.title;
    setMeta('name', 'description', meta.description);
    setMeta('property', 'og:title', meta.title);
    setMeta('name', 'twitter:title', meta.title);
    setMeta('property', 'og:description', meta.description);
    setMeta('name', 'twitter:description', meta.description);
    setMeta('property', 'og:url', meta.canonical);
    setMeta('name', 'robots', meta.noindex ? 'noindex, nofollow' : 'index, follow');
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = meta.canonical;
  }, [pathname]);
  return null;
};
