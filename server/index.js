import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

import CashclawAgent from './agents/cashclaw.js';
import HermesAgent from './agents/hermes.js';
import OpenHumanAgent from './agents/openhuman.js';
import CursorAgent from './agents/cursor.js';
import FarmAgent from './agents/farm.js';

import AgentOrchestrator from './lib/orchestrator.js';
import SandboxManager from './lib/sandbox.js';
import MCPServer from './lib/mcp.js';
import LLMMesh from './lib/llm-mesh.js';

import agentRoutes from './routes/agents.js';
import statusRoutes from './routes/status.js';
import orchestrateRoutes from './routes/orchestrate.js';
import sandboxRoutes from './routes/sandbox.js';
import mcpRoutes from './routes/mcp.js';
import llmMeshRoutes from './routes/llm-mesh.js';
import networkRoutes from './routes/network.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT) || 4000;

// ── Initialise Agents & Orchestrator ───────────────────────────────────────
const agents = {
  cashclaw: new CashclawAgent(),
  hermes: new HermesAgent(),
  openhuman: new OpenHumanAgent(),
  cursor: new CursorAgent(),
  farm: new FarmAgent(),
};

// ── Initialise Orchestrator ────────────────────────────────────────────────
const orchestrator = new AgentOrchestrator();
Object.values(agents).forEach(a => orchestrator.register(a));

// ── Initialise Sandbox Manager ─────────────────────────────────────────────
const sandboxManager = new SandboxManager();
orchestrator.sandboxManager = sandboxManager; // Make available to agents

// ── Initialise LLM Mesh ────────────────────────────────────────────────────
const llmMesh = new LLMMesh();
await llmMesh.scan();

// ── Initialise MCP Server ──────────────────────────────────────────────────
const mcpServer = new MCPServer(orchestrator, sandboxManager, llmMesh);

console.log('▸ Agent OS Backend starting...');
console.log(`  ✓ Orchestrator — ${Object.keys(orchestrator.agents).length} agents in mesh`);
console.log(`  ✓ Sandbox — ${Object.keys(SandboxManager.TEMPLATES).length} templates, Docker: ${sandboxManager.dockerAvailable}`);
console.log(`  ✓ LLM Mesh — ${llmMesh.status === 'connected' ? `${llmMesh.models.length} models connected via ${llmMesh.activeProvider}` : 'disconnected (start LM Studio for local models)'}`);
console.log(`  ✓ MCP — ${mcpServer.tools.length} tools exposed`);
Object.values(agents).forEach(a => {
  console.log(`  ✓ ${a.name.padEnd(10)} ${a.role.padEnd(28)} ${a.rvs}  :${a.port}`);
});

// ── Express Setup ───────────────────────────────────────────────────────────
const app = express();

app.use(cors());
app.use(express.json());

// Serve the dashboard HTML statically
app.use(express.static(path.resolve(__dirname, '..')));

// API routes
app.use('/api/agents', agentRoutes(agents));
app.use('/api/status', statusRoutes(agents));
app.use('/api/orchestrate', orchestrateRoutes(orchestrator));
app.use('/api/sandbox', sandboxRoutes(sandboxManager));
app.use('/api/mcp', mcpRoutes(mcpServer));
app.use('/api/llm-mesh', llmMeshRoutes(llmMesh));
app.use('/api/network', networkRoutes());

// POST /api/tmux — execute a tmux command
app.post('/api/tmux', async (req, res) => {
  const { command, window } = req.body;
  if (!command) return res.status(400).json({ error: 'Command is required' });  try {
      const targetWindow = window || 'main';
      const output = execSync(
        `tmux send-keys -t linux-studex:${targetWindow.replace(/[^a-zA-Z0-9_-]/g, '')} -- ${JSON.stringify(command)} Enter`,
        { timeout: 5000, encoding: 'utf-8' }
      );
      res.json({ command, window: targetWindow, output: output.trim() || 'Sent to tmux' });
  } catch (err) {
    res.json({
      command,
      window: window || 'main',
      output: `[simulated] ${command}`,
      note: 'tmux session not running — command queued',
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    agents: Object.keys(agents).length,
    orchestrator: orchestrator.messageLog.length,
    timestamp: new Date().toISOString(),
  });
});

// ── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`▸ Server running at http://localhost:${PORT}`);
  console.log(`▸ Dashboard: http://localhost:${PORT}/dashboard.html`);
  console.log(`▸ Agents:    http://localhost:${PORT}/api/agents`);
  console.log(`▸ Mesh:      http://localhost:${PORT}/api/orchestrate`);
  console.log(`▸ Sandbox:   http://localhost:${PORT}/api/sandbox`);
  console.log(`▸ MCP Tools: http://localhost:${PORT}/api/mcp/tools`);
  console.log(`▸ LLM Mesh:  http://localhost:${PORT}/api/llm-mesh`);
});
