import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import centralRoutes from '../routes/central.js';
import agentCentralFoundationRoutes from '../routes/agent-central-foundation.js';
import { resolveMarkdown } from '../lib/central-store.js';
import {
  isPublicStaticRequest,
  resolvePublicStaticPath,
} from '../lib/public-static-guard.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        server,
        base: `http://127.0.0.1:${port}`,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

async function get(url) {
  const res = await fetch(url);
  const text = await res.text();
  return { status: res.status, text };
}

function buildSmokeApp() {
  const app = express();
  app.use(express.json());
  app.get('/agent-central/*', (req, res) => {
    try {
      const rel = decodeURIComponent(req.path.replace(/^\/agent-central\//, ''));
      const { abs } = resolveMarkdown(rel);
      if (!fs.existsSync(abs)) return res.status(404).send('Not found');
      res.type('text/markdown').sendFile(abs);
    } catch (err) {
      res.status(err.status || 400).json({ error: err.message });
    }
  });
  app.use((req, res, next) => {
    try {
      if (!isPublicStaticRequest(req.method, req.path)) return next();
      const abs = resolvePublicStaticPath(REPO_ROOT, req.path);
      return res.sendFile(abs);
    } catch {
      return res.status(404).send('Not found');
    }
  });
  app.use('/api/central', centralRoutes());
  app.use('/api/agent-central/foundation', agentCentralFoundationRoutes());
  return app;
}

test('smoke: static confinement and foundation index', async () => {
  const ctx = await listen(buildSmokeApp());
  try {
    assert.equal((await get(`${ctx.base}/.git/HEAD`)).status, 404);
    assert.equal((await get(`${ctx.base}/agent-central.html`)).status, 200);
    const mem = await get(`${ctx.base}/agent-central/memory/x.md`);
    assert.equal(mem.status, 403);
    const idx = await get(`${ctx.base}/api/agent-central/foundation/index`);
    assert.equal(idx.status, 200);
    assert.match(idx.text, /"notionCanons"/);
    const drop = await fetch(`${ctx.base}/api/central/drop`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    assert.equal(drop.status, 503);
  } finally {
    await ctx.close();
  }
});

test('smoke: agent-central.html references foundation API', () => {
  const html = fs.readFileSync(path.join(REPO_ROOT, 'agent-central.html'), 'utf8');
  assert.match(html, /\/api\/agent-central\/foundation\/index/);
});
