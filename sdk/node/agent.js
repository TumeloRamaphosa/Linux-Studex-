/**
 * Agent API — Chat with agents, check status, read logs.
 *
 * All 5 agents are accessible:
 *   - cashclaw   (Financial/Trading agent)
 *   - hermes     (Orchestrator/Gateway)
 *   - openhuman  (Platform/Deployment)
 *   - cursor     (IDE/Development)
 *   - farm       (Worker nodes)
 */

class AgentAPI {
  /** @param {import('./client').StudExClient} client */
  constructor(client) {
    this._client = client;
  }

  // ── List and Status ───────────────────────────────────────────────────

  /** List all agents with basic status. */
  list() {
    return this._client._get('/agents');
  }

  /** Get detailed status for a specific agent. */
  status(name) {
    return this._client._get(`/agents/${name}`);
  }

  /** Get detailed status for all agents. */
  async allStatus() {
    const agents = {};
    const list = await this.list();
    for (const a of list) {
      try {
        agents[a.name] = await this.status(a.name);
      } catch {
        agents[a.name] = { error: 'unreachable' };
      }
    }
    return agents;
  }

  // ── Chat ──────────────────────────────────────────────────────────────

  /**
   * Send a message to an agent and get its response.
   *
   * Examples:
   *   client.agents.chat('cashclaw', 'check positions')
   *   client.agents.chat('hermes', 'route cashclaw through premium')
   *   client.agents.chat('cursor', 'run tests on dashboard')
   */
  chat(name, message) {
    if (!message || !message.trim()) {
      return Promise.reject(new Error('Message is required'));
    }
    return this._client._post(`/agents/${name}/chat`, { message: message.trim() });
  }

  // ── Logs ──────────────────────────────────────────────────────────────

  /** Get recent agent logs. */
  logs(name, lines = 50) {
    return this._client._get(`/agents/${name}/logs`, { lines: String(lines) });
  }

  // ── Convenience ───────────────────────────────────────────────────────

  /** Send the same message to all agents. */
  async chatWithAll(message) {
    const results = {};
    const list = await this.list();
    for (const a of list) {
      try {
        const resp = await this.chat(a.name, message);
        results[a.name] = resp.response;
      } catch (err) {
        results[a.name] = `Error: ${err.message}`;
      }
    }
    return results;
  }

  /** Get list of agent names. */
  async names() {
    const list = await this.list();
    return list.map(a => a.name);
  }
}

module.exports = AgentAPI;
