import AgentLogger from '../lib/logger.js';

/**
 * Approximate token cost per 1K tokens (USD).
 * These are rough estimates for local + API models.
 */
const TOKEN_COST_PER_1K_INPUT = 0.00015;    // $0.15 per 1M input tokens
const TOKEN_COST_PER_1K_OUTPUT = 0.00060;   // $0.60 per 1M output tokens

/** Estimation: 1 token ≈ 4 characters of English text */
const CHARS_PER_TOKEN = 4;

/**
 * Base Agent class.
 * Every agent has a name, role, VM spec, state, a logger, and
 * cross-agent communication via the AgentOrchestrator.
 */
export default class BaseAgent {
  constructor({ name, role, rvs, disk, cpu, ram, port, color, personality }) {
    this.name = name;
    this.role = role;
    this.rvs = rvs;
    this.disk = disk;
    this.cpu = cpu;
    this.ram = ram;
    this.port = port;
    this.color = color;
    this.personality = personality;

    this.state = {
      status: 'online',          // online | busy | offline
      uptime: 0,                 // minutes since start
      startedAt: Date.now(),
      messages: 0,
      interAgentMessages: 0,     // count of messages from other agents
      memory: {
        atoms: 0,
        scenarios: 0,
        persona: personality,
      },
      // ── Token & cost tracking ──────────────────────────────────────────
      tokens: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,         // USD
        lastMessageTokens: 0,
        peakTokens: 0,
      },
    };

    /** Cross-agent refs — set by AgentOrchestrator.register() */
    this._orchestrator = null;

    this.logger = new AgentLogger(name);
    this.logger.init();

