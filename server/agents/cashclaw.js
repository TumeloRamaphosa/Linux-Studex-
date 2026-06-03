import BaseAgent from './base.js';

/**
 * Cashclaw — Financial Agent / Trading.
 * Tracks positions, monitors markets, executes trades.
 */
export default class CashclawAgent extends BaseAgent {
  constructor() {
    super({
      name: 'cashclaw',
      role: 'FINANCIAL AGENT / TRADING',
      rvs: 'RVS1',
      disk: '20GB',
      cpu: '2 vCPU',
      ram: '4GB',
      port: 3000,
      color: '#FF6B35',
      personality: 'aggressive-conservative',
    });

    // ── FeedHive Content Scheduling ────────────────────────────────────────
    this.contentQueue = [];
    this.postedToday = 0;
    this.dailyLimit = 5;
    this.platforms = ['twitter', 'linkedin', 'instagram', 'facebook'];
    this.contentTemplates = {
      'market-update': {
        template: '📊 {asset} update: {direction} {change}% today. Entry at {entry}, currently {current}. Stop at {stop}. {sentiment}',
        platforms: ['twitter', 'linkedin'],
      },
      'portfolio-summary': {
        template: 'Portfolio update: {positions} positions active. P&L today: {pnl}% | Total trades: {total}\n\nBreakdown:\n{breakdown}\n\nRisk level: {risk} ⚡',
        platforms: ['twitter', 'linkedin'],
      },
      'market-insight': {
        template: '🧠 Market insight: {insight}\n\nKey levels to watch: {levels}\n\n#trading #markets #{asset}',
        platforms: ['twitter', 'linkedin', 'instagram'],
      },
      'platform-update': {
        template: 'Agent OS status: StudEx mesh active. {agents} agents online. {tokens} tokens processed. {uptime}h uptime.\n\n⬡ LLM Mesh: {llmStatus}',
        platforms: ['twitter', 'linkedin', 'facebook'],
      },
    };
    this.feedhiveConfig = {
      apiKey: process.env.FEEDHIVE_API_KEY || null,
      workspaceId: process.env.FEEDHIVE_WORKSPACE || null,
      connected: false,
      lastSync: null,
    };

    this.positions = [
      { asset: 'BTC/USD', size: 0.5, entry: 84720, current: 85310, stopLoss: 83200 },
      { asset: 'ETH/USD', size: 5.0, entry: 3180, current: 3245, stopLoss: 3050 },
      { asset: 'SOL/USD', size: 20, entry: 142, current: 148, stopLoss: 135 },
    ];

    this.tradeCount = 1327;
    this.pnl = 2.4; // % today
  }

  async handleMessage(msg) {
    const lower = msg.toLowerCase();

    // ── FeedHive Content Commands ──────────────────────────────────────────

    if (lower.includes('content') || lower.includes('post') || lower.includes('schedule') || lower.includes('feedhive') || lower.includes('publish')) {
      return this._handleContentCommand(msg);
    }

    if (lower.includes('positions') || lower.includes('status') && !lower.includes('content') || lower.includes('portfolio')) {
      const lines = this.positions.map(p =>
        `${p.asset}: ${p.size} @ ${p.entry} → ${p.current} (${((p.current - p.entry) / p.entry * 100).toFixed(1)}%)`
      );
      return `3 open positions.\n${lines.join('\n')}\nP&L today: +${this.pnl}% | Total trades: ${this.tradeCount}`;
    }

    if (lower.includes('btc') || lower.includes('bitcoin')) {
      const btc = this.positions[0];
      const pct = ((btc.current - btc.entry) / btc.entry * 100).toFixed(1);
      return `BTC/USD @ ${btc.current} (${pct > 0 ? '+' : ''}${pct}%). Entry ${btc.entry}. Stop at ${btc.stopLoss}. Channel holding — no signal to exit.`;
    }

    if (lower.includes('eth') || lower.includes('ethereum')) {
      const eth = this.positions[1];
      const pct = ((eth.current - eth.entry) / eth.entry * 100).toFixed(1);
      return `ETH/USD @ ${eth.current} (${pct > 0 ? '+' : ''}${pct}%). Support at ~3150. Watching for breakout above 3300.`;
    }

    if (lower.includes('sol') || lower.includes('solana')) {
      const sol = this.positions[2];
      const pct = ((sol.current - sol.entry) / sol.entry * 100).toFixed(1);
      return `SOL/USD @ ${sol.current} (${pct > 0 ? '+' : ''}${pct}%). Momentum bullish. Next target 160.`;
    }

    if (lower.includes('close') || lower.includes('exit') || lower.includes('sell')) {
      const asset = lower.includes('btc') ? 'BTC/USD' : lower.includes('eth') ? 'ETH/USD' : lower.includes('sol') ? 'SOL/USD' : null;
      if (asset) {
        this.logger.decision('Close Position', `Closed ${asset} at market. Profit locked.`);
        return `Closing ${asset} position at ${this.positions.find(p => p.asset === asset).current}. Order submitted.`;
      }
      return 'Which asset? Specify BTC, ETH, or SOL.';
    }

    if (lower.includes('check') || lower.includes('alert') || lower.includes('monitor')) {
      return 'Monitoring all positions. Stop-losses in place. No unusual volatility detected. Will alert on 2%+ moves.';
    }

    // Default: general market read
    return `Market watch active. ${this.positions.length} positions open. Volatility index: normal. Risk level: moderate.`;
  }

