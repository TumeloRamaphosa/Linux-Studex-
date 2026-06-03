import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, exec } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SANDBOX_DIR = path.resolve(__dirname, '..', 'sandbox_workspaces');
const MAX_SANDBOXES = 32;
const DEFAULT_TIMEOUT = 30_000; // 30s

/**
 * SandboxManager — Ephemeral code execution environments.
 *
 * Uses Docker for hardware-level filesystem isolation.
 * Each sandbox gets its own temp directory mounted into a container.
 * Templates define pre-baked tooling (python, node, shell).
 */
export default class SandboxManager {
  constructor() {
    fs.mkdirSync(SANDBOX_DIR, { recursive: true });
    this.sandboxes = new Map();
    this._checkDocker();
  }

  _checkDocker() {
    try {
      execSync('docker info >/dev/null 2>&1', { timeout: 3000 });
      this.dockerAvailable = true;
    } catch {
      this.dockerAvailable = false;
      console.warn('⚠ Docker not available — sandboxes will use local execution (no isolation)');
    }
  }

  // ── Templates ──────────────────────────────────────────────────────────

  static TEMPLATES = {
    python: {
      image: 'python:3.12-slim',
      setup: ['pip install --quiet --no-cache-dir numpy pandas requests'],
      description: 'Python 3.12 with numpy, pandas, requests',
    },
    node: {
      image: 'node:22-alpine',
      setup: [],
      description: 'Node.js 22 (Alpine)',
    },
    shell: {
      image: 'alpine:3.19',
      setup: ['apk add --no-cache curl jq git'],
      description: 'Shell (Alpine) with curl, jq, git',
    },
    go: {
      image: 'golang:1.22-alpine',
      setup: [],
      description: 'Go 1.22 (Alpine)',
    },
  };

  static listTemplates() {
    return Object.entries(SandboxManager.TEMPLATES).map(([name, t]) => ({
      name,
      description: t.description,
      image: t.image,
    }));
  }

  // ── Sandbox Lifecycle ─────────────────────────────────────────────────

