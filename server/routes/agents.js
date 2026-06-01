import { Router } from 'express';

const router = Router();

/**
 * Mount agent routes onto an Express router.
 * @param {Object<string, BaseAgent>} agents - Map of agent instances
 */
export default function agentRoutes(agents) {
  // GET /api/agents — list all agents
  router.get('/', (req, res) => {
    const list = Object.values(agents).map(a => ({
      name: a.name,
      role: a.role,
      rvs: a.rvs,
      status: a.state.status,
      uptime: a.state.uptime,
    }));
    res.json(list);
  });

  // GET /api/agents/:name — agent detail + status
  router.get('/:name', (req, res) => {
    const agent = agents[req.params.name];
    if (!agent) return res.status(404).json({ error: `Agent '${req.params.name}' not found` });
    res.json(agent.status);
  });

  // POST /api/agents/:name/chat — send a message to an agent
  router.post('/:name/chat', async (req, res) => {
    const agent = agents[req.params.name];
    if (!agent) return res.status(404).json({ error: `Agent '${req.params.name}' not found` });

    const { message } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    try {
      const response = await agent.chat(message.trim());
      res.json({
        agent: agent.name,
        response,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/agents/:name/logs — recent agent logs
  router.get('/:name/logs', (req, res) => {
    const agent = agents[req.params.name];
    if (!agent) return res.status(404).json({ error: `Agent '${req.params.name}' not found` });

    const lines = parseInt(req.query.lines) || 50;
    const logs = agent.logger.getRecent(lines);
    res.json({ agent: agent.name, logs, lines });
  });

  return router;
}