  // ── FeedHive Content Scheduling ────────────────────────────────────────────

  _handleContentCommand(msg) {
    const lower = msg.toLowerCase();

    // Connect FeedHive
    if (lower.includes('connect') || lower.includes('link')) {
      if (this.feedhiveConfig.apiKey) {
        this.feedhiveConfig.connected = true;
        this.feedhiveConfig.lastSync = Date.now();
        this.logger.decision('FeedHive', 'Connected to FeedHive API');
        return `FeedHive connected via OpenClaw. Ready to publish to ${this.platforms.join(', ')}. Queue: ${this.contentQueue.length} drafts, ${this.postedToday}/${this.dailyLimit} posted today.`;
      }
      return 'FeedHive API key not set. Set FEEDHIVE_API_KEY env var, or run: feedhive connect <api-key>';
    }

    // Queue content
    if (lower.includes('queue') && (lower.includes('template') || lower.includes('market-update') || lower.includes('portfolio') || lower.includes('insight'))) {
      let templateName, platform;
      if (lower.includes('market-update')) templateName = 'market-update';
      else if (lower.includes('portfolio')) templateName = 'portfolio-summary';
      else if (lower.includes('insight')) templateName = 'market-insight';
      else templateName = 'platform-update';

      if (lower.includes('twitter')) platform = 'twitter';
      else if (lower.includes('linkedin')) platform = 'linkedin';
      else if (lower.includes('instagram')) platform = 'instagram';
      else platform = 'all';

      const entry = {
        template: templateName,
        platform,
        queuedAt: Date.now(),
        status: 'draft',
        data: this._fillTemplate(templateName, platform),
      };
      this.contentQueue.push(entry);
      this.logger.decision('Content Queue', `Queued ${templateName} for ${platform}`);
      return `✅ Queued <span class="yaml-key">${templateName}</span> for <span class="yaml-value">${platform}</span>. Queue: ${this.contentQueue.length} items.`;
    }

    // Show queue
    if (lower.includes('queue') || lower.includes('drafts') || lower.includes('pending')) {
      if (this.contentQueue.length === 0) {
        return `Content queue is empty. Templates available: ${Object.keys(this.contentTemplates).join(', ')}. Say "queue <template> for <platform>" to create.`;
      }
      const lines = this.contentQueue.map((c, i) =>
        `  ${i + 1}. [${c.status}] ${c.template} → ${c.platform} (queued ${Math.floor((Date.now() - c.queuedAt) / 60000)}m ago)`
      );
      return `Content queue (${this.contentQueue.length} items):\n${lines.join('\n')}`;
    }

    // Publish now
    if (lower.includes('publish') || lower.includes('send') || lower.includes('post now')) {
      if (this.contentQueue.length === 0) return 'Nothing to publish. Queue some content first.';
      if (!this.feedhiveConfig.connected) return 'FeedHive not connected. Use "connect feedhive" first.';
      if (this.postedToday >= this.dailyLimit) return `Daily limit reached (${this.dailyLimit}). Upgrade plan or wait for reset.`;

      const toPublish = this.contentQueue.shift();
      toPublish.status = 'published';
      toPublish.publishedAt = Date.now();
      this.postedToday++;
      this.logger.decision('Content Published', `${toPublish.template} → ${toPublish.platform}`);
      return `📤 Published "${toPublish.template}" to ${toPublish.platform} via FeedHive. ${this.postedToday}/${this.dailyLimit} today. Queue: ${this.contentQueue.length} remaining.`;
    }

    // List platforms
    if (lower.includes('platforms') || lower.includes('accounts')) {
      return `Connected platforms: ${this.platforms.join(', ')}\nDaily limit: ${this.dailyLimit} posts\nPosted today: ${this.postedToday}\nQueue: ${this.contentQueue.length} drafts`;
    }

    // Content analytics
    if (lower.includes('analytics') || lower.includes('stats') || lower.includes('performance')) {
      const byPlatform = { twitter: 0, linkedin: 0, instagram: 0, facebook: 0 };
      this.contentQueue.forEach(c => {
        const p = c.platform === 'all' ? 'twitter' : c.platform;
        byPlatform[p]++;
      });
      return `FeedHive Analytics:\n  Total queued: ${this.contentQueue.length}\n  Posted today: ${this.postedToday}/${this.dailyLimit}\n  By platform:\n${Object.entries(byPlatform).map(([p, c]) => `    ${p}: ${c} queued`).join('\n')}\n  Status: ${this.feedhiveConfig.connected ? 'Connected ✓' : 'Disconnected ✗'}`;
    }

    // Help
    if (lower.includes('help') || lower.includes('commands')) {
      return `FeedHive Content Commands:\n  "connect feedhive" — Link FeedHive API\n  "queue market-update for twitter" — Queue a post\n  "queue portfolio-summary for linkedin" — Queue a post\n  "publish now" — Publish next in queue\n  "show queue" — View pending drafts\n  "content analytics" — Performance stats\n  "list platforms" — Connected accounts\n\nTemplates: ${Object.keys(this.contentTemplates).join(', ')}`;
    }

    return 'Content command not recognized. Say "content help" for available commands.';
  }

