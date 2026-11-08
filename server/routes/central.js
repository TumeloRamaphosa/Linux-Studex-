import { Router } from 'express';
import {
  assertDropAuthorized,
  centralDropPolicy,
  dropReport,
  listMarkdown,
  readMarkdown,
} from '../lib/central-store.js';

export default function centralRoutes() {
  const router = Router();

  router.get('/', (req, res) => {
    const policy = centralDropPolicy();
    res.json({
      name: 'Agent Central',
      root: 'agent-central',
      files: listMarkdown(),
      drop: {
        enabled: policy.enabled,
        auth: policy.tokenRequired ? 'token' : policy.enabled ? 'open-when-enabled' : 'disabled',
        failClosed: policy.failClosed,
      },
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
      assertDropAuthorized(req);
      const saved = dropReport({
        agent: req.body?.agent,
        owner: req.body?.owner,
        source: req.body?.source,
        date: req.body?.date,
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
