#!/usr/bin/env node
/**
 * StudEx — Node.js SDK for the StudEx Agent Operating System.
 *
 * Pattern matches Anthropic's Python SDK and Google ADK:
 *   const { StudEx } = require('studex');
 *   const client = new StudEx();
 *
 *   // Agent chat (Anthropic messages.create pattern)
 *   const resp = await client.agents.create('cashclaw', 'check positions');
 *
 *   // Sandbox with context manager (ADK session pattern)
 *   const sb = await client.sandbox.spawn('python');
 *   const result = await client.sandbox.run(sb.id, "print('hello')");
 *
 *   // MCP tool discovery (ADK ToolRegistry pattern)
 *   const tools = await client.mcp.tools.list();
 *
 *   // Orchestrator (multi-agent task routing)
 *   const task = await client.orchestrator.tasks.create('deploy the dashboard');
 */

const http = require('http');
const https = require('https');

// ── Error Hierarchy (Anthropic SDK pattern) ──────────────────────────────

class StudExError extends Error {
  constructor(message) { super(message); this.name = 'StudExError'; }
}

class ConnectionError extends StudExError {
  constructor(message, url) {
    super(message || 'Failed to connect to StudEx server');
    this.name = 'ConnectionError'; this.url = url;
  }
}

class TimeoutError extends StudExError {
  constructor(message, timeout) {
    super(message || 'Request timed out');
    this.name = 'TimeoutError'; this.timeout = timeout;
  }
}

class APIError extends StudExError {
  constructor(status, message, body) {
    super(`[${status}] ${message}`);
    this.name = 'APIError'; this.status = status; this.body = body;
  }
}

class BadRequestError extends APIError {
  constructor(msg, body) { super(400, msg || 'Bad request', body); this.name = 'BadRequestError'; }
}

class NotFoundError extends APIError {
  constructor(msg, body) { super(404, msg || 'Not found', body); this.name = 'NotFoundError'; }
}

class RateLimitError extends APIError {
  constructor(msg, body) { super(429, msg || 'Rate limit exceeded', body); this.name = 'RateLimitError'; }
}

class InternalError extends APIError {
  constructor(msg, body) { super(500, msg || 'Internal error', body); this.name = 'InternalError'; }
}

// ── HTTP Client ──────────────────────────────────────────────────────────

class HttpClient {
  constructor(baseUrl, options = {}) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.timeout = options.timeout || 30000;
    this.maxRetries = options.maxRetries != null ? options.maxRetries : 2;
    this.defaultHeaders = options.defaultHeaders || {};

    const parsed = new URL(this.baseUrl);
    this._http = parsed.protocol === 'https:' ? https : http;
    this._host = parsed.hostname;
    this._port = parsed.port || (parsed.protocol === 'https:' ? 443 : 80);

    if (options.apiKey) {
      this.defaultHeaders['X-API-Key'] = options.apiKey;
    }
  }

  _buildUrl(path, query) {
    let url = `/api${path}`;
    if (query) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) params.append(k, String(v));
      url += '?' + params.toString();
    }
    return url;
  }

  _request(method, path, data, query) {
    const urlPath = this._buildUrl(path, query);
    const body = data ? JSON.stringify(data) : undefined;

    return new Promise((resolve, reject) => {
      const attempt = (n) => {
        const opts = {
          hostname: this._host, port: this._port, path: urlPath, method,
          timeout: this.timeout,
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...this.defaultHeaders },
        };
        if (body) opts.headers['Content-Length'] = Buffer.byteLength(body);

        const req = this._http.request(opts, (res) => {
          let raw = '';
          res.on('data', (c) => raw += c);
          res.on('end', () => {
            try {
              if (res.statusCode >= 200 && res.statusCode < 300) return resolve(raw ? JSON.parse(raw) : {});
              let msg; try { msg = JSON.parse(raw).error || raw; } catch { msg = raw || res.statusMessage; }
              reject(_mapHttpError(res.statusCode, msg, raw));
            } catch (e) { reject(new StudExError(`Parse error: ${e.message}`)); }
          });
        });

        req.on('error', (e) => {
          if (n < this.maxRetries) return setTimeout(() => attempt(n + 1), 1000 * (n + 1));
          reject(new ConnectionError(`Cannot reach ${this.baseUrl}: ${e.message}`, urlPath));
        });

        req.on('timeout', () => {
          req.destroy();
          if (n < this.maxRetries) return setTimeout(() => attempt(n + 1), 1000 * (n + 1));
          reject(new TimeoutError(`Request timed out after ${this.timeout}ms`, this.timeout));
        });

        if (body) req.write(body);
        req.end();
      };
      attempt(0);
    });
  }

  get(path, q) { return this._request('GET', path, null, q); }
  post(path, d) { return this._request('POST', path, d); }
  delete(path) { return this._request('DELETE', path); }
  health() { return this.get('/health'); }
}

