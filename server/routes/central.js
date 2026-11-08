import { Router } from 'express';
import { dropReport, listMarkdown, readMarkdown } from '../lib/central-store.js';

export default function centralRoutes() {
  const router = Router();

  router.get('/', (req, res) => {
    res.json({
      name: 'Agent Central',
      root: 'agent-central',
      files: listMarkdown(),
    });
  });

  router.get('/file', (req, res) => {
    try {
      res.json(readMarkdown(req.query.path));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  });

  router.post('/drop', (req, res) => {
    try {
      const saved = dropReport({
        agent: req.body?.agent,
        title: req.body?.title,
        body: req.body?.body,
      });
      res.status(201).json(saved);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  });

  return router;
}
