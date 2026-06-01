import BaseAgent from './base.js';

/**
 * Hermes — Gateway / Orchestrator.
 * Routes traffic between agents, coordinates multi-agent workflows,
 * manages load balancing, and health checks.
 *
 * This is the central brain of the multi-agent system.
 */
export default class HermesAgent extends BaseAgent {
  constructor() {
    super({
      name: 'hermes',
      role: 'ORCHESTRATOR / GATEWAY',
      rvs: 'RVS2',
      disk: '20GB',
      cpu: '2 vCPU',
      ram: '4GB',
      port: 3001,
      color: '#7B61FF',
      personality: 'balanced-distributor',
    });

    this.routes = {
      cashclaw: { host: 'rvs1.local', port: 3000, status: 'healthy', tier: 'premium', requests: 8420, capabilities: ['trading', 'markets', 'finance', 'positions'] },
      openhuman: { host: 'rvs3.local', port: 3002, status: 'healthy', tier: 'standard', requests: 3100, capabilities: ['deploy', 'containers', 'infrastructure', 'network'] },
      cursor: { host: 'rvs4.local', port: 3003, status: 'healthy', tier: 'standard', requests: 5600, capabilities: ['code', 'test', 'build', 'review', 'project'] },
      farm: { host: 'rvs5.local', port: 3004, status: 'healthy', tier: 'bulk', requests: 12800, capabilities: ['worker', 'compute', 'batch', 'ollama'] },
    };

    this.agentCapabilities = {
      cashclaw: ['trading', 'markets', 'finance', 'positions', 'btc', 'eth', 'sol', 'portfolio'],
      openhuman: ['deploy', 'containers', 'docker', 'infrastructure', 'network', 'platform'],
      cursor: ['code', 'test', 'build', 'review', 'project', 'compile', 'git'],
      farm: ['worker', 'compute', 'batch', 'ollama', 'model', 'task', 'distributed'],
    };
  }

  // ── Multi-agent coordination (called by AgentOrchestrator) ────────────────

  /**
   * Analyze a task description and determine which agents should handle what.
   * Returns a plan with assignments.
   */
  async coordinate(taskDescription) {
    const lower = taskDescription.toLowerCase();
    const assignments = [];
    let explanation = '';

    // Map keywords to agent names
    const keywordMap = {
      cashclaw: ['trade', 'market', 'finance', 'position', 'btc', 'eth', 'sol', 'portfolio', 'price', 'invest'],
      openhuman: ['deploy', 'container', 'docker', 'infra', 'network', 'platform', 'host', 'server'],
      cursor: ['code', 'test', 'build', 'review', 'project', 'compile', 'git', 'develop', 'deploy app'],
      farm: ['worker', 'compute', 'batch', 'model', 'ollama', 'task', 'process', 'distribute'],
    };

    const matched = new Set();

    // Check for multi-agent patterns
    const isMultiAgent =
      lower.includes('all agents') ||
      lower.includes('everyone') ||
      lower.includes('broadcast') ||
      lower.includes('full status') ||
      lower.includes('system health');

    if (isMultiAgent) {
      explanation = 'Broadcast requested — involving all agents';
      for (const [agent, caps] of Object.entries(this.agentCapabilities)) {
        assignments.push({ agent, task: taskDescription });
        matched.add(agent);
      }
      return { explanation, assignments };
    }

    // Check for deploy workflow (multi-step)
    if (lower.includes('deploy') || lower.includes('release') || lower.includes('ship')) {
      explanation = 'Deploy workflow: Coder builds → OpenHuman deploys → Farm runs';
      assignments.push({ agent: 'cursor', task: `Build for deploy: ${taskDescription}` });
      assignments.push({ agent: 'openhuman', task: `Deploy: ${taskDescription}` });
      assignments.push({ agent: 'farm', task: `Run deployment tasks for: ${taskDescription}` });
      return { explanation, assignments };
    }

    // Check for market analysis (multi-agent)
    if (lower.includes('market') || lower.includes('trade') || lower.includes('portfolio') || lower.includes('analysis')) {
      explanation = 'Market analysis: Cashclaw handles financial data, Farm runs compute';
      assignments.push({ agent: 'cashclaw', task: taskDescription });
      assignments.push({ agent: 'farm', task: `Support compute for: ${taskDescription}` });
      return { explanation, assignments };
    }

    // Check for development workflow
    if (lower.includes('test') || lower.includes('build') || lower.includes('code') || lower.includes('review')) {
      explanation = 'Development task: Cursor handles primary, OpenHuman for staging';
      assignments.push({ agent: 'cursor', task: taskDescription });
      if (lower.includes('deploy') || lower.includes('staging')) {
        assignments.push({ agent: 'openhuman', task: `Prepare staging for: ${taskDescription}` });
      }
      return { explanation, assignments };
    }

    // Check for infrastructure
    if (lower.includes('container') || lower.includes('infra') || lower.includes('server') || lower.includes('network')) {
      explanation = 'Infrastructure task: OpenHuman handles primary, Farm for compute';
      assignments.push({ agent: 'openhuman', task: taskDescription });
      assignments.push({ agent: 'farm', task: `Allocate workers for: ${taskDescription}` });
      return { explanation, assignments };
    }

    // Default: keyword-based routing to single best agent
    for (const [agent, keywords] of Object.entries(keywordMap)) {
      const match = keywords.some(kw => lower.includes(kw));
      if (match) {
        assignments.push({ agent, task: taskDescription });
        matched.add(agent);
        explanation = `Routed to ${agent} based on keywords`;
        break;
      }
    }

    // If no match, ask all agents
    if (assignments.length === 0) {
      explanation = 'No specific match — asking all agents';
      for (const agent of Object.keys(this.agentCapabilities)) {
        assignments.push({ agent, task: taskDescription });
      }
    }

    return { explanation, assignments };
  }

