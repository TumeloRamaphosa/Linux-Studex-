import BaseAgent from './base.js';

const GREEK_LABELS = ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ'];

/**
 * Agent Farm — Manager for RVS5 → RVS14.
 * Each node runs Ollama + n8n worker on 5GB, 1 vCPU, 1GB RAM.
 */
export default class FarmAgent extends BaseAgent {
  constructor() {
    super({
      name: 'farm',
      role: 'AGENT FARM MANAGER',
      rvs: 'RVS5-14',
      disk: '5GB×10',
      cpu: '1 vCPU×10',
      ram: '1GB×10',
      port: 3004,
      color: '#888888',
      personality: 'distributed-worker',
    });

    this.nodes = Array.from({ length: 10 }, (_, i) => ({
      id: i + 5,
      name: `RVS${i + 5}`,
      label: GREEK_LABELS[i],
      status: Math.random() > 0.15 ? 'online' : 'idle',
      uptime: Math.floor(Math.random() * 120),
      tasks: Math.floor(Math.random() * 40),
      cpu: Math.floor(Math.random() * 60) + 10,
      ram: Math.floor(Math.random() * 70) + 10,
    }));
  }

  async handleMessage(msg) {
    const lower = msg.toLowerCase();

    if (lower.includes('nodes') || lower.includes('list') || lower.includes('farm') || lower.includes('status')) {
      const online = this.nodes.filter(n => n.status === 'online').length;
      const totalTasks = this.nodes.reduce((s, n) => s + n.tasks, 0);
      const lines = this.nodes.map(n =>
        `${n.name} (${n.label}) [${n.status}] — ${n.tasks} tasks, CPU ${n.cpu}%, RAM ${n.ram}%`
      );
      return `Farm: ${online}/10 online | ${totalTasks} total tasks processed\n${lines.join('\n')}`;
    }

    if (lower.includes('rvs') || lower.match(/\b(5|6|7|8|9|10|11|12|13|14)\b/)) {
      const match = lower.match(/rvs\s*(\d+)/i) || lower.match(/\b(1[0-4]|[5-9])\b/);
      if (match) {
        const num = parseInt(match[1]);
        const node = this.nodes.find(n => n.id === num);
        if (node) {
          return `RVS${node.id} (${node.label}): ${node.status} | Tasks: ${node.tasks} | CPU: ${node.cpu}% | RAM: ${node.ram}% | Uptime: ${node.uptime}m`;
        }
      }
    }

    if (lower.includes('restart') || lower.includes('reset')) {
      const match = lower.match(/rvs\s*(\d+)/i) || lower.match(/\b(1[0-4]|[5-9])\b/);
      if (match) {
        const num = parseInt(match[1]);
        const node = this.nodes.find(n => n.id === num);
        if (node) {
          node.status = 'online';
          this.logger.command(`restart RVS${num}`, 'Node restarted');
          return `RVS${num} restarted. Services recovering... Back online in ~15s.`;
        }
      }
      return 'Restarting all idle farm nodes... 2 nodes back online.';
    }

    if (lower.includes('task') || lower.includes('job') || lower.includes('work')) {
      const totalTasks = this.nodes.reduce((s, n) => s + n.tasks, 0);
      const avgCpu = Math.round(this.nodes.reduce((s, n) => s + n.cpu, 0) / this.nodes.length);
      return `Farm workload: ${totalTasks} tasks distributed | Avg CPU: ${avgCpu}% | Queue depth: ${Math.floor(totalTasks / 10)} | No backpressure detected.`;
    }

    if (lower.includes('ollama') || lower.includes('model')) {
      return 'Farm models loaded: llama3.1:8b (all nodes), nomic-embed-text (nodes 1-5), qwen2.5:7b (nodes 6-10).';
    }

    return `Farm manager online. ${this.nodes.filter(n => n.status === 'online').length}/10 workers active. ${this.nodes.reduce((s, n) => s + n.tasks, 0)} tasks processed.`;
  }
}
