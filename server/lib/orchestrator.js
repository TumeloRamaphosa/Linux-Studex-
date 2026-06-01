/**
 * AgentOrchestrator — Inter-Agent Communication Hub
 *
 * Manages:
 *   - Agent registry (which agents are alive)
 *   - Shared blackboard (facts any agent can read/write)
 *   - Message routing between agents
 *   - Multi-agent workflow coordination
 *   - Broadcast to all agents
 *
 * Design: blackboard pattern + message bus.
 * Agents post facts, ask questions, and trigger workflows across each other.
 */
export default class AgentOrchestrator {
  constructor() {
    /** Map<agentName, BaseAgent> */
    this.agents = {};

    /** Shared blackboard — key-value store any agent can access */
    this.blackboard = new Map();

    /** Message log — history of inter-agent messages */
    this.messageLog = [];

    /** Workflow registry — multi-step coordinated tasks */
    this.workflows = new Map();

    this._startedAt = Date.now();
  }

  // ── Registry ──────────────────────────────────────────────────────────────

  /** Register an agent into the orchestration system. */
  register(agent) {
    // Prevent double-wrapping if register is called more than once
    if (this.agents[agent.name]) return;

    this.agents[agent.name] = agent;
    agent._orchestrator = this; // give agent a back-reference

    // Subscribe to agent events via a hook on the agent's chat method
    const originalChat = agent.chat.bind(agent);
    agent.chat = async (message) => {
      const response = await originalChat(message);
      // Log the interaction to the orchestrator
      this.messageLog.push({
        from: agent.name,
        to: '__self__',
        message,
        response,
        timestamp: new Date().toISOString(),
      });
      return response;
    };

    this.messageLog.push({
      from: 'system',
      to: agent.name,
      message: `Agent ${agent.name} registered`,
      response: 'acknowledged',
      timestamp: new Date().toISOString(),
    });
  }

  /** Get an agent by name. */
  get(name) {
    return this.agents[name] || null;
  }

  /** List all registered agents. */
  list() {
    return Object.values(this.agents).map(a => ({
      name: a.name,
      role: a.role,
      status: a.state.status,
      rvs: a.rvs,
    }));
  }

  // ── Blackboard (shared state) ─────────────────────────────────────────────

  /** Set a fact on the shared blackboard. */
  setFact(key, value, source) {
    this.blackboard.set(key, { value, source, updatedAt: Date.now() });
    this.messageLog.push({
      from: source || 'system',
      to: '__blackboard__',
      message: `set ${key} = ${typeof value === 'object' ? JSON.stringify(value) : value}`,
      response: 'stored',
      timestamp: new Date().toISOString(),
    });
  }

  /** Get a fact from the shared blackboard. */
  getFact(key) {
    return this.blackboard.get(key) || null;
  }

  /** Get all facts on the blackboard. */
  getAllFacts() {
    const facts = {};
    for (const [key, entry] of this.blackboard) {
      facts[key] = entry;
    }
    return facts;
  }

  /** Delete a fact. */
  deleteFact(key) {
    this.blackboard.delete(key);
  }

  // ── Inter-Agent Messaging ────────────────────────────────────────────────

  /**
   * Send a message from one agent to another.
   * Returns the receiving agent's response.
   */
  async send(from, to, message) {
    const target = this.agents[to];
    if (!target) {
      throw new Error(`Agent '${to}' not found in registry`);
    }

    const response = await target.chat(`[from ${from}] ${message}`);

    this.messageLog.push({
      from,
      to,
      message,
      response,
      timestamp: new Date().toISOString(),
    });

    return response;
  }

  /**
   * Route a task to the best agent(s) using Hermes as the router.
   */
  async routeTask(from, taskDescription) {
    const hermes = this.agents['hermes'];
    if (!hermes) {
      throw new Error('Hermes (router) not registered');
    }

    // Ask Hermes to determine which agents should handle this task
    const routing = await hermes.coordinate(taskDescription);

    const results = {};
    for (const assignment of routing.assignments) {
      const agent = this.agents[assignment.agent];
      if (agent) {
        const response = await agent.chat(`[task from ${from}] ${assignment.task}`);
        results[assignment.agent] = {
          task: assignment.task,
          response,
          status: 'completed',
        };
        this.messageLog.push({
          from: 'hermes',
          to: assignment.agent,
          message: assignment.task,
          response,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return {
      plan: routing.explanation,
      assignments: routing.assignments,
      results,
    };
  }

  /**
   * Broadcast a message to all agents.
   */
  async broadcast(from, message) {
    const results = {};
    for (const [name, agent] of Object.entries(this.agents)) {
      if (name !== from) {
        try {
          const response = await agent.chat(`[broadcast from ${from}] ${message}`);
          results[name] = response;
          this.messageLog.push({
            from,
            to: name,
            message,
            response,
            timestamp: new Date().toISOString(),
          });
        } catch (err) {
          results[name] = `Error: ${err.message}`;
        }
      }
    }
    return results;
  }

  /**
   * Start a multi-step workflow.
   * Workflows are sequences of agent tasks executed in order.
   */
  async startWorkflow(name, steps) {
    const workflowId = `wf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const workflow = {
      id: workflowId,
      name,
      steps,
      currentStep: 0,
      startedAt: Date.now(),
      completed: false,
      results: [],
    };

    this.workflows.set(workflowId, workflow);

    // Execute steps sequentially
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      workflow.currentStep = i;
      const target = this.agents[step.agent];
      if (target) {
        const response = await target.chat(`[workflow: ${name}] ${step.task}`);
        workflow.results.push({
          step: i,
          agent: step.agent,
          task: step.task,
          response,
        });
        this.messageLog.push({
          from: 'workflow',
          to: step.agent,
          message: `[${name} step ${i + 1}/${steps.length}] ${step.task}`,
          response,
          timestamp: new Date().toISOString(),
        });
      }
    }

    workflow.completed = true;
    workflow.completedAt = Date.now();

    return {
      workflowId,
      name,
      steps: steps.length,
      results: workflow.results,
      completed: true,
    };
  }

  /** Get the message log (latest N entries). */
  getMessageLog(count = 50) {
    return this.messageLog.slice(-count);
  }

  /** Get uptime of the orchestrator. */
  get uptime() {
    return Math.floor((Date.now() - this._startedAt) / 1000);
  }

  /** Full orchestrator status snapshot. */
  get status() {
    return {
      agents: this.list().length,
      registered: Object.keys(this.agents),
      blackboardKeys: this.blackboard.size,
      messagesLogged: this.messageLog.length,
      activeWorkflows: [...this.workflows.values()].filter(w => !w.completed).length,
      uptime: this.uptime,
    };
  }
}
