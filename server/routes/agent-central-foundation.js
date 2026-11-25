import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_ROOT = path.resolve(__dirname, '..', '..', 'agent-central', 'foundation', 'data');

const ALLOWED = {
  index: 'index.json',
  'work-submissions': 'work-submissions.json',
  'overview-robusca-chief-of-staff': 'overviews/robusca-chief-of-staff.json',
  'agent-robusca-chief-of-staff': 'agents/robusca-chief-of-staff.json',
};

function loadRecord(key) {
  const rel = ALLOWED[key];
  if (!rel) {
    const err = new Error('Not found');
    err.status = 404;
    throw err;
  }
  const abs = path.resolve(DATA_ROOT, rel);
  const rootWithSep = DATA_ROOT.endsWith(path.sep) ? DATA_ROOT : DATA_ROOT + path.sep;
  if (!abs.startsWith(rootWithSep)) {
    const err = new Error('Not found');
    err.status = 404;
    throw err;
  }
  if (!fs.existsSync(abs)) {
    const err = new Error('Not found');
    err.status = 404;
    throw err;
  }
  return JSON.parse(fs.readFileSync(abs, 'utf8'));
}

export default function agentCentralFoundationRoutes() {
  const router = Router();

  router.get('/', (req, res) => {
    res.json({
      name: 'Agent Central foundation API',
      classification: 'public-internal-summary',
      records: Object.keys(ALLOWED).map((key) => ({
        key,
        href: `/api/agent-central/foundation/${key}`,
      })),
    });
  });

  router.get('/:key', (req, res) => {
    try {
      res.json(loadRecord(req.params.key));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  });

  return router;
}
