import { Router } from 'express';

const router = Router();

/**
 * Mount orchestration routes.
 * @param {AgentOrchestrator} orchestrator
 */
export default function orchestrateRoutes(orchestrator) {
  // GET /api/orchestrate — orchestrator status
  router.get('/', (req, res) => {
    res.json(orchestrator.status);
  });

  // GET /api/orchestrate/agents — list all registered agents
  router.get('/agents', (req, res) => {
    res.json(orchestrator.list());
  });

  // POST /api/orchestrate/send — send a message agent → agent
  router.post('/send', async (req, res) => {
    const { from, to, message } = req.body;
    if (!from || !to || !message) {
      return res.status(400).json({ error: 'from, to, and message required' });
    }
    try {
      const response = await orchestrator.send(from, to, message);
      res.json({ from, to, message, response });
    } catch (err) {
      res.status(404).json({ error: err.message });
    }
  });

  // POST /api/orchestrate/task — route a task to the best agent(s)
  router.post('/task', async (req, res) => {
    const { from, task } = req.body;
    if (!task) return res.status(400).json({ error: 'task description required' });

    try {
      const result = await orchestrator.routeTask(from || 'user', task);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/orchestrate/broadcast — broadcast to all agents
  router.post('/broadcast', async (req, res) => {
    const { from, message } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });

    const results = await orchestrator.broadcast(from || 'user', message);
    res.json({ from: from || 'user', message, responses: results });
  });

  // POST /api/orchestrate/workflow — execute a multi-step workflow
  router.post('/workflow', async (req, res) => {
    const { name, steps } = req.body;
    if (!name || !steps || !Array.isArray(steps)) {
      return res.status(400).json({ error: 'name and steps[] required' });
    }

    try {
      const result = await orchestrator.startWorkflow(name, steps);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Blackboard endpoints ───────────────────────────────────────────────

  // GET /api/orchestrate/blackboard — all blackboard facts
  router.get('/blackboard', (req, res) => {
    res.json(orchestrator.getAllFacts());
  });

  // GET /api/orchestrate/blackboard/:key — get a specific fact
  router.get('/blackboard/:key', (req, res) => {
    const fact = orchestrator.getFact(req.params.key);
    if (!fact) return res.status(404).json({ error: `Key '${req.params.key}' not found` });
    res.json(fact);
  });

  // POST /api/orchestrate/blackboard — set a fact
  router.post('/blackboard', (req, res) => {
    const { key, value, source } = req.body;
    if (!key || value === undefined) {
      return res.status(400).json({ error: 'key and value required' });
    }
    orchestrator.setFact(key, value, source || 'api');
    res.json({ key, value, status: 'stored' });
  });

  // DELETE /api/orchestrate/blackboard/:key — delete a fact
  router.delete('/blackboard/:key', (req, res) => {
    orchestrator.deleteFact(req.params.key);
    res.json({ key: req.params.key, status: 'deleted' });
  });

  // ── Message log ────────────────────────────────────────────────────────

  // GET /api/orchestrate/log — inter-agent message history
  router.get('/log', (req, res) => {
    const count = parseInt(req.query.count) || 50;
    res.json({ messages: orchestrator.getMessageLog(count) });
  });

  return router;
}
