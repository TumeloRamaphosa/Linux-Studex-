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

    // ── Orgo-Style Sandboxed Environments ───────────────────────────────────
    this.environments = {
      'desktop-light': { template: 'Ubuntu 24.04 Desktop (XFCE)', vnc: true, bootMs: 800, status: 'ready', persistence: true },
      'desktop-full': { template: 'Ubuntu 24.04 Desktop (GNOME)', vnc: true, bootMs: 1200, status: 'ready', persistence: true },
      'browser-sandbox': { template: 'Chromium + Playwright', vnc: true, bootMs: 600, status: 'ready', persistence: false },
      'code-env': { template: 'VS Code + Python/Node/Go', vnc: true, bootMs: 900, status: 'ready', persistence: true },
    };
    this.activeEnvironments = [];

    // ── FeedHive Publishing Pipeline ────────────────────────────────────────
    this.contentPipeline = {
      postsPublished: 0,
      dailyTarget: 10,
      lastPublish: null,
      schedules: [],
      accounts: ['twitter/x', 'linkedin', 'instagram', 'facebook'],
    };

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

    // ── Orgo-Style Desktop Environments ─────────────────────────────────────

    if (lower.includes('environment') || lower.includes('desktop') || lower.includes('vnc') || lower.includes('orgo')) {
      return this._handleEnvironmentCommand(msg);
    }

    // ── FeedHive Publishing Pipeline ────────────────────────────────────────

    if (lower.includes('publish') || lower.includes('feedhive') || lower.includes('post to') || lower.includes('content pipeline') || lower.includes('naledi')) {
      return this._handleFeedHiveCommand(msg);
    }

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

    return `Platform stable. ${this.containers.filter(c => c.status === 'running').length} containers running. ${this.deployments.length} active deployments. ${this.activeEnvironments.length} sandbox environments active. ${this.contentPipeline.postsPublished} posts published today via FeedHive.`;
  }

  // ── Orgo-Style Desktop Environments ────────────────────────────────────────

  _handleEnvironmentCommand(msg) {
    const lower = msg.toLowerCase();

    // Spawn an environment (Orgo-style instant boot)
    if (lower.includes('spawn') || lower.includes('create') || lower.includes('boot') || lower.includes('start')) {
      let envType = 'desktop-light';
      if (lower.includes('full') || lower.includes('gnome')) envType = 'desktop-full';
      else if (lower.includes('browser') || lower.includes('chrome') || lower.includes('playwright')) envType = 'browser-sandbox';
      else if (lower.includes('code') || lower.includes('vscode') || lower.includes('dev')) envType = 'code-env';

      const tpl = this.environments[envType];
      if (!tpl) return `Unknown environment. Available: ${Object.keys(this.environments).join(', ')}`;

      const id = `env_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const env = {
        id,
        type: envType,
        template: tpl.template,
        vnc: tpl.vnc,
        vncPort: 5900 + this.activeEnvironments.length,
        bootMs: tpl.bootMs,
        status: 'booting',
        persistence: tpl.persistence,
        createdAt: Date.now(),
        commands: 0,
      };

      // Simulate instant boot (Orgo claims <1s)
      setTimeout(() => {
        env.status = 'running';
        this.logger.decision('Environment', `Spawned ${envType} (${id}) in ${tpl.bootMs}ms`);
      }, tpl.bootMs);

      this.activeEnvironments.push(env);
      const active = this.activeEnvironments.filter(e => e.status === 'running').length;
      return `🚀 Spawning <span class="yaml-key">${envType}</span> (${tpl.template})...\n  ID: ${id}\n  VNC: localhost:${env.vncPort} (${tpl.vnc ? 'enabled' : 'disabled'})\n  Boot time: ~${tpl.bootMs}ms\n  Persistence: ${tpl.persistence ? '✅ yes' : '❌ no'}\n  Active environments: ${active}`;
    }

    // List environments
    if (lower.includes('list') || lower.includes('active') || lower.includes('running')) {
      const active = this.activeEnvironments.filter(e => e.status === 'running');
      if (active.length === 0) {
        return `No active environments. Available templates:\n${Object.entries(this.environments).map(([k, v]) => `  • ${k}: ${v.template} (boot: ${v.bootMs}ms, persistence: ${v.persistence})`).join('\n')}`;
      }
      const lines = active.map(e =>
        `  ${e.id.slice(-8)} [${e.status}] ${e.type} on VNC:${e.vncPort} | ${Math.floor((Date.now() - e.createdAt) / 1000)}s uptime | ${e.commands} commands`
      );
      return `Active environments (${active.length}):\n${lines.join('\n')}`;
    }

    // Destroy environment
    if (lower.includes('destroy') || lower.includes('kill') || lower.includes('stop')) {
      const target = this.activeEnvironments.find(e => lower.includes(e.id) || lower.includes(e.type));
      if (target) {
        target.status = 'destroyed';
        this.logger.decision('Environment', `Destroyed ${target.type} (${target.id})`);
        return `Destroyed ${target.type} environment. Workspace files ${target.persistence ? 'persisted' : 'deleted'}.`;
      }
      return 'Which environment? Specify the ID or type.';
    }

    // Show templates
    if (lower.includes('templates') || lower.includes('types') || lower.includes('available')) {
      const lines = Object.entries(this.environments).map(([k, v]) =>
        `  • ${k.padEnd(18)} ${v.template.padEnd(40)} ${v.bootMs}ms boot  ${v.persistence ? 'persistent' : 'ephemeral'}`
      );
      return `Available environments (Orgo-compatible):\n${lines.join('\n')}\n\nSay "spawn <type>" to create. Types: ${Object.keys(this.environments).join(', ')}`;
    }

    return 'Environment command not recognized. Say "list environments", "spawn desktop-light", or "templates".';
  }

  // ── FeedHive Content Pipeline ─────────────────────────────────────────────

  _handleFeedHiveCommand(msg) {
    const lower = msg.toLowerCase();

    // Post content via FeedHive
    if (lower.includes('post') || lower.includes('publish')) {
      let platform = 'twitter';
      if (lower.includes('linkedin')) platform = 'linkedin';
      else if (lower.includes('instagram')) platform = 'instagram';
      else if (lower.includes('facebook')) platform = 'facebook';

      // Extract content after "post ..." or "publish ..."
      const contentMatch = msg.match(/post\s+(?:to\s+\w+\s+)?([\s\S]+)/i) || msg.match(/publish\s+(?:to\s+\w+\s+)?([\s\S]+)/i);
      if (!contentMatch) return 'Say "post <content>" or "publish to linkedin <content>"';

      const content = contentMatch[1].trim();
      this.contentPipeline.postsPublished++;
      this.contentPipeline.lastPublish = Date.now();
      this.logger.decision('FeedHive Publish', `Posted to ${platform}: ${content.substring(0, 60)}...`);
      return `📤 Published to <span class="yaml-value">${platform}</span> via FeedHive.\n  Content: ${content.substring(0, 80)}${content.length > 80 ? '...' : ''}\n  Today: ${this.contentPipeline.postsPublished}/${this.contentPipeline.dailyTarget} posts\n  Accounts: ${this.contentPipeline.accounts.join(', ')}`;
    }

    // Schedule content
    if (lower.includes('schedule') || lower.includes('plan')) {
      const scheduleMatch = msg.match(/schedule\s+(?:for\s+)?([\s\S]+?)(?:\s+at\s+|\s+on\s+)([\s\S]+)/i);
      if (!scheduleMatch) return 'Say "schedule <content> at <time>"';

      const entry = {
        content: scheduleMatch[1].trim(),
        scheduledFor: scheduleMatch[2].trim(),
        createdAt: Date.now(),
        status: 'scheduled',
      };
      this.contentPipeline.schedules.push(entry);
      return `📅 Scheduled post for ${entry.scheduledFor}. Queue: ${this.contentPipeline.schedules.length} scheduled items.`;
    }

    // Content pipeline status
    if (lower.includes('status') || lower.includes('pipeline') || lower.includes('overview')) {
      const byAccount = this.contentPipeline.accounts.map(a => `${a}: ${this.contentPipeline.postsPublished > 0 ? 'active' : 'idle'}`);
      return `FeedHive Content Pipeline:\n  Published today: ${this.contentPipeline.postsPublished}/${this.contentPipeline.dailyTarget}\n  Scheduled: ${this.contentPipeline.schedules.length} items\n  Accounts: ${byAccount.join(', ')}\n  Last publish: ${this.contentPipeline.lastPublish ? new Date(this.contentPipeline.lastPublish).toLocaleTimeString() : 'never'}\n  Pipeline status: ${this.contentPipeline.postsPublished >= this.contentPipeline.dailyTarget ? 'Daily target met ✓' : 'Ready for more'}`;
    }

    // Connect account
    if (lower.includes('connect') || lower.includes('add account')) {
      const match = msg.match(/connect\s+(\w+)/i);
      if (match) {
        const acct = match[1].toLowerCase();
        if (!this.contentPipeline.accounts.includes(acct)) {
          this.contentPipeline.accounts.push(acct);
          this.logger.decision('FeedHive Account', `Connected ${acct}`);
        }
        return `✅ Connected <span class="yaml-value">${acct}</span> via FeedHive OpenClaw integration. Accounts: ${this.contentPipeline.accounts.join(', ')}`;
      }
      return 'Specify account: connect <twitter|linkedin|instagram|facebook>';
    }

    return 'FeedHive command not recognized. Try: publish, schedule, pipeline status, connect <account>.';
  }
}
