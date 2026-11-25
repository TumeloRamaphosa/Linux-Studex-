/**
 * Allowlisted root static files only (no repo-wide static hosting).
 * Complementary security patch — provenance: cursor/agent-central-foundation-7328
 */
export const PUBLIC_FILES = new Set([
  'dashboard.html',
  'agent-central.html',
  'hero-bg.png',
]);

export function isPublicStaticRequest(method, urlPath) {
  if (method !== 'GET' && method !== 'HEAD') return false;
  const name = urlPath.replace(/^\/+/, '');
  if (!name || name.includes('/') || name.includes('..')) return false;
  return PUBLIC_FILES.has(name);
}

export function resolvePublicStaticPath(repoRoot, urlPath) {
  const name = urlPath.replace(/^\/+/, '');
  if (!PUBLIC_FILES.has(name)) {
    const err = new Error('Not found');
    err.status = 404;
    throw err;
  }
  return `${repoRoot}/${name}`;
}
