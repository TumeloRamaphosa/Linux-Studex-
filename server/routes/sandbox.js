import { Router } from 'express';
import SandboxManager from '../lib/sandbox.js';

const router = Router();

/**
 * Mount sandbox routes.
 * @param {SandboxManager} sandboxManager
 */
export default function sandboxRoutes(sandboxManager) {
  // GET /api/sandbox/templates — list available templates
  router.get('/templates', (req, res) => {
    res.json({ templates: SandboxManager.listTemplates() });
  });

  // GET /api/sandbox — list active sandboxes
  router.get('/', (req, res) => {
    res.json({
      sandboxes: sandboxManager.list(),
      stats: sandboxManager.stats,
    });
  });

  // GET /api/sandbox/stats — sandbox system stats
  router.get('/stats', (req, res) => {
    res.json(sandboxManager.stats);
  });

  // POST /api/sandbox/spawn — create a new sandbox
  router.post('/spawn', (req, res) => {
    const { template, ttlMs } = req.body;
    try {
      const result = sandboxManager.spawn(template, ttlMs);
      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // POST /api/sandbox/:id/run — execute code in a sandbox
  router.post('/:id/run', (req, res) => {
    const { code, language, timeout } = req.body;
    if (!code) return res.status(400).json({ error: 'code is required' });

    try {
      const result = sandboxManager.run(req.params.id, code, { language, timeout });
      res.json({
        sandboxId: req.params.id,
        ...result,
      });
    } catch (err) {
      res.status(404).json({ error: err.message });
    }
  });

  // GET /api/sandbox/:id/files — list files in sandbox workspace
  router.get('/:id/files', (req, res) => {
    try {
      const files = sandboxManager.listFiles(req.params.id, req.query.path);
      res.json({ sandboxId: req.params.id, files });
    } catch (err) {
      res.status(404).json({ error: err.message });
    }
  });

  // GET /api/sandbox/:id/files/:path(*) — read a file
  router.get('/:id/files/:path(*)', (req, res) => {
    try {
      const content = sandboxManager.readFile(req.params.id, req.params.path);
      if (content === null) return res.status(404).json({ error: 'File not found' });
      res.json({ sandboxId: req.params.id, path: req.params.path, content });
    } catch (err) {
      res.status(404).json({ error: err.message });
    }
  });

  // POST /api/sandbox/:id/files — write a file
  router.post('/:id/files', (req, res) => {
    const { path: filePath, content } = req.body;
    if (!filePath || content === undefined) {
      return res.status(400).json({ error: 'path and content required' });
    }
    try {
      const result = sandboxManager.writeFile(req.params.id, filePath, content);
      res.json(result);
    } catch (err) {
      res.status(404).json({ error: err.message });
    }
  });

  // DELETE /api/sandbox/:id — destroy a sandbox
  router.delete('/:id', (req, res) => {
    sandboxManager.destroy(req.params.id);
    res.json({ sandboxId: req.params.id, status: 'destroyed' });
  });

  return router;
}