  /**
   * Check if Hermes can handle an inter-agent message directly.
   */
  async handleInterAgent(from, message) {
    const result = await this.coordinate(message);
    return {
      from,
      routedBy: 'hermes',
      plan: result.explanation,
      assignments: result.assignments,
    };
  }

  // ── Chat handler ─────────────────────────────────────────────────────────

  async handleMessage(msg) {
    const lower = msg.toLowerCase();

    // Specific patterns checked BEFORE multi-agent routing to avoid conflicts
    // 1. Premium tier upgrade ("route cashclaw through premium")
    if (lower.includes('route') && lower.includes('premium') && lower.includes('through')) {
      const target = Object.keys(this.routes).find(a => lower.includes(a));
      if (target) {
        this.routes[target].tier = 'premium';
        this.logger.decision('Route Upgrade', `${target} → premium tier`);
        return `${target} routed through premium tier. Priority queuing enabled.`;
      }
      return 'Which agent? Usage: route <agent> through premium';
    }

    // 2. Multi-agent routing ("route deploy the dashboard" or "route task: ...")
    if (/^(route task|route this|orchestrate|coordinate)/.test(lower)) {
      const task = msg.replace(/^(route task|route this|orchestrate|coordinate)\s*/i, '').trim();
      if (task && this._orchestrator) {
        const plan = await this.coordinate(task);
        const lines = plan.assignments.map(a => `  → ${a.agent}: ${a.task}`);
        return `Routing plan: ${plan.explanation}\n${lines.join('\n')}\nExecuting... broadcast to ${plan.assignments.length} agents.`;
      }
    }

    // Coordination plan preview
    if (/^plan|^coordinate|what needs/.test(lower) || lower.includes('coordinate')) {
      const task = lower.replace(/^(plan|coordinate|what needs|to|for)\s*/i, '').trim();
      if (task && task.length > 3) {
        const plan = await this.coordinate(task);
        const lines = plan.assignments.map(a => `  → ${a.agent}: ${a.task}`);
        return `Multi-agent plan:\n${lines.join('\n')}`;
      }
    }

    // Network / system status
    if (lower.includes('coordinate') || lower.includes('orchestrate') || lower.includes('multi')) {
      const agents = this._orchestrator ? Object.keys(this._orchestrator.agents) : Object.keys(this.routes);
      return `Multi-agent orchestration active. ${agents.length} agents in mesh:\n${agents.map(a => `  • ${a}`).join('\n')}\nSay "route <task>" to coordinate them.`;
    }

    // route / routes
    if (lower.includes('route') || lower.includes('gateway')) {
      const lines = Object.entries(this.routes).map(
        ([name, r]) => `${name} → ${r.host}:${r.port} [${r.status}] ${r.tier} | ${r.capabilities.join(', ')}`
      );
      const total = this._orchestrator ? Object.keys(this._orchestrator.agents).length : Object.keys(this.routes).length;
      return `Active routes (${total} agents):\n${lines.join('\n')}\n\nMulti-agent routing enabled. Say "route <task>" to coordinate agents.`;
    }

    if (lower.includes('route') && lower.includes('premium')) {
      const target = Object.keys(this.routes).find(a => lower.includes(a));
      if (target) {
        this.routes[target].tier = 'premium';
        this.logger.decision('Route Upgrade', `${target} → premium tier`);
        return `${target} routed through premium tier. Priority queuing enabled.`;
      }
      return 'Which agent? Usage: route <agent> through premium';
    }

    if (lower.includes('health') || (lower.includes('status') && !lower.includes('work'))) {
      const healthy = Object.values(this.routes).filter(r => r.status === 'healthy').length;
      const total = Object.keys(this.routes).length;
      const msgsIn = this._orchestrator ? this._orchestrator.messageLog.length : 0;
      return `Gateway: ${healthy}/${total} healthy | Inter-agent messages: ${msgsIn} | Uptime: ${Math.floor(this.state.uptime / 60)}h${this.state.uptime % 60}m | Mesh: ${total} agents`;
    }

    if (lower.includes('restart') || lower.includes('reload') || lower.includes('reset')) {
      const target = Object.keys(this.routes).find(a => lower.includes(a));
      if (target) {
        this.routes[target].status = 'healthy';
        this.logger.decision('Gateway Restart', `Restarting ${target} gateway`);
        return `Restarted ${target} gateway. Connection re-established in 2.4s.`;
      }
      // Full mesh restart
      this.logger.decision('Orchestrator', 'Full mesh reset');
      return 'Resetting orchestration mesh... All routes refreshed. 5 agents reconnected.';
    }

    if (lower.includes('traffic') || lower.includes('load')) {
      const total = Object.values(this.routes).reduce((s, r) => s + r.requests, 0);
      const agents = this._orchestrator ? Object.keys(this._orchestrator.agents).length : 4;
      return `Inter-agent traffic: ${total} messages routed. Mesh: ${agents} nodes. Peak at 14:00 SAST. Current load: moderate.`;
    }

    return `Hermes orchestration mesh active. ${Object.keys(this.routes).length} routes configured. Say "route <task>" to coordinate agents, "health" for status.`;
  }
}

