import { Router } from 'express';

const router = Router();

/**
 * Mount MCP protocol routes.
 * @param {MCPServer} mcpServer
 */
export default function mcpRoutes(mcpServer) {
  // GET /api/mcp/tools — discover all available tools
  router.get('/tools', (req, res) => {
    res.json({
      protocol: 'model-context-protocol',
      version: '1.0',
      tools: mcpServer.tools,
      count: mcpServer.tools.length,
    });
  });

  // POST /api/mcp/call — call a tool
  router.post('/call', async (req, res) => {
    const { name, arguments: args } = req.body;
    if (!name) return res.status(400).json({ error: 'Tool name is required' });

    try {
      const result = await mcpServer.callTool(name, args || {});
      res.json({
        tool: name,
        status: 'success',
        result,
      });
    } catch (err) {
      res.status(404).json({
        tool: name,
        status: 'error',
        error: err.message,
      });
    }
  });

  // GET /api/mcp — protocol info
  router.get('/', (req, res) => {
    res.json({
      protocol: 'model-context-protocol',
      version: '1.0',
      endpoints: {
        tools: 'GET /api/mcp/tools',
        call: 'POST /api/mcp/call',
      },
      toolsCount: mcpServer.tools.length,
      agentsCount: mcpServer.orchestrator?.list()?.length || 0,
    });
  });

  return router;
}
