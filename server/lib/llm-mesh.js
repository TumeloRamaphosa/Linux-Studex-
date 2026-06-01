/**
 * LLM Mesh — Local Model Gateway
 *
 * Connects the agent mesh to locally-running LLM models via LM Studio's
 * OpenAI-compatible API (http://localhost:1234/v1).
 *
 * Agents can route tasks to local models, chain multiple models together,
 * and fall back gracefully when no local model is available.
 *
 * Supports:
 *   - LM Studio (primary) — http://localhost:1234/v1
 *   - Ollama (fallback) — http://localhost:11434/v1
 *   - Custom remote endpoints
 */

const LM_STUDIO_BASE = process.env.LM_STUDIO_URL || 'http://localhost:1234/v1';
const OLLAMA_BASE = process.env.OLLAMA_URL || 'http://localhost:11434/v1';

export default class LLMMesh {
  constructor() {
    this.activeProvider = 'lm-studio';
    this.models = [];
    this.currentModel = null;
    this.lastPing = null;
    this.status = 'disconnected'; // disconnected | connected | error
    this.error = null;

    this._providers = {
      'lm-studio': { baseUrl: LM_STUDIO_BASE, healthEndpoint: '/models' },
      'ollama': { baseUrl: OLLAMA_BASE, healthEndpoint: '/models' },
    };

    // Scan is called explicitly by the caller (server/index.js)
    // so they can await it. We don't call it here to avoid a
    // double-scan on startup.
  }

  // ── Provider Management ────────────────────────────────────────────────

  /** Get list of configured providers. */
  get providers() {
    return Object.entries(this._providers).map(([name, cfg]) => ({
      name,
      baseUrl: cfg.baseUrl,
      active: name === this.activeProvider,
      status: name === this.activeProvider ? this.status : 'unknown',
    }));
  }

  /** Switch active provider. */
  setProvider(name) {
    if (!this._providers[name]) {
      throw new Error(`Unknown provider '${name}'. Available: ${Object.keys(this._providers).join(', ')}`);
    }
    this.activeProvider = name;
    this.scan();
  }

  // ── Health / Scanning ──────────────────────────────────────────────────

  /** Scan the active provider to discover models. */
  async scan() {
    const provider = this._providers[this.activeProvider];
    if (!provider) {
      this.status = 'error';
      this.error = 'No provider configured';
      return;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${provider.baseUrl}/models`, {
        signal: controller.signal,
        headers: { 'Authorization': 'Bearer lm-studio' },
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      this.models = (data.data || data || []).map(m => ({
        id: m.id || m.name || m.model,
        name: m.id || m.name || m.model || 'unknown',
        provider: this.activeProvider,
      }));
      this.currentModel = this.models[0]?.id || null;
      this.status = 'connected';
      this.error = null;
      this.lastPing = Date.now();
    } catch (err) {
      this.status = 'disconnected';
      this.error = err.message;
      this.models = [];
      this.currentModel = null;
    }

    // Try fallback provider if primary is down
    if (this.status !== 'connected') {
      for (const [name, cfg] of Object.entries(this._providers)) {
        if (name === this.activeProvider) continue;
        try {
          const resp = await fetch(`${cfg.baseUrl}/models`, {
            signal: AbortSignal.timeout(2000),
            headers: { 'Authorization': 'Bearer lm-studio' },
          });
          if (resp.ok) {
            const data = await resp.json();
            this.models = (data.data || data || []).map(m => ({
              id: m.id || m.name || m.model,
              name: m.id || m.name || m.model || 'unknown',
              provider: name,
            }));
            this.currentModel = this.models[0]?.id || null;
            this.status = 'connected';
            this.error = `Using fallback provider: ${name}`;
            this.activeProvider = name;
            break;
          }
        } catch {
          continue;
        }
      }
    }
  }

  // ── Chat / Completion ──────────────────────────────────────────────────

  /**
   * Send a chat completion request to the current provider.
   * Matches OpenAI chat.completions.create interface.
   */
  async chat(messages, options = {}) {
    const provider = this._providers[this.activeProvider];
    if (!provider) {
      return { error: 'No LLM provider available', status: 'error' };
    }

    const model = options.model || this.currentModel || 'local-model';
    const body = {
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
      stream: options.stream ?? false,
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), (options.timeout || 30000));

      const response = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer lm-studio',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        return {
          error: `LLM provider returned ${response.status}: ${errText}`,
          status: 'error',
        };
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      const usage = data.usage || {};

      return {
        status: 'success',
        model: data.model || model,
        provider: this.activeProvider,
        message: {
          role: choice?.message?.role || 'assistant',
          content: choice?.message?.content || '',
        },
        usage: {
          inputTokens: usage.prompt_tokens || 0,
          outputTokens: usage.completion_tokens || 0,
          totalTokens: usage.total_tokens || 0,
        },
        finishReason: choice?.finish_reason || 'stop',
        timing: {
          startedAt: Date.now(),
        },
      };
    } catch (err) {
      return {
        error: err.message,
        status: 'error',
      };
    }
  }

  /**
   * Stream a chat completion. Returns a ReadableStream.
   * The caller consumes it with res.write() or similar.
   */
  async chatStream(messages, options = {}) {
    const provider = this._providers[this.activeProvider];
    if (!provider) {
      throw new Error('No LLM provider available');
    }

    const model = options.model || this.currentModel || 'local-model';
    const body = {
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
      stream: true,
    };

    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer lm-studio',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`LLM provider returned ${response.status}`);
    }

    return response.body; // ReadableStream
  }

  // ── Embeddings ─────────────────────────────────────────────────────────

  /** Generate embeddings for a text. */
  async embed(text, options = {}) {
    const provider = this._providers[this.activeProvider];
    if (!provider) {
      return { error: 'No LLM provider available', status: 'error' };
    }

    const model = options.model || this.currentModel || 'local-model';

    try {
      const response = await fetch(`${provider.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer lm-studio',
        },
        body: JSON.stringify({
          model,
          input: text,
        }),
      });

      if (!response.ok) {
        return { error: `Embedding error: ${response.status}`, status: 'error' };
      }

      const data = await response.json();
      return {
        status: 'success',
        embedding: data.data?.[0]?.embedding || [],
        dimensions: data.data?.[0]?.embedding?.length || 0,
        model,
      };
    } catch (err) {
      return { error: err.message, status: 'error' };
    }
  }

  // ── Stats ────────────────────────────────────────────────────────────────

  /** Get full mesh status. */
  getStatus() {
    return {
      status: this.status,
      activeProvider: this.activeProvider,
      models: this.models,
      currentModel: this.currentModel,
      lastPing: this.lastPing,
      error: this.error,
      providers: this.providers,
      endpoints: {
        lmStudio: LM_STUDIO_BASE,
        ollama: OLLAMA_BASE,
      },
    };
  }
}
