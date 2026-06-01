/**
 * StudEx Node.js SDK — Programmatic client for the StudEx Agent Operating System.
 *
 * Allows agents to call the sandbox, MCP, orchestrator, and agent APIs
 * from JavaScript/TypeScript code.
 *
 * Quick start:
 *   const { StudExClient } = require('studex-sdk');
 *   const client = new StudExClient();
 *
 *   // Spawn a sandbox and run code
 *   const sb = client.sandbox.spawn('python');
 *   const result = client.sandbox.run(sb.id, "print('hello from studex')");
 *   console.log(result.stdout);
 *
 *   // Discover MCP tools
 *   const tools = client.mcp.listTools();
 *   tools.forEach(t => console.log(t.name, t.description));
 *
 *   // Chat with an agent
 *   const resp = client.agents.chat('cashclaw', 'check positions');
 *   console.log(resp.response);
 *
 *   // Route a multi-agent task
 *   const task = client.orchestrator.routeTask('deploy the dashboard');
 *   console.log(task);
 */

const { StudExClient, StudExError, APIError, ConnectionError } = require('./client');

module.exports = {
  StudExClient,
  StudExError,
  APIError,
  ConnectionError,
};
