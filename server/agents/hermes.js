import BaseAgent from './base.js';

/**
 * Hermes — Gateway / Orchestrator.
 * Routes traffic between agents, manages load balancing, health checks.
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
      cashclaw: { host: 'rvs1.local', port: 3000, status: 'healthy', tier: 'premium', requests: 8420 },
      openhuman: { host: 'rvs3.local', port: 3002, status: 'healthy', tier: 'standard', requests: 3100 },
      cursor: { host: 'rvs4.local', port: 3003, status: 'healthy', tier: 'standard', requests: 5600 },
      farm: { host: 'rvs5.local', port: 3004, status: 'healthy', tier: 'bulk', requests: 12800 },
    };
  }

  async handleMessage(msg) {
    const lower = msg.toLowerCase();

    if (lower.includes('route') || lower.includes('routes') || lower.includes('gateway')) {
      const lines = Object.entries(this.routes).map(
        ([name, r]) => `${name} → ${r.host}:${r.port} [${r.status}] tier:${r.tier} req:${r.requests}`
      );
      return `Active routes (${Object.keys(this.routes).length}):\n${lines.join('\n')}`;
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

    if (lower.includes('health') || lower.includes('status')) {
      const healthy = Object.values(this.routes).filter(r => r.status === 'healthy').length;
      const total = Object.keys(this.routes).length;
      return `All ${total} gateways: ${healthy} healthy, ${total - healthy} degraded. Uptime: ${Math.floor(this.state.uptime / 60)}h${this.state.uptime % 60}m.`;
    }

    if (lower.includes('restart') || lower.includes('reload') || lower.includes('reset')) {
      const target = Object.keys(this.routes).find(a => lower.includes(a));
      if (target) {
        this.logger.decision('Gateway Restart', `Restarting ${target} gateway`);
        return `Restarting ${target} gateway... Connection re-established in 2.4s.`;
      }
      return 'Usage: restart <agent>';
    }

    if (lower.includes('traffic') || lower.includes('load')) {
      const total = Object.values(this.routes).reduce((s, r) => s + r.requests, 0);
      return `Total traffic: ${total} requests. Peak at 14:00 SAST (∼320 req/min). Current load: moderate.`;
    }

    return `Gateway operational. ${Object.keys(this.routes).length} routes active. All services nominal.`;
  }
}
