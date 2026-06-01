/**
 * MCP Server — Model Context Protocol
 *
 * Exposes all agent tools via the MCP standard so external agents,
 * LLMs, and frameworks can discover capabilities dynamically.
 *
 * Endpoints:
 *   GET  /mcp/tools        — List all available tools
 *   POST /mcp/call         — Call a tool
 *   GET  /mcp/agents       — List agents with their tools
 */
export default class MCPServer {
  constructor(orchestrator, sandboxManager) {
    this.orchestrator = orchestrator;
    this.sandboxManager = sandboxManager;
    this._tools = new Map();
    this._registerDefaultTools();
  }

  _registerDefaultTools() {
    // ── Agent Chat Tools ──────────────────────────────────────────────────
    for (const [name, agent] of Object.entries(this.orchestrator?.agents || {})) {
      this.registerTool({
        name: `agent_${name}_chat`,
        description: `Send a message to the ${name} agent (${agent.role})`,
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Message to send to the agent' },
          },
          required: ['message'],
        },
        handler: async (args) => {
          const response = await agent.chat(args.message);
          return { response };
        },
      });
    }

    // ── Orchestrator Tools ────────────────────────────────────────────────
    this.registerTool({
      name: 'orchestrate_task',
      description: 'Route a multi-agent task through Hermes coordinator',
      inputSchema: {
        type: 'object',
        properties: {
          task: { type: 'string', description: 'Task description to route' },
        },
        required: ['task'],
      },
      handler: async (args) => {
        if (!this.orchestrator) throw new Error('Orchestrator not available');
        return await this.orchestrator.routeTask('mcp', args.task);
      },
    });

    this.registerTool({
      name: 'broadcast',
      description: 'Broadcast a message to all agents in the mesh',
      inputSchema: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Message to broadcast' },
        },
        required: ['message'],
      },
      handler: async (args) => {
        if (!this.orchestrator) throw new Error('Orchestrator not available');
        return await this.orchestrator.broadcast('mcp', args.message);
      },
    });

    this.registerTool({
      name: 'blackboard_get',
      description: 'Read a fact from the shared agent blackboard',
      inputSchema: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Fact key' },
        },
        required: ['key'],
      },
      handler: async (args) => {
        if (!this.orchestrator) throw new Error('Orchestrator not available');
        return this.orchestrator.getFact(args.key);
      },
    });

    this.registerTool({
      name: 'blackboard_set',
      description: 'Write a fact to the shared agent blackboard',
      inputSchema: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Fact key' },
          value: { description: 'Fact value (any JSON type)' },
        },
        required: ['key', 'value'],
      },
      handler: async (args) => {
        if (!this.orchestrator) throw new Error('Orchestrator not available');
        this.orchestrator.setFact(args.key, args.value, 'mcp');
        return { stored: true, key: args.key };
      },
    });

    // ── Sandbox Tools ─────────────────────────────────────────────────────
    this.registerTool({
      name: 'sandbox_spawn',
      description: 'Spawn an ephemeral code execution sandbox',
      inputSchema: {
        type: 'object',
        properties: {
          template: {
            type: 'string',
            enum: ['python', 'node', 'shell', 'go'],
            description: 'Sandbox template',
          },
          ttlMs: {
            type: 'number',
            description: 'Time-to-live in milliseconds (default: 120000)',
          },
        },
      },
      handler: async (args) => {
        if (!this.sandboxManager) throw new Error('Sandbox manager not available');
        return this.sandboxManager.spawn(args.template || 'python', args.ttlMs);
      },
    });

    this.registerTool({
      name: 'sandbox_run',
      description: 'Execute code in a sandbox',
      inputSchema: {
        type: 'object',
        properties: {
          sandboxId: { type: 'string', description: 'Sandbox ID' },
          code: { type: 'string', description: 'Code to execute' },
          language: {
            type: 'string',
            enum: ['python', 'node', 'shell', 'go'],
            description: 'Language (defaults to sandbox template)',
          },
        },
        required: ['sandboxId', 'code'],
      },
      handler: async (args) => {
        if (!this.sandboxManager) throw new Error('Sandbox manager not available');
        return this.sandboxManager.run(args.sandboxId, args.code, { language: args.language });
      },
    });

    this.registerTool({
      name: 'sandbox_destroy',
      description: 'Destroy a sandbox',
      inputSchema: {
        type: 'object',
        properties: {
          sandboxId: { type: 'string', description: 'Sandbox ID' },
        },
        required: ['sandboxId'],
      },
      handler: async (args) => {
        if (!this.sandboxManager) throw new Error('Sandbox manager not available');
        this.sandboxManager.destroy(args.sandboxId);
        return { destroyed: true };
      },
    });

    this.registerTool({
      name: 'sandbox_list_files',
      description: 'List files in a sandbox workspace',
      inputSchema: {
        type: 'object',
        properties: {
          sandboxId: { type: 'string', description: 'Sandbox ID' },
          path: { type: 'string', description: 'Directory path (default: .)' },
        },
        required: ['sandboxId'],
      },
      handler: async (args) => {
        if (!this.sandboxManager) throw new Error('Sandbox manager not available');
        return { files: this.sandboxManager.listFiles(args.sandboxId, args.path) };
      },
    });

    this.registerTool({
      name: 'sandbox_write_file',
      description: 'Write a file to a sandbox workspace',
      inputSchema: {
        type: 'object',
        properties: {
          sandboxId: { type: 'string', description: 'Sandbox ID' },
          path: { type: 'string', description: 'File path within workspace' },
          content: { type: 'string', description: 'File content' },
        },
        required: ['sandboxId', 'path', 'content'],
      },
      handler: async (args) => {
        if (!this.sandboxManager) throw new Error('Sandbox manager not available');
        return this.sandboxManager.writeFile(args.sandboxId, args.path, args.content);
      },
    });

    // ── Orchestrator Info ─────────────────────────────────────────────────
    this.registerTool({
      name: 'orchestrator_status',
      description: 'Get orchestrator status and agent list',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async () => {
        if (!this.orchestrator) return { agents: [] };
        return this.orchestrator.status;
      },
    });

    this.registerTool({
      name: 'sandbox_list',
      description: 'List all active sandboxes',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async () => {
        if (!this.sandboxManager) return { sandboxes: [] };
        return { sandboxes: this.sandboxManager.list() };
      },
    });
  }

  registerTool(toolDef) {
    this._tools.set(toolDef.name, toolDef);
  }

  /** Get all tool definitions (for MCP discovery). */
  get tools() {
    return [...this._tools.values()].map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    }));
  }

  /** Call a tool by name. */
  async callTool(name, args = {}) {
    const tool = this._tools.get(name);
    if (!tool) throw new Error(`Unknown tool: '${name}'. Available: ${[...this._tools.keys()].join(', ')}`);
    return await tool.handler(args);
  }
}