function _mapHttpError(status, msg, body) {
  if (status === 400) return new BadRequestError(msg, body);
  if (status === 404) return new NotFoundError(msg, body);
  if (status === 429) return new RateLimitError(msg, body);
  if (status >= 500) return new InternalError(msg, body);
  return new APIError(status, msg, body);
}

// ── Agent API (Anthropic messages.create pattern) ───────────────────────

class AgentAPI {
  constructor(client) { this._client = client; }

  async create(name, message) {
    if (!message || !message.trim()) throw new Error('Message is required');
    const data = await this._client.post(`/agents/${name}/chat`, { message: message.trim() });
    return { agent: data.agent || name, response: data.response || '', timestamp: data.timestamp || '' };
  }

  async list() {
    const data = await this._client.get('/agents');
    return data.map(a => ({
      name: a.name, role: a.role, rvs: a.rvs, status: a.status, uptime: a.uptime, messages: a.messages,
    }));
  }

  async status(name) { return this._client.get(`/agents/${name}`); }

  async logs(name, lines = 50) {
    const data = await this._client.get(`/agents/${name}/logs`, { lines: String(lines) });
    return data.logs || [];
  }
}

// ── Sandbox API (ADK session pattern) ────────────────────────────────────

class SandboxAPI {
  constructor(client) { this._client = client; }

  async spawn(template = 'python', ttlMs = 120000) {
    const data = await this._client.post('/sandbox/spawn', { template, ttlMs });
    return { id: data.id, template: data.template || template, workDir: data.workDir || '', commands: data.commands || 0 };
  }

  async run(sandboxId, code, options = {}) {
    const body = { code };
    if (options.language) body.language = options.language;
    if (options.timeout) body.timeout = options.timeout;
    const data = await this._client.post(`/sandbox/${sandboxId}/run`, body);
    return { stdout: data.stdout || '', stderr: data.stderr || '', exitCode: data.exitCode || 1, files: data.files || [], sandboxId, get success() { return this.exitCode === 0; } };
  }

  async destroy(sandboxId) { return this._client.delete(`/sandbox/${sandboxId}`); }

  async listFiles(sandboxId, path = '.') {
    const data = await this._client.get(`/sandbox/${sandboxId}/files`, { path });
    return data.files || [];
  }

  async readFile(sandboxId, filePath) {
    try { const data = await this._client.get(`/sandbox/${sandboxId}/files/${filePath}`); return data.content || null; }
    catch (e) { if (e instanceof NotFoundError) return null; throw e; }
  }

  async writeFile(sandboxId, filePath, content) {
    return this._client.post(`/sandbox/${sandboxId}/files`, { path: filePath, content });
  }

  async list() {
    const data = await this._client.get('/sandbox');
    return (data.sandboxes || []).map(sb => ({
      id: sb.id, template: sb.template, commands: sb.commands, remainingMs: sb.remainingMs,
    }));
  }

  async templates() {
    const data = await this._client.get('/sandbox/templates');
    return (data.templates || []).map(t => ({ name: t.name, description: t.description }));
  }

  async stats() { return this._client.get('/sandbox/stats'); }

  /** ADK-style session with auto-cleanup */
  async session(template = 'python', ttlMs = 120000) {
    const sb = await this.spawn(template, ttlMs);
    const self = this;
    const sessionObj = {
      id: sb.id, template: sb.template,
      run: async (code, opts) => self.run(sb.id, code, opts),
      writeFile: async (p, c) => self.writeFile(sb.id, p, c),
      readFile: async (p) => self.readFile(sb.id, p),
      destroy: async () => { await self.destroy(sb.id); sessionObj._destroyed = true; },
      _destroyed: false,
    };
    // Auto-destroy after timeout (safety net)
    setTimeout(() => { if (!sessionObj._destroyed) self.destroy(sb.id).catch(() => {}); }, ttlMs);
    return sessionObj;
  }
}

// ── MCP API (ADK ToolRegistry pattern) ───────────────────────────────────

class MCPAPI {
  constructor(client) { this._client = client; this.tools = new ToolRegistry(client); }

  async info() { return this._client.get('/mcp'); }

  async chatWithAgent(agentName, message) {
    const result = await this.tools.call(`agent_${agentName}_chat`, { message });
    const r = result.result || {};
    return r.response || '';
  }

  async blackboardGet(key) {
    const result = await this.tools.call('blackboard_get', { key });
    return result.result || null;
  }

