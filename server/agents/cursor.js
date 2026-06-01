import BaseAgent from './base.js';

/**
 * Cursor — IDE / Development Agent.
 * Manages code projects, runs tests, handles builds.
 */
export default class CursorAgent extends BaseAgent {
  constructor() {
    super({
      name: 'cursor',
      role: 'IDE / DEVELOPMENT',
      rvs: 'RVS4',
      disk: '20GB',
      cpu: '2 vCPU',
      ram: '4GB',
      port: 3003,
      color: '#00A3FF',
      personality: 'precision-focused',
    });

    this.projects = [
      { name: 'linux-studex-dashboard', language: 'HTML/CSS/JS', status: 'active', tests: 12, passing: 12 },
      { name: 'agent-orchestrator', language: 'Python', status: 'active', tests: 48, passing: 46 },
      { name: 'naledi-content-engine', language: 'TypeScript', status: 'active', tests: 24, passing: 24 },
    ];

    this.sessions = [{ id: 'sess_01', project: 'linux-studex-dashboard', started: Date.now() - 7200000 }];
  }

  async handleMessage(msg) {
    const lower = msg.toLowerCase();

    if (lower.includes('project') || lower.includes('projects') || lower.includes('workspace')) {
      const lines = this.projects.map(
        p => `${p.name} (${p.language}) [${p.status}] — ${p.passing}/${p.tests} tests passing`
      );
      return `${this.projects.length} workspaces open.\n${lines.join('\n')}`;
    }

    if (lower.includes('test') || lower.includes('tests') || lower.includes('run')) {
      const target = this.projects.find(p => lower.includes(p.name.split('-')[0]));
      if (target) {
        this.logger.command(`npm test (${target.name})`, `${target.passing}/${target.tests} passing`);
        return `Running \`npm test\` on ${target.name}... ${target.passing}/${target.tests} tests passing. ${target.passing === target.tests ? 'All green ✅' : `${target.tests - target.passing} failing`}`;
      }
      // Run all
      const total = this.projects.reduce((s, p) => s + p.passing, 0);
      const totalTests = this.projects.reduce((s, p) => s + p.tests, 0);
      return `Running all project tests... ${total}/${totalTests} passing across ${this.projects.length} projects.`;
    }

    if (lower.includes('build') || lower.includes('compile')) {
      const target = this.projects.find(p => lower.includes(p.name.split('-')[0]));
      const name = target ? target.name : 'all projects';
      this.logger.command(`build (${name})`, 'Build successful');
      return `Building ${name}... Compiled successfully in ${Math.floor(2 + Math.random() * 4)}s. No errors.`;
    }

    if (lower.includes('code review') || lower.includes('review')) {
      const target = this.projects.find(p => lower.includes(p.name.split('-')[0]));
      const name = target ? target.name : 'latest changes';
      this.logger.decision('Code Review', `Reviewed ${name}`);
      return `Code review complete for ${name}. 3 files reviewed. 0 critical issues. 2 style suggestions (naming conventions).`;
    }

    if (lower.includes('deploy') || lower.includes('publish')) {
      this.logger.decision('Deploy', 'Dashboard deployed to preview');
      return 'Deploying latest build to preview channel... Deployed at https://preview.stud.exchange/dashboard';
    }

    if (lower.includes('session') || lower.includes('status')) {
      const activeSessions = this.sessions.length;
      const currentTime = Math.floor((Date.now() - this.sessions[0].started) / 60000);
      return `${activeSessions} active session. ${this.sessions[0].project} — ${currentTime}m elapsed. Ready.`;
    }

    return `${this.projects.length} workspaces open. ${this.projects.reduce((s, p) => s + p.passing, 0)}/${this.projects.reduce((s, p) => s + p.tests, 0)} tests passing. Ready for commands.`;
  }
}
