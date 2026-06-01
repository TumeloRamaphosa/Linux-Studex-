import BaseAgent from './base.js';

/**
 * OpenHuman — Platform / Deployment.
 * Manages containers, networks, deployments across the farm.
 */
export default class OpenHumanAgent extends BaseAgent {
  constructor() {
    super({
      name: 'openhuman',
      role: 'PLATFORM / DEPLOYMENT',
      rvs: 'RVS3',
      disk: '20GB',
      cpu: '2 vCPU',
      ram: '4GB',
      port: 3002,
      color: '#00C9A7',
      personality: 'infrastructure-first',
    });

    this.containers = [
      { name: 'ollama-main', status: 'running', image: 'ollama/ollama:latest', port: 11434 },
      { name: 'n8n-main', status: 'running', image: 'n8nio/n8n:latest', port: 5678 },
      { name: 'redis-cache', status: 'running', image: 'redis:7-alpine', port: 6379 },
      { name: 'traefik', status: 'running', image: 'traefik:v3.0', port: 80 },
      { name: 'postgres-main', status: 'running', image: 'postgres:16-alpine', port: 5432 },
      { name: 'prometheus', status: 'running', image: 'prom/prometheus:latest', port: 9090 },
      { name: 'grafana', status: 'running', image: 'grafana/grafana:latest', port: 3000 },
      { name: 'mqtt-broker', status: 'idle', image: 'eclipse-mosquitto:2', port: 1883 },
    ];

    this.deployments = [];
  }

  async handleMessage(msg) {
    const lower = msg.toLowerCase();

    if (lower.includes('container') || lower.includes('containers') || lower.includes('list')) {
      const lines = this.containers.map(
        c => `${c.name} [${c.status}] ${c.image} :${c.port}`
      );
      return `${this.containers.filter(c => c.status === 'running').length}/${this.containers.length} containers running.\n${lines.join('\n')}`;
    }

    if (lower.includes('deploy')) {
      const match = lower.match(/farm\s*(\d+)/) || lower.match(/rvs\s*(\d+)/i);
      const nodeNum = match ? match[1] : null;
      if (nodeNum && nodeNum >= 5 && nodeNum <= 14) {
        const name = `farm-node-${nodeNum}`;
        this.deployments.push({ name, node: `RVS${nodeNum}`, started: Date.now(), status: 'deploying' });
        this.logger.decision('Deploy', `Deploying ${name} (RVS${nodeNum})`);
        return `Deploying RVS${nodeNum} (${name})... Estimated completion: ${Math.floor(30 + Math.random() * 30)}s.`;
      }
      if (lower.includes('all')) {
        this.logger.decision('Deploy', 'Deploying all farm nodes (RVS5-14)');
        return 'Deploying all 10 farm nodes in parallel... This will take ~90s.';
      }
      return 'Usage: deploy farm <5-14> or deploy all';
    }

    if (lower.includes('restart') || lower.includes('stop') || lower.includes('start')) {
      const action = lower.includes('restart') ? 'restart' : lower.includes('stop') ? 'stop' : 'start';
      const target = this.containers.find(c => lower.includes(c.name));
      if (target) {
        target.status = action === 'stop' ? 'stopped' : 'running';
        this.logger.decision(action.charAt(0).toUpperCase() + action.slice(1), `${target.name} container`);
        return `${action.charAt(0).toUpperCase() + action.slice(1)}ing ${target.name}... Done.`;
      }
      return `Usage: ${action} <container-name>`;
    }

    if (lower.includes('network') || lower.includes('networks')) {
      return `3 networks configured:\n- frontend (10.0.1.0/24) — traefik, dashboard\n- backend (10.0.2.0/24) — ollama, n8n, redis\n- db (10.0.3.0/24) — postgres, prometheus`;
    }

    if (lower.includes('logs') || lower.includes('metrics') || lower.includes('resource')) {
      return `CPU: 42% | RAM: 3.1/4GB | Disk: 12/20GB | Network: 1.2 Gbps in / 340 Mbps out`;
    }

    return `Platform stable. ${this.containers.filter(c => c.status === 'running').length} containers running. ${this.deployments.length} active deployments.`;
  }
}