    // Start uptime ticker
    this._uptimeInterval = setInterval(() => {
      this.state.uptime = Math.floor((Date.now() - this.state.startedAt) / 60000);
    }, 60000);
  }

  get status() {
    const uptime = Math.floor((Date.now() - this.state.startedAt) / 60000);
    const base = {
      name: this.name,
      role: this.role,
      rvs: this.rvs,
      disk: this.disk,
      cpu: this.cpu,
      ram: this.ram,
      port: this.port,
      color: this.color,
      ...this.state,
      uptime,
      tokenUsage: {
        inputTokens: this.state.tokens.inputTokens,
        outputTokens: this.state.tokens.outputTokens,
        totalTokens: this.state.tokens.totalTokens,
        estimatedCost: this.state.tokens.estimatedCost,
        lastMessageTokens: this.state.tokens.lastMessageTokens,
        peakTokens: this.state.tokens.peakTokens,
      },
    };
    // Include orchestrator info if connected
    if (this._orchestrator) {
      base.orchestrator = {
        agentsOnline: Object.keys(this._orchestrator.agents).length,
        messageLog: this._orchestrator.messageLog.length,
      };
    }
    return base;
  }

  /**
   * Process an incoming chat message and return a response.
   * Subclasses override this.
   */
  async handleMessage(userMessage) {
    throw new Error('Subclass must implement handleMessage()');
  }

  /**
   * Estimate tokens from text.
   * Rough: 1 token ≈ 4 chars for English text.
   */
  _estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / CHARS_PER_TOKEN);
  }

  /**
   * Track token usage for a chat interaction.
   * Estimates tokens from input message + system context + output response.
   */
  _trackTokens(inputText, outputText) {
    const systemTokens = 50; // base system prompt overhead
    const inputTokens = this._estimateTokens(inputText) + systemTokens;
    const outputTokens = this._estimateTokens(outputText);
    const totalTokens = inputTokens + outputTokens;
    const inputCost = (inputTokens / 1000) * TOKEN_COST_PER_1K_INPUT;
    const outputCost = (outputTokens / 1000) * TOKEN_COST_PER_1K_OUTPUT;
    const totalCost = inputCost + outputCost;

    this.state.tokens.inputTokens += inputTokens;
    this.state.tokens.outputTokens += outputTokens;
    this.state.tokens.totalTokens += totalTokens;
    this.state.tokens.estimatedCost += totalCost;
    this.state.tokens.lastMessageTokens = totalTokens;
    if (totalTokens > this.state.tokens.peakTokens) {
      this.state.tokens.peakTokens = totalTokens;
    }
  }

  /**
   * Record a chat interaction.
   */
  async chat(userMessage) {
    // Track if message came from another agent
    if (userMessage.startsWith('[from ') || userMessage.startsWith('[broadcast') || userMessage.startsWith('[task')) {
      this.state.interAgentMessages++;
    }
    this.state.messages++;
    const response = await this.handleMessage(userMessage);
    this._trackTokens(userMessage, response);
    this.logger.chat(userMessage, response);
    this.logger.memorySync(
      Math.floor(Math.random() * 5) + 1,
      Math.floor(Math.random() * 3),
      this.state.memory.persona
    );
    return response;
  }

  /**
   * Execute a command on this agent.
   */
  async executeCommand(cmd) {
    const result = `[${this.name}] Executed: ${cmd}`;
    this.logger.command(cmd, result);
    return result;
  }

  // ── Cross-agent communication ──────────────────────────────────────────

  /**
   * Send a message to another agent via the orchestrator.
   */
  async sendTo(agentName, message) {
    if (!this._orchestrator) throw new Error('Orchestrator not connected');
    const response = await this._orchestrator.send(this.name, agentName, message);
    this.logger.decision('Inter-Agent', `Sent to ${agentName}: ${message}`);
    return response;
  }

  /**
   * Broadcast to all other agents.
   */
  async broadcast(message) {
    if (!this._orchestrator) throw new Error('Orchestrator not connected');
    const responses = await this._orchestrator.broadcast(this.name, message);
    this.logger.decision('Broadcast', `Broadcast: ${message}`);
    return responses;
  }

  /**
   * Read a fact from the shared blackboard.
   */
  blackboardGet(key) {
    if (!this._orchestrator) return null;
    return this._orchestrator.getFact(key);
  }

  /**
   * Write a fact to the shared blackboard.
   */
  blackboardSet(key, value) {
    if (!this._orchestrator) return;
    this._orchestrator.setFact(key, value, this.name);
    this.logger.decision('Blackboard', `Set ${key}`);
  }

  /**
   * Route a multi-agent task via Hermes.
   */
  async routeTask(taskDescription) {
    if (!this._orchestrator) throw new Error('Orchestrator not connected');
    const result = await this._orchestrator.routeTask(this.name, taskDescription);
    this.logger.decision('Task Routing', `Routed: ${taskDescription}`);
    return result;
  }

  // ── Sandbox code execution ──────────────────────────────────────────

  /**
   * Run code in an ephemeral sandbox.
   * Uses the SandboxManager if available (via orchestrator).
   */
  async runCode(code, options = {}) {
    if (!this._orchestrator || !this._orchestrator.sandboxManager) {
      throw new Error('Sandbox manager not available');
    }
    const sm = this._orchestrator.sandboxManager;
    const template = options.template || 'python';

    // Spawn a sandbox, run code, auto-destroy
    const sb = sm.spawn(template, 60_000);
    try {
      const result = sm.run(sb.id, code, { language: options.language || template, timeout: options.timeout || 30_000 });
      this.logger.command(`runCode (${template})`, result.exitCode === 0 ? 'OK' : `Exit: ${result.exitCode}`);
      return { sandboxId: sb.id, ...result };
    } finally {
      // Clean up after a brief delay to allow reading output files
      setTimeout(() => sm.destroy(sb.id), 2000);
    }
  }

  /**
   * Spawn a persistent sandbox and return its ID.
   * Agent can use it for multiple commands.
   */
  async spawnSandbox(template = 'python', ttlMs = 300_000) {
    if (!this._orchestrator || !this._orchestrator.sandboxManager) {
      throw new Error('Sandbox manager not available');
    }
    const sb = this._orchestrator.sandboxManager.spawn(template, ttlMs);
    this.logger.decision('Sandbox', `Spawned ${sb.id} (${template})`);
    return sb;
  }

  /**
   * Run code in an existing sandbox by ID.
   */
  async sandboxRun(sandboxId, code, options = {}) {
    if (!this._orchestrator || !this._orchestrator.sandboxManager) {
      throw new Error('Sandbox manager not available');
    }
    return this._orchestrator.sandboxManager.run(sandboxId, code, options);
  }

  /**
   * Clean up intervals.
   */
  destroy() {
    clearInterval(this._uptimeInterval);
  }
}
