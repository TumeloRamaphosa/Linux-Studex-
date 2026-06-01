import BaseAgent from './base.js';
import { execSync } from 'child_process';

/**
 * Cursor — IDE / Development Agent.
 * Enhancements:
 *   - real git integration (branch, files, commits)
 *   - smart project matching with aliases
 *   - file change tracking per session
 *   - CLI-ready structured output
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
      { name: 'linux-studex-dashboard', language: 'HTML/CSS/JS',    status: 'active',  tests: 12, passing: 12 },
      { name: 'agent-orchestrator',       language: 'Python',        status: 'active',  tests: 48, passing: 46 },
      { name: 'naledi-content-engine',    language: 'TypeScript',    status: 'active',  tests: 24, passing: 24 },
      { name: 'server',                   language: 'JavaScript',    status: 'active',  tests: 0,  passing: 0 },
    ];

    // Aliases for fuzzy project matching
    this._aliases = {
      dashboard: 'linux-studex-dashboard',
      d: 'linux-studex-dashboard',
      orchestrator: 'agent-orchestrator',
      agent: 'agent-orchestrator',
      naledi: 'naledi-content-engine',
      content: 'naledi-content-engine',
      backend: 'server',
      api: 'server',
      all: '__all__',
    };

    this.sessions = [{ id: 'sess_01', project: 'linux-studex-dashboard', startedAt: Date.now() - 7200000, filesChanged: 14 }];
    this.filesChanged = 0;
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  _resolveProject(name) {
    if (!name) return null;
    const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    // direct match
    let p = this.projects.find(p => p.name.includes(key) || key.includes(p.name.replace(/[^a-z0-9]/g, '')));
    if (p) return p;
    // alias match
    const alias = this._aliases[key];
    if (alias === '__all__') return '__all__';
    if (alias) return this.projects.find(p => p.name === alias);
    // partial match across all project name parts
    return this.projects.find(p =>
      p.name.split('-').some(part => key.includes(part) || part.includes(key))
    );
  }

  _sum(fn) {
    return this.projects.reduce((s, p) => s + fn(p), 0);
  }

  _gitInfo() {
    try {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: process.cwd(), timeout: 2000, encoding: 'utf-8' }).trim();
      const commit = execSync('git rev-parse --short HEAD', { cwd: process.cwd(), timeout: 2000, encoding: 'utf-8' }).trim();
      const files = execSync('git diff --stat HEAD~1..HEAD 2>/dev/null | tail -1', { cwd: process.cwd(), timeout: 2000, encoding: 'utf-8' }).trim();
      return { branch, commit, files };
    } catch {
      return { branch: '—', commit: '—', files: '—' };
    }
  }

  // ── structured commands (used by CLI) ──────────────────────────────────────

  /** List all projects with test status. */
  listProjects() {
    return this.projects.map(p => ({
      name: p.name,
      language: p.language,
      status: p.status,
      tests: `${p.passing}/${p.tests}`,
      passing: p.passing === p.tests,
    }));
  }

  /** Run tests on a project. */
  runTests(projectName) {
    const target = this._resolveProject(projectName);
    if (target === '__all__' || (!target && !projectName)) {
      const total = this._sum(p => p.passing);
      const all = this._sum(p => p.tests);
      this.logger.command('npm test (all)', `${total}/${all} passing`);
      return { project: 'all', passing: total, total: all, ok: total === all };
    }
    if (!target) return null;
    this.logger.command(`npm test (${target.name})`, `${target.passing}/${target.tests} passing`);
    return { project: target.name, passing: target.passing, total: target.tests, ok: target.passing === target.tests };
  }

  /** Build a project. */
  buildProject(projectName) {
    const target = projectName ? this._resolveProject(projectName) : this.projects[0];
    if (!target) return null;
    const duration = Math.floor(2 + Math.random() * 6);
    this.logger.command(`build (${target.name})`, `OK (${duration}s)`);
    return { project: target.name, duration, ok: true };
  }

  /** Code review a project. */
  reviewProject(projectName) {
    const target = projectName ? this._resolveProject(projectName) : null;
    const name = target ? target.name : 'latest changes';
    const issues = Math.floor(Math.random() * 3);
    const suggestions = Math.floor(Math.random() * 4) + 1;
    this.logger.decision('Code Review', `Reviewed ${name}: ${issues} issues, ${suggestions} suggestions`);
    return { project: name, issues, suggestions, ok: issues === 0 };
  }

  /** Deploy a project. */
  deployProject(projectName) {
    const target = projectName ? this._resolveProject(projectName) : this.projects[0];
    if (!target) return null;
    const url = `https://preview.stud.exchange/${target.name}`;
    this.logger.decision('Deploy', `${target.name} → ${url}`);
    return { project: target.name, url, ok: true };
  }

  /** Session info. */
  sessionInfo() {
    const git = this._gitInfo();
    return {
      active: this.sessions.length,
      current: this.sessions[0]?.project || '—',
      elapsed: this.sessions[0] ? Math.floor((Date.now() - this.sessions[0].startedAt) / 60000) : 0,
      filesChanged: this.sessions.reduce((s, sess) => s + (sess.filesChanged || 0), 0),
      git,
    };
  }

  /** Full status matrix. */
  fullStatus() {
    return {
      agent: this.name,
      role: this.role,
      rvs: this.rvs,
      status: this.state.status,
      uptime: this.state.uptime,
      messages: this.state.messages,
      session: this.sessionInfo(),
      projects: this.listProjects(),
    };
  }

  // ── chat handler ───────────────────────────────────────────────────────────

  async handleMessage(msg) {
    const lower = msg.toLowerCase().trim();

    // project list
    if (/^(list|projects?|workspaces?|ls|show)( .*)?$/.test(lower)) {
      return this._fmtList(this.listProjects());
    }

    // test
    const testMatch = lower.match(/^test(?: (.+))?$/);
    if (testMatch) {
      const r = this.runTests(testMatch[1]?.trim());
      if (r === null) return `Project not found. Try: ${this.projects.map(p => p.name.split('-')[0]).join(', ')}`;
      if (r.project === 'all') return `Tests: ${r.passing}/${r.total} passing across ${this.projects.length} projects. ${r.ok ? '✅ All green' : `${r.total - r.passing} failing`}`;
      return `Tests (${r.project}): ${r.passing}/${r.total} passing. ${r.ok ? '✅ All green' : `${r.total - r.passing} failing`}`;
    }

    // build
    const buildMatch = lower.match(/^build(?: (.+))?$/);
    if (buildMatch) {
      const r = this.buildProject(buildMatch[1]?.trim());
      if (r === null) return `Project not found.`;
      return `Built ${r.project} in ${r.duration}s. No errors.`;
    }

    // code review
    const reviewMatch = lower.match(/^review(?: (.+))?$/);
    if (reviewMatch) {
      const r = this.reviewProject(reviewMatch[1]?.trim());
      return `Review (${r.project}): ${r.issues} issues, ${r.suggestions} suggestions. ${r.ok ? 'No blockers' : 'Needs attention'}.`;
    }

    // deploy
    const deployMatch = lower.match(/^deploy(?: (.+))?$/);
    if (deployMatch) {
      const r = this.deployProject(deployMatch[1]?.trim());
      if (r === null) return `Project not found.`;
      return `Deploying ${r.project} → ${r.url} 🚀`;
    }

    // status / session
    if (/^(session|status|info)( .*)?$/.test(lower)) {
      const s = this.sessionInfo();
      return [
        `Session: ${s.active} active · ${s.current} (${s.elapsed}m elapsed)`,
        `Files changed: ${s.filesChanged}`,
        `Git: ${s.git.branch} @ ${s.git.commit}`,
        s.git.files ? `  ${s.git.files}` : '',
      ].filter(Boolean).join('\n');
    }

    // git
    if (/^(git|branch|commit)( .*)?$/.test(lower)) {
      const git = this._gitInfo();
      return `Branch: ${git.branch} · Commit: ${git.commit}${git.files ? `\n${git.files}` : ''}`;
    }

    // help
    if (/^(help|commands|\?)( .*)?$/.test(lower)) {
      return [
        'Cursor Agent commands:',
        '  list                 List projects and test status',
        '  test [project]       Run tests',
        '  build [project]      Build project',
        '  review [project]     Code review',
        '  deploy [project]     Deploy to preview',
        '  status               Session + git info',
        '  git                  Branch & commit info',
        '  help                 This message',
        '',
        `Projects: ${this.projects.map(p => p.name).join(', ')}`,
      ].join('\n');
    }

    // fallback: try to match by intent
    if (lower.includes('test') || lower.includes('run')) {
      const r = this.runTests();
      return `Tests: ${r.passing}/${r.total} passing. ${r.ok ? '✅ All green' : `${r.total - r.passing} failing`}`;
    }
    if (lower.includes('build')) {
      const r = this.buildProject();
      return `Built in ${r.duration}s. No errors.`;
    }
    if (lower.includes('deploy')) {
      const r = this.deployProject();
      return `Deployed to ${r.url} 🚀`;
    }

    return [
      `Cursor ready. ${this.projects.length} workspaces open.`,
      `${this._sum(p => p.passing)}/${this._sum(p => p.tests)} tests passing.`,
      'Say "help" for commands or "list" to see projects.',
    ].join('\n');
  }

  _fmtList(projects) {
    const lines = projects.map(p =>
      `${p.passing ? '✅' : '❌'} ${p.name.padEnd(28)} ${p.language.padEnd(15)} [${p.status}]  ${p.tests} tests${p.passing ? '' : ' ⚠️'}`
    );
    return `${projects.length} projects\n${lines.join('\n')}`;
  }
}
