import { Router } from 'express';

const router = Router();

/**
 * Mount status routes.
 * @param {Object<string, BaseAgent>} agents - Map of agent instances
 */
export default function statusRoutes(agents) {
  // SSE endpoint — pushes live agent status every 5 seconds
  router.get('/events', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    const interval = setInterval(() => {
      const payload = Object.values(agents).map(a => ({
        name: a.name,
        status: a.state.status,
        uptime: Math.floor((Date.now() - a.state.startedAt) / 60000),
        messages: a.state.messages,
        rvs: a.rvs,
      }));
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    }, 5000);

    // Send immediately on connect
    const initial = Object.values(agents).map(a => ({
      name: a.name,
      status: a.state.status,
      uptime: Math.floor((Date.now() - a.state.startedAt) / 60000),
      messages: a.state.messages,
      rvs: a.rvs,
    }));
    res.write(`data: ${JSON.stringify(initial)}\n\n`);

    req.on('close', () => {
      clearInterval(interval);
    });
  });

  // GET /api/status — full system status snapshot
  router.get('/', (req, res) => {
    const agentList = Object.values(agents);
    const status = {
      system: {
        name: 'Linux StudEx Agent OS',
        version: '1.0.0',
        totalVms: 14,
        agentsOnline: agentList.filter(a => a.state.status === 'online').length,
        totalMessages: agentList.reduce((s, a) => s + a.state.messages, 0),
        startedAt: Math.min(...agentList.map(a => a.state.startedAt)),
      },
      agents: agentList.map(a => a.status),
    };
    res.json(status);
  });

  return router;
}
