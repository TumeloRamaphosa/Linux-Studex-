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

    if (lower.includes('position') || lower.includes('status') || lower.includes('portfolio')) {
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
}
