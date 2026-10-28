/** A page's path as the site publishes it: no `.html`, no trailing slash, and `/` for the root. */
export function cleanPath(pathname: string): string {
  const path = pathname.replace(/\.html$/, '').replace(/\/+$/, '');
  return path === '' || path === '/index' ? '/' : path.replace(/\/index$/, '');
}