  async blackboardSet(key, value) {
    return this.tools.call('blackboard_set', { key, value });
  }
}

class ToolRegistry {
  constructor(client) { this._client = client; }

  async list() {
    const data = await this._client.get('/mcp/tools');
    return (data.tools || []).map(t => ({
      name: t.name, description: t.description,
      inputSchema: t.inputSchema || {},
      params: Object.keys((t.inputSchema || {}).properties || {}),
    }));
  }

  async call(name, args = {}) {
    return this._client.post('/mcp/call', { name, arguments: args });
  }
}

// ── Orchestrator API ─────────────────────────────────────────────────────

class OrchestratorAPI {
  constructor(client) {
    this._client = client;
    this.tasks = new TaskAPI(client);
    this.workflows = new WorkflowAPI(client);
    this.blackboard = new BlackboardAPI(client);
  }

  async status() { return this._client.get('/orchestrate'); }

  async agents() { return this._client.get('/orchestrate/agents'); }

  async messageLog(count = 50) {
    const data = await this._client.get('/orchestrate/log', { count: String(count) });
    return data.messages || [];
  }

  async send(from, to, message) {
    return this._client.post('/orchestrate/send', { from, to, message });
  }

  async broadcast(from, message) {
    return this._client.post('/orchestrate/broadcast', { from, message });
  }
}

class TaskAPI {
  constructor(client) { this._client = client; }

  async create(task, from = 'user') {
    const data = await this._client.post('/orchestrate/task', { from, task });
    return {
      plan: data.plan || '',
      assignments: (data.assignments || []).map(a => ({ agent: a.agent, task: a.task, response: a.response, status: a.status })),
      results: data.results || {},
    };
  }
}

class WorkflowAPI {
  constructor(client) { this._client = client; }
  async create(name, steps) { return this._client.post('/orchestrate/workflow', { name, steps }); }
}

class BlackboardAPI {
  constructor(client) { this._client = client; }

  async get(key) {
    try { return await this._client.get(`/orchestrate/blackboard/${key}`); }
    catch (e) { if (e instanceof NotFoundError) return null; throw e; }
  }

  async set(key, value, source = 'sdk') {
    return this._client.post('/orchestrate/blackboard', { key, value, source });
  }

  async delete(key) { return this._client.delete(`/orchestrate/blackboard/${key}`); }

  async all() { return this._client.get('/orchestrate/blackboard'); }
}

// ── Main StudEx Client (Anthropic SDK pattern) ──────────────────────────

class StudEx {
  constructor(baseUrl = 'http://localhost:4000', options = {}) {
    this._client = new HttpClient(baseUrl, options);
    this.agents = new AgentAPI(this._client);
    this.sandbox = new SandboxAPI(this._client);
    this.mcp = new MCPAPI(this._client);
    this.orchestrator = new OrchestratorAPI(this._client);
  }

  async health() { return this._client.health(); }
  async ping() { try { await this._client.health(); return true; } catch { return false; } }
}

// ── Tool Decorator (Google ADK pattern) ────────────────────────────────

class Tool {
  constructor(name, description, handler, parameters = {}) {
    this.name = name;
    this.description = description;
    this.handler = handler;
    this.parameters = parameters;
  }

  toMcpFormat() {
    return {
      name: this.name,
      description: this.description,
      inputSchema: {
        type: 'object',
        properties: this.parameters,
        required: Object.entries(this.parameters)
          .filter(([_, v]) => v.required)
          .map(([k]) => k),
      },
    };
  }

  execute(args = {}) { return this.handler(args); }

  static create(nameOrFn, description, handler, parameters) {
    if (typeof nameOrFn === 'function') {
      // Used as: Tool.create(myFunc)
      const fn = nameOrFn;
      const name = fn.name;
      const desc = fn.description || `Call ${name}`;
      const params = {};
      // Extract from function source or type info
      const src = fn.toString();
      const argMatch = src.match(/\(([^)]*)\)/);
      if (argMatch) {
        argMatch[1].split(',').filter(Boolean).forEach(p => {
          const [pName, pType] = p.trim().split(/[:=]/).map(s => s.trim());
          if (pName && pName !== '...args') {
            params[pName] = { type: pType || 'string', description: `Parameter ${pName}` };
          }
        });
      }
      return new Tool(name, desc, fn, params);
    }
    return new Tool(nameOrFn, description, handler, parameters);
  }
}

module.exports = {
  StudEx,
  StudExError,
  ConnectionError,
  TimeoutError,
  APIError,
  BadRequestError,
  NotFoundError,
  RateLimitError,
  InternalError,
  Tool,
};
