/**
 * Sandbox API — Ephemeral code execution environments.
 *
 * Each sandbox is an isolated Docker container with its own filesystem.
 * Templates: python, node, shell, go.
 */

class SandboxAPI {
  /** @param {import('./client').StudExClient} client */
  constructor(client) {
    this._client = client;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────

  /** Spawn a new sandbox. */
  spawn(template = 'python', ttlMs = 120000) {
    return this._client._post('/sandbox/spawn', { template, ttlMs });
  }

  /** Execute code in a sandbox. */
  run(sandboxId, code, options = {}) {
    const body = { code };
    if (options.language) body.language = options.language;
    if (options.timeout) body.timeout = options.timeout;
    return this._client._post(`/sandbox/${sandboxId}/run`, body);
  }

  /** Destroy a sandbox. */
  destroy(sandboxId) {
    return this._client._delete(`/sandbox/${sandboxId}`);
  }

  // ── Files ─────────────────────────────────────────────────────────────

  /** List files in a sandbox workspace. */
  async listFiles(sandboxId, path = '.') {
    const data = await this._client._get(`/sandbox/${sandboxId}/files`, { path });
    return data.files || [];
  }

  /** Read a file from a sandbox workspace. Returns content string or null. */
  async readFile(sandboxId, filePath) {
    try {
      const data = await this._client._get(`/sandbox/${sandboxId}/files/${filePath}`);
      return data.content;
    } catch (err) {
      if (err.status === 404) return null;
      throw err;
    }
  }

  /** Write a file to a sandbox workspace. */
  writeFile(sandboxId, filePath, content) {
    return this._client._post(`/sandbox/${sandboxId}/files`, { path: filePath, content });
  }

  // ── Info ──────────────────────────────────────────────────────────────

  /** List all active sandboxes with stats. */
  list() {
    return this._client._get('/sandbox');
  }

  /** Get sandbox system stats. */
  stats() {
    return this._client._get('/sandbox/stats');
  }

  /** List available sandbox templates. */
  templates() {
    return this._client._get('/sandbox/templates');
  }
}

module.exports = SandboxAPI;