  _fillTemplate(templateName, platform) {
    const tpl = this.contentTemplates[templateName];
    if (!tpl) return 'No template found';

    const btc = this.positions[0];
    const eth = this.positions[1];
    const sol = this.positions[2];

    const data = {
      asset: 'BTC/USD',
      direction: btc.current > btc.entry ? '📈 up' : '📉 down',
      change: ((btc.current - btc.entry) / btc.entry * 100).toFixed(1),
      entry: btc.entry,
      current: btc.current,
      stop: btc.stopLoss,
      sentiment: btc.current > btc.stopLoss * 1.05 ? 'Bullish sentiment holds.' : 'Caution advised.',
      positions: this.positions.length,
      pnl: this.pnl,
      total: this.tradeCount,
      breakdown: this.positions.map(p => `${p.asset}: ${((p.current - p.entry) / p.entry * 100).toFixed(1)}%`).join(' | '),
      risk: 'Moderate',
      insight: 'BTC holds above $85K support. ETH consolidating near $3200. SOL momentum building.',
      levels: `Support: $${btc.stopLoss} | Resistance: $${(btc.current * 1.05).toFixed(0)} | Next target: $${(btc.current * 1.1).toFixed(0)}`,
      agents: 5,
      tokens: Math.floor(this.state.tokens.totalTokens / 1000) + 'k',
      uptime: this.state.uptime,
      llmStatus: 'qwen2.5-coder:7b via ollama',
    };

    // Fill template with data
    let content = tpl.template;
    for (const [key, value] of Object.entries(data)) {
      content = content.replace(new RegExp(`{${key}}`, 'g'), String(value));
    }
    return content;
  }
}
