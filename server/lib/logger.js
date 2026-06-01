import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGS_DIR = path.resolve(__dirname, '..', 'logs');

/**
 * Obsidian-compatible agent activity logger.
 * Writes structured markdown logs that Obsidian can render.
 */
class AgentLogger {
  constructor(agentName) {
    this.agentName = agentName;
    this.agentDir = path.join(LOGS_DIR, agentName);
    fs.mkdirSync(this.agentDir, { recursive: true });
  }

  _todayPath() {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.agentDir, `${date}.md`);
  }

  _timestamp() {
    return new Date().toLocaleString('en-ZA', {
      timeZone: 'Africa/Johannesburg',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }

  /**
   * Append a structured action to today's log.
   */
  log(section, content) {
    const logPath = this._todayPath();
    const ts = this._timestamp();
    const entry = `
## ${section} — ${ts}
${content}
`;
    fs.appendFileSync(logPath, entry, 'utf-8');
  }

  /**
   * Initialise today's log with frontmatter if it doesn't exist.
   */
  init(dateStr, status = 'active') {
    const logPath = this._todayPath();
    if (fs.existsSync(logPath)) return;
    const frontmatter = `---
agent: ${this.agentName}
date: ${dateStr || new Date().toISOString().split('T')[0]}
status: ${status}
---

`;
    fs.writeFileSync(logPath, frontmatter, 'utf-8');
  }

  /**
   * Log a chat interaction.
   */
  chat(userMessage, agentResponse) {
    this.log('Chat', [
      `- **User**: ${userMessage}`,
      `- **${this.agentName}**: ${agentResponse}`,
    ].join('\n'));
  }

  /**
   * Log a decision or action taken.
   */
  decision(action, detail) {
    this.log('Decisions', `- **${action}**: ${detail}`);
  }

  /**
   * Log a command execution.
   */
  command(cmd, result) {
    this.log('Commands', `- \`${cmd}\` → ${result}`);
  }

  /**
   * Log memory sync with TencentDB.
   */
  memorySync(atoms = 0, scenarios = 0, persona = '—') {
    this.log('Memory Sync', [
      `- **L1 Atoms extracted**: ${atoms}`,
      `- **L2 Scenarios updated**: ${scenarios}`,
      `- **L3 Persona**: ${persona}`,
    ].join('\n'));
  }

  /**
   * Return today's log content (latest N lines).
   */
  getRecent(lines = 50) {
    const logPath = this._todayPath();
    if (!fs.existsSync(logPath)) return '';
    const content = fs.readFileSync(logPath, 'utf-8');
    const parts = content.split('\n').filter(Boolean);
    return parts.slice(-lines).join('\n');
  }
}

export default AgentLogger;
