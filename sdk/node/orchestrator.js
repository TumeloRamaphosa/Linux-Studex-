/**
 * Orchestrator API — Inter-agent messaging, task routing, blackboard, workflows.
 *
 * The orchestrator is the central hub that coordinates all 5 agents.
 * Agents can send messages to each other, share facts via the blackboard,
 * and execute multi-step workflows.
 */

class OrchestratorAPI {
  /** @param {import('./client').StudExClient} client */
  constructor(client) {
    this._client = client;
  }

  // ── Status ────────────────────────────────────────────────────────────

  /** Get orchestrator status. */
  status() {
    return this._client._get('/orchestrate');
  }

  /** List all registered agents in the mesh. */
  agents() {
    return this._client._get('/orchestrate/agents');
  }

  /** Get inter-agent message history. */
  async messageLog(count = 50) {
    const data = await this._client._get('/orchestrate/log', { count: String(count) });
    return data.messages || [];
  }

  // ── Agent-to-Agent Messaging ──────────────────────────────────────────

  /** Send a message from one agent to another. */
  send(fromAgent, toAgent, message) {
    return this._client._post('/orchestrate/send', {
      from: fromAgent,
      to: toAgent,
      message,
    });
  }

  /** Broadcast a message to all agents. */
  broadcast(fromAgent, message) {
    return this._client._post('/orchestrate/broadcast', {
      from: fromAgent,
      message,
    });
  }

  /** Route a multi-agent task through Hermes coordinator. */
  routeTask(task, fromAgent = 'user') {
    return this._client._post('/orchestrate/task', {
      from: fromAgent,
      task,
    });
  }

  // ── Workflows ─────────────────────────────────────────────────────────

  /**
   * Execute a multi-step workflow across multiple agents.
   *
   * Example:
   *   client.orchestrator.workflow('deploy-app', [
   *     { agent: 'cursor', task: 'run tests on dashboard' },
   *     { agent: 'openhuman', task: 'deploy to production' },
   *   ]);
   */
  workflow(name, steps) {
    return this._client._post('/orchestrate/workflow', { name, steps });
  }

  // ── Blackboard (shared state) ─────────────────────────────────────────

  /** Get all facts from the shared blackboard. */
  blackboardGetAll() {
    return this._client._get('/orchestrate/blackboard');
  }

  /** Get a specific fact from the blackboard. */
  async blackboardGet(key) {
    try {
      return await this._client._get(`/orchestrate/blackboard/${key}`);
    } catch (err) {
      if (err.status === 404) return null;
      throw err;
    }
  }

  /** Write a fact to the shared blackboard. */
  blackboardSet(key, value, source = 'sdk') {
    return this._client._post('/orchestrate/blackboard', { key, value, source });
  }

  /** Delete a fact from the blackboard. */
  blackboardDelete(key) {
    return this._client._delete(`/orchestrate/blackboard/${key}`);
  }
}

module.exports = OrchestratorAPI;
