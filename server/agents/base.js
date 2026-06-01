import AgentLogger from '../lib/logger.js';

/**
 * Base Agent class.
 * Every agent has a name, role, VM spec, state, and a logger.
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
      memory: {
        atoms: 0,
        scenarios: 0,
        persona: personality,
      },
    };

    this.logger = new AgentLogger(name);
    this.logger.init();

    // Start uptime ticker
    this._uptimeInterval = setInterval(() => {
      this.state.uptime = Math.floor((Date.now() - this.state.startedAt) / 60000);
    }, 60000);
  }

  get status() {
    return {
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

  /**
   * Clean up intervals.
   */
  destroy() {
    clearInterval(this._uptimeInterval);
  }
}
