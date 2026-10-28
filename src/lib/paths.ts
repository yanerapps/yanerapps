/** The prefix of every Simplified Chinese page; the English page lives at the unprefixed path. */
export const ZH = '/zh-hans';

/** A page's path as the site publishes it: no `.html`, no trailing slash, and `/` for the root. */
export function cleanPath(pathname: string): string {
  const path = pathname.replace(/\.html$/, '').replace(/\/+$/, '');
  return path === '' || path === '/index' ? '/' : path.replace(/\/index$/, '');
}

export const isZh = (path: string) => path === ZH || path.startsWith(`${ZH}/`);

/** The same page in the given language: `/x` and `/zh-hans/x`, with `/` and `/zh-hans` as the homes. */
export function localize(path: string, zh: boolean): string {
  const en = isZh(path) ? path.slice(ZH.length) || '/' : path;
  if (!zh) return en;
  return en === '/' ? ZH : ZH + en;
}
