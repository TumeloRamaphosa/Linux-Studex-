import AgentLogger from '../lib/logger.js';

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
      uptime: Math.floor((Date.now() - this.state.startedAt) / 60000),
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
   * Record a chat interaction.
   */
  async chat(userMessage) {
    // Track if message came from another agent
    if (userMessage.startsWith('[from ') || userMessage.startsWith('[broadcast') || userMessage.startsWith('[task')) {
      this.state.interAgentMessages++;
    }
    this.state.messages++;
    const response = await this.handleMessage(userMessage);
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

  /**
   * Clean up intervals.
   */
  destroy() {
    clearInterval(this._uptimeInterval);
  }
}
