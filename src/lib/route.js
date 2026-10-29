import { useEffect, useState } from 'react';

// Pages are addressed by the URL hash, so they can be bookmarked and Back works:
//   #/                          Agile Metrics
//   #/resources/<page>          Resource Management (overview, effort)
// Resource allocation is a Settings tab: openSettings('allocation')
export const RESOURCE_PAGES = ['overview', 'effort'];

export function parseRoute(hash = window.location.hash) {
  const [, module, page] = hash.replace(/^#\/?/, '#/').split('/');
  if (module === 'resources') return { module: 'resources', page: RESOURCE_PAGES.includes(page) ? page : 'overview' };
  return { module: 'sprint', page: null };
}

export const hrefFor = (module, page) => (module === 'resources' ? `#/resources/${page ?? 'overview'}` : '#/');

export function useRoute() {
  const [route, setRoute] = useState(() => parseRoute());
  useEffect(() => {
    const onChange = () => setRoute(parseRoute());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

// Opens Settings on a tab (e.g. 'redmine') from anywhere; Shell listens
export const openSettings = (tab) => window.dispatchEvent(new CustomEvent('agilemetrix:open-settings', { detail: tab }));
