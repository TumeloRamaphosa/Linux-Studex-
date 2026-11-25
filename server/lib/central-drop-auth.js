/**
 * Fail-closed drop auth: enabled intake requires strong token + bound identity.
 * Multi-agent intake requires CENTRAL_DROP_BINDINGS_FILE (no anonymous/open mode).
 */
import fs from 'fs';

const MIN_TOKEN_LENGTH = 32;

/**
 * @returns {{
 *   mode: 'disabled' | 'misconfigured' | 'ready',
 *   reason?: string,
 *   token?: string,
 *   binding?: { agent: string, owner: string, source: string },
 * }}
 */
export function resolveDropAuthConfig() {
  const enabled = process.env.CENTRAL_DROP_ENABLED === 'true';
  if (!enabled) {
    return { mode: 'disabled' };
  }

  const token = String(process.env.CENTRAL_DROP_TOKEN || '').trim();
  if (token.length < MIN_TOKEN_LENGTH) {
    return {
      mode: 'misconfigured',
      reason: `CENTRAL_DROP_TOKEN must be at least ${MIN_TOKEN_LENGTH} characters when CENTRAL_DROP_ENABLED=true`,
    };
  }

  let binding = null;

  const bindingsFile = process.env.CENTRAL_DROP_BINDINGS_FILE;
  if (bindingsFile && fs.existsSync(bindingsFile)) {
    const raw = JSON.parse(fs.readFileSync(bindingsFile, 'utf8'));
    const entry = raw?.tokens?.[token];
    if (entry?.agent && entry?.owner && entry?.source) {
      binding = {
        agent: String(entry.agent),
        owner: String(entry.owner),
        source: String(entry.source),
      };
    }
  }

  if (!binding) {
    const agent = process.env.CENTRAL_DROP_BOUND_AGENT;
    const owner = process.env.CENTRAL_DROP_BOUND_OWNER;
    const source = process.env.CENTRAL_DROP_BOUND_SOURCE;
    if (agent && owner && source) {
      binding = { agent, owner, source };
    }
  }

  if (!binding) {
    return {
      mode: 'misconfigured',
      reason:
        'Drop enabled but identity is not bound. Set CENTRAL_DROP_BOUND_AGENT, CENTRAL_DROP_BOUND_OWNER, CENTRAL_DROP_BOUND_SOURCE or CENTRAL_DROP_BINDINGS_FILE.',
    };
  }

  return { mode: 'ready', token, binding };
}

export function centralDropPolicy() {
  const cfg = resolveDropAuthConfig();
  return {
    enabled: cfg.mode === 'ready',
    configured: cfg.mode === 'ready',
    failClosed: cfg.mode !== 'ready',
    misconfigured: cfg.mode === 'misconfigured',
    reason: cfg.reason,
    auth: cfg.mode === 'ready' ? 'token-bound-identity' : cfg.mode === 'disabled' ? 'disabled' : 'misconfigured',
  };
}

/**
 * @returns {{ agent: string, owner: string, source: string }}
 */
export function assertDropAuthorized(req) {
  const cfg = resolveDropAuthConfig();
  if (cfg.mode === 'disabled') {
    const err = new Error('Drop endpoint disabled until CENTRAL_DROP_ENABLED=true');
    err.status = 503;
    throw err;
  }
  if (cfg.mode === 'misconfigured') {
    const err = new Error(cfg.reason || 'Drop endpoint misconfigured');
    err.status = 503;
    throw err;
  }
  const header = req.headers['x-central-token'];
  if (!header || header !== cfg.token) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }
  return cfg.binding;
}

export function assertProvenanceMatchesBinding(body, binding) {
  for (const key of ['agent', 'owner', 'source']) {
    if (body?.[key] === undefined || body?.[key] === null || body?.[key] === '') continue;
    if (String(body[key]).trim() !== binding[key]) {
      const err = new Error(`Provenance field "${key}" does not match token-bound identity`);
      err.status = 403;
      throw err;
    }
  }
}