  /** Spawn a new sandbox. Returns sandbox ID. */
  spawn(template = 'python', ttlMs = 120_000) {
    if (this.sandboxes.size >= MAX_SANDBOXES) {
      throw new Error(`Max sandboxes (${MAX_SANDBOXES}) reached`);
    }
    const tpl = SandboxManager.TEMPLATES[template];
    if (!tpl) throw new Error(`Unknown template: ${template}. Available: ${Object.keys(SandboxManager.TEMPLATES).join(', ')}`);

    const id = `sb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const workDir = path.join(SANDBOX_DIR, id);
    fs.mkdirSync(workDir, { recursive: true });

    let containerName = null;

    if (this.dockerAvailable) {
      try {
        // Pull image synchronously
        execSync(`docker pull ${tpl.image} 2>/dev/null`, { timeout: 120000 });

        // Create container with workspace mounted
        containerName = `studex-sb-${id}`;
        execSync(
          `docker create --name ${containerName} ` +
          `--network none ` +
          `--memory 512m --memory-swap 512m ` +
          `--cpus 1 ` +
          `--pids-limit 100 ` +
          `--read-only --tmpfs /tmp:rw,noexec,nosuid,size=64m ` +
          `-v ${workDir}:/workspace:rw ` +
          `-w /workspace ` +
          `${tpl.image} tail -f /dev/null`,
          { timeout: 15000 }
        );
        execSync(`docker start ${containerName}`, { timeout: 10000 });

        // Run setup commands
        for (const cmd of tpl.setup) {
          execSync(`docker exec ${containerName} /bin/sh -c ${JSON.stringify(cmd)}`, {
            timeout: 60000,
            stdio: 'pipe',
          });
        }
      } catch (err) {
        // Clean up on failure
        try { execSync(`docker rm -f ${containerName} 2>/dev/null`); } catch {}
        try { fs.rmSync(workDir, { recursive: true, force: true }); } catch {}
        throw new Error(`Sandbox spawn failed: ${err.message}`);
      }
    }

    const sandbox = {
      id,
      template,
      templateDescription: tpl.description,
      image: tpl.image,
      containerName,
      workDir,
      createdAt: Date.now(),
      ttlMs,
      commands: 0,
      lastActive: Date.now(),
      timeout: null,
    };

    // Auto-destroy after TTL
    sandbox.timeout = setTimeout(() => this.destroy(id), ttlMs);

    this.sandboxes.set(id, sandbox);
    return { id, template, workDir, commands: 0 };
  }

  /** Run code in a sandbox. Returns stdout, stderr, exitCode. */
  run(id, code, options = {}) {
    const sb = this.sandboxes.get(id);
    if (!sb) throw new Error(`Sandbox '${id}' not found`);

    const lang = options.language || sb.template;
    sb.commands++;
    sb.lastActive = Date.now();
    // Reset TTL
    clearTimeout(sb.timeout);
    sb.timeout = setTimeout(() => this.destroy(id), sb.ttlMs);

    const timeout = options.timeout || DEFAULT_TIMEOUT;
    const filesBefore = fs.readdirSync(sb.workDir);

    try {
      let stdout, stderr, exitCode;

      if (this.dockerAvailable && sb.containerName) {
        // Write code to file in workspace
        const ext = { python: 'py', node: 'js', shell: 'sh', go: 'go' }[lang] || 'sh';
        const codeFile = `code_${Date.now()}.${ext}`;
        fs.writeFileSync(path.join(sb.workDir, codeFile), code, 'utf-8');

        const runner = {
          python: `python3 /workspace/${codeFile}`,
          node: `node /workspace/${codeFile}`,
          shell: `/bin/sh /workspace/${codeFile}`,
          go: `go run /workspace/${codeFile}`,
        }[lang] || `/bin/sh /workspace/${codeFile}`;

        const result = execSync(
          `docker exec ${sb.containerName} /bin/sh -c ${JSON.stringify(runner)}`,
          { timeout, stdio: 'pipe', encoding: 'utf-8', maxBuffer: 1024 * 1024 }
        );
        stdout = result;
        stderr = '';
        exitCode = 0;
      } else {
        // Local execution fallback (no isolation)
        // Write code to file first to avoid shell quoting issues
        const ext = { python: 'py', node: 'js', shell: 'sh', go: 'go' }[lang] || 'sh';
        const codeFile = `code_${Date.now()}.${ext}`;
        const codePath = path.join(sb.workDir, codeFile);
        fs.writeFileSync(codePath, code, 'utf-8');

        const runner = {
          python: `cd ${JSON.stringify(sb.workDir)} && python3 ${JSON.stringify(codePath)}`,
          node: `cd ${JSON.stringify(sb.workDir)} && node ${JSON.stringify(codePath)}`,
          shell: `cd ${JSON.stringify(sb.workDir)} && /bin/sh ${JSON.stringify(codePath)}`,
          go: `cd ${JSON.stringify(sb.workDir)} && go run ${JSON.stringify(codePath)}`,
        }[lang] || `cd ${JSON.stringify(sb.workDir)} && /bin/sh ${JSON.stringify(codePath)}`;

        const result = execSync(runner, {
          timeout,
          stdio: 'pipe',
          encoding: 'utf-8',
          maxBuffer: 1024 * 1024,
          shell: true,
        });
        stdout = result;
        stderr = '';
        exitCode = 0;
      }

      // Find new files created
      const filesAfter = fs.readdirSync(sb.workDir);
      const newFiles = filesAfter.filter(f => !filesBefore.includes(f));

      return { stdout, stderr, exitCode, files: newFiles };
    } catch (err) {
      const stderr = err.stderr?.toString() || err.message;
      return { stdout: err.stdout?.toString() || '', stderr, exitCode: err.code || 1, files: [] };
    }
  }

  /** List files in a sandbox workspace. */
  listFiles(id, dir = '.') {
    const sb = this.sandboxes.get(id);
    if (!sb) throw new Error(`Sandbox '${id}' not found`);
    const target = path.join(sb.workDir, dir);
    if (!target.startsWith(sb.workDir)) throw new Error('Path traversal blocked');
    if (!fs.existsSync(target)) return [];
    return fs.readdirSync(target).map(name => {
      const full = path.join(target, name);
      const stat = fs.statSync(full);
      return {
        name,
        size: stat.size,
        isDirectory: stat.isDirectory(),
        modifiedAt: stat.mtime.toISOString(),
      };
    });
  }

  /** Read a file from a sandbox workspace. */
  readFile(id, filePath) {
    const sb = this.sandboxes.get(id);
    if (!sb) throw new Error(`Sandbox '${id}' not found`);
    const full = path.join(sb.workDir, filePath);
    if (!full.startsWith(sb.workDir)) throw new Error('Path traversal blocked');
    if (!fs.existsSync(full)) return null;
    return fs.readFileSync(full, 'utf-8');
  }

  /** Write a file to a sandbox workspace. */
  writeFile(id, filePath, content) {
    const sb = this.sandboxes.get(id);
    if (!sb) throw new Error(`Sandbox '${id}' not found`);
    const full = path.join(sb.workDir, filePath);
    if (!full.startsWith(sb.workDir)) throw new Error('Path traversal blocked');
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, 'utf-8');
    return { path: filePath, size: content.length };
  }

  /** Destroy a sandbox. */
  destroy(id) {
    const sb = this.sandboxes.get(id);
    if (!sb) return;
    clearTimeout(sb.timeout);
    try {
      if (this.dockerAvailable && sb.containerName) {
        execSync(`docker kill ${sb.containerName} 2>/dev/null`, { timeout: 5000 });
        execSync(`docker rm ${sb.containerName} 2>/dev/null`, { timeout: 5000 });
      }
      fs.rmSync(sb.workDir, { recursive: true, force: true });
    } catch {}
    this.sandboxes.delete(id);
  }

  /** List all active sandboxes. */
  list() {
    return [...this.sandboxes.values()].map(sb => ({
      id: sb.id,
      template: sb.template,
      templateDescription: sb.templateDescription,
      createdAt: sb.createdAt,
      ttlMs: sb.ttlMs,
      commands: sb.commands,
      lastActive: sb.lastActive,
      remainingMs: Math.max(0, sb.ttlMs - (Date.now() - sb.createdAt)),
    }));
  }

  /** Get sandbox stats. */
  get stats() {
    return {
      active: this.sandboxes.size,
      max: MAX_SANDBOXES,
      dockerAvailable: this.dockerAvailable,
      templates: Object.keys(SandboxManager.TEMPLATES).length,
    };
  }

  /** Clean up all sandboxes. */
  destroyAll() {
    for (const id of this.sandboxes.keys()) {
      this.destroy(id);
    }
  }
}
