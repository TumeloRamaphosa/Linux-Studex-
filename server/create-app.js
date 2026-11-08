/**
 * Express app factory for server + smoke tests (no listen).
 */
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import agentRoutes from './routes/agents.js';
import statusRoutes from './routes/status.js';
import orchestrateRoutes from './routes/orchestrate.js';
import sandboxRoutes from './routes/sandbox.js';
import mcpRoutes from './routes/mcp.js';
import llmMeshRoutes from './routes/llm-mesh.js';
import networkRoutes from './routes/network.js';
import centralRoutes from './routes/central.js';
import agentCentralFoundationRoutes from './routes/agent-central-foundation.js';
import { resolveMarkdown } from './lib/central-store.js';
import {
  isPublicStaticRequest,
  resolvePublicStaticPath,
} from './lib/public-static-guard.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

export function createApp({ agents, orchestrator, sandboxManager, mcpServer, llmMesh }) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/', (req, res) => res.redirect('/dashboard.html'));

  app.get('/agent-central/*', (req, res) => {
    try {
      const rel = decodeURIComponent(req.path.replace(/^\/agent-central\//, ''));
      const { abs } = resolveMarkdown(rel);
      if (!fs.existsSync(abs)) return res.status(404).type('text/plain').send('Not found');
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
    } catch (err) {
      return res.status(err.status || 404).type('text/plain').send('Not found');
    }
  });

  app.use('/api/agents', agentRoutes(agents));
  app.use('/api/status', statusRoutes(agents));
  app.use('/api/orchestrate', orchestrateRoutes(orchestrator));
  app.use('/api/sandbox', sandboxRoutes(sandboxManager));
  app.use('/api/mcp', mcpRoutes(mcpServer));
  app.use('/api/llm-mesh', llmMeshRoutes(llmMesh));
  app.use('/api/network', networkRoutes());
  app.use('/api/central', centralRoutes());
  app.use('/api/agent-central/foundation', agentCentralFoundationRoutes());

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      agents: Object.keys(agents).length,
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}
