import { Router } from 'express';
import {
  assertDropAuthorized,
  assertProvenanceMatchesBinding,
  centralDropPolicy,
} from '../lib/central-drop-auth.js';
import { dropReport, listMarkdown, readMarkdown } from '../lib/central-store.js';

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
        configured: policy.configured,
        auth: policy.auth,
        failClosed: policy.failClosed,
        misconfigured: policy.misconfigured,
        reason: policy.reason,
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
      const binding = assertDropAuthorized(req);
      assertProvenanceMatchesBinding(req.body, binding);
      const saved = dropReport({
        binding,
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
