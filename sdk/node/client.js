/**
 * Core HTTP client for the StudEx API.
 * Handles connection, error wrapping, and HTTP calls.
 * Zero external dependencies — uses built-in https/http module.
 */

const http = require('http');
const https = require('https');

class StudExError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StudExError';
  }
}

class ConnectionError extends StudExError {
  constructor(message) {
    super(message);
    this.name = 'ConnectionError';
  }
}

class APIError extends StudExError {
  constructor(status, message) {
    super(`[${status}] ${message}`);
    this.name = 'APIError';
    this.status = status;
  }
}

/**
 * Core StudEx client.
 */
class StudExClient {
  /**
   * @param {string} baseUrl - Server URL (default: http://localhost:4000)
   * @param {object} options
   * @param {number} options.timeout - Request timeout in ms (default: 30000)
   * @param {number} options.retries - Number of retries on failure (default: 2)
   */
  constructor(baseUrl = 'http://localhost:4000', options = {}) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.timeout = options.timeout || 30000;
    this.retries = options.retries != null ? options.retries : 2;

    // Parse URL for http/https selection
    const parsed = new URL(this.baseUrl);
    this._httpModule = parsed.protocol === 'https:' ? https : http;
    this._hostname = parsed.hostname;
    this._port = parsed.port || (parsed.protocol === 'https:' ? 443 : 80);

    // Sub-API clients
    const SandboxAPI = require('./sandbox');
    const MCPAPI = require('./mcp');
    const AgentAPI = require('./agent');
    const OrchestratorAPI = require('./orchestrator');

    this.sandbox = new SandboxAPI(this);
    this.mcp = new MCPAPI(this);
    this.agents = new AgentAPI(this);
    this.orchestrator = new OrchestratorAPI(this);
  }

  // ── Low-level HTTP ────────────────────────────────────────────────────

  /**
   * Make an HTTP request.
   * @param {string} method - HTTP method
   * @param {string} path - API path (without /api prefix)
   * @param {object} [data] - Request body (for POST/PUT/DELETE)
   * @param {object} [query] - Query parameters
   * @returns {Promise<object>}
   */
  _request(method, path, data, query) {
    let urlPath = `/api${path}`;
    if (query) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        params.append(k, String(v));
      }
      urlPath += '?' + params.toString();
    }

    const body = data ? JSON.stringify(data) : undefined;

    return this._requestWithRetry(method, urlPath, body);
  }

  _requestWithRetry(method, urlPath, body, attempt = 0) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this._hostname,
        port: this._port,
        path: urlPath,
        method,
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      };

      if (body) {
        options.headers['Content-Length'] = Buffer.byteLength(body);
      }

      const req = this._httpModule.request(options, (res) => {
        let raw = '';
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => {
          try {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(raw ? JSON.parse(raw) : {});
            } else {
              let msg;
              try { msg = JSON.parse(raw).error || raw; }
              catch { msg = raw || res.statusMessage; }
              reject(new APIError(res.statusCode, msg));
            }
          } catch (err) {
            reject(new StudExError(`Failed to parse response: ${err.message}`));
          }
        });
      });

      req.on('error', (err) => {
        if (attempt < this.retries) {
          setTimeout(() => {
            this._requestWithRetry(method, urlPath, body, attempt + 1)
              .then(resolve)
              .catch(reject);
          }, 1000 * (attempt + 1));
        } else {
          reject(new ConnectionError(
            `Cannot reach ${this.baseUrl} after ${this.retries + 1} attempts: ${err.message}`
          ));
        }
      });

      req.on('timeout', () => {
        req.destroy();
        if (attempt < this.retries) {
          setTimeout(() => {
            this._requestWithRetry(method, urlPath, body, attempt + 1)
              .then(resolve)
              .catch(reject);
          }, 1000 * (attempt + 1));
        } else {
          reject(new ConnectionError(
            `Request to ${this.baseUrl} timed out after ${this.timeout}ms`
          ));
        }
      });

      if (body) req.write(body);
      req.end();
    });
  }

  _get(path, query) {
    return this._request('GET', path, null, query);
  }

  _post(path, data) {
    return this._request('POST', path, data);
  }

  _delete(path) {
    return this._request('DELETE', path);
  }

  // ── High-level helpers ────────────────────────────────────────────────

  /** Check server health. */
  health() {
    return this._get('/health');
  }

  /** Quick connectivity check. */
  async ping() {
    try {
      await this._get('/health', { _t: String(Date.now()) });
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = { StudExClient, StudExError, APIError, ConnectionError };
