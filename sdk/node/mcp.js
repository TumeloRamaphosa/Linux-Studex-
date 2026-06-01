/**
 * MCP API — Model Context Protocol tool discovery and calling.
 *
 * Allows agents and external LLMs to discover and call all available
 * tools dynamically through the MCP standard.
 */

class MCPAPI {
  /** @param {import('./client').StudExClient} client */
  constructor(client) {
    this._client = client;
  }

  // ── Discovery ─────────────────────────────────────────────────────────

  /** Get MCP protocol info. */
  info() {
    return this._client._get('/mcp');
  }

  /** Discover all available MCP tools. */
  async listTools() {
    const data = await this._client._get('/mcp/tools');
    return data.tools || [];
  }

  // ── Execution ─────────────────────────────────────────────────────────

  /** Call a tool by name. */
  callTool(name, args = {}) {
    return this._client._post('/mcp/call', { name, arguments: args });
  }

  // ── Convenience wrappers ──────────────────────────────────────────────

  /** Chat with an agent via MCP. */
  async chatWithAgent(agentName, message) {
    const result = await this.callTool(`agent_${agentName}_chat`, { message });
    return result.result?.response || '';
  }

  /** Route a multi-agent task via MCP. */
  routeTask(taskDescription) {
    return this.callTool('orchestrate_task', { task: taskDescription });
  }

  /** Spawn a sandbox via MCP. */
  sandboxSpawn(template = 'python', ttlMs = 120000) {
    return this.callTool('sandbox_spawn', { template, ttlMs });
  }

  /** Run code in a sandbox via MCP. */
  sandboxRun(sandboxId, code, language) {
    const args = { sandboxId, code };
    if (language) args.language = language;
    return this.callTool('sandbox_run', args);
  }

  /** Read from the shared blackboard via MCP. */
  async blackboardGet(key) {
    const result = await this.callTool('blackboard_get', { key });
    return result.result ?? null;
  }

  /** Write to the shared blackboard via MCP. */
  blackboardSet(key, value) {
    return this.callTool('blackboard_set', { key, value });
  }
}

module.exports = MCPAPI;
