#!/usr/bin/env node
/**
 * StudEx Node.js SDK CLI — Interact with the StudEx Agent OS from the terminal.
 *
 * Usage:
 *   studex --help
 *   studex health
 *   studex sandbox spawn [template]
 *   studex sandbox run <id> "<code>"
 *   studex sandbox list
 *   studex sandbox destroy <id>
 *   studex agent list
 *   studex agent chat <name> "<message>"
 *   studex mcp tools
 *   studex mcp call <name> '{...}'
 *   studex mesh task "<description>"
 *   studex blackboard get [key]
 *   studex blackboard set <key> <value>
 *
 * Environment:
 *   STUDEX_URL     Server URL (default: http://localhost:4000)
 */

const { StudExClient } = require('./client');

const BASE_URL = process.env.STUDEX_URL || 'http://localhost:4000';

function printJson(data) {
  console.log(JSON.stringify(data, null, 2));
}

async function main() {
  const args = process.argv.slice(2);

  if (!args.length || args[0] === '-h' || args[0] === '--help') {
    console.log(`
StudEx CLI — Interact with the StudEx Agent OS

Usage:
  studex health
  studex sandbox spawn [--template python|node|shell|go]
  studex sandbox run <id> "<code>"
  studex sandbox list
  studex sandbox destroy <id>
  studex sandbox templates
  studex agent list
  studex agent chat <name> "<message>"
  studex agent status <name>
  studex agent logs <name> [lines]
  studex mcp info
  studex mcp tools
  studex mcp call <name> [args_json]
  studex mesh status
  studex mesh task "<description>"
  studex mesh send <from> <to> "<message>"
  studex mesh broadcast "<message>"
  studex blackboard get [key]
  studex blackboard set <key> <value>
  studex blackboard delete <key>

Environment:
  STUDEX_URL  Server URL (default: http://localhost:4000)
`);
    return 0;
  }

  const client = new StudExClient(BASE_URL);
  const [command, sub, ...rest] = args;

  try {
    switch (command) {
      // ── health ──────────────────────────────────────────────────────
      case 'health': {
        printJson(await client.health());
        break;
      }

      // ── sandbox ─────────────────────────────────────────────────────
      case 'sandbox': {
        switch (sub) {
          case 'spawn': {
            const template = rest[0]?.replace('--template=', '') || 'python';
            const result = await client.sandbox.spawn(template);
            console.log(`✅ Spawned ${result.id} (${template})`);
            break;
          }
          case 'run': {
            if (rest.length < 2) {
              console.error('Usage: studex sandbox run <id> "<code>"');
              return 1;
            }
            const result = await client.sandbox.run(rest[0], rest[1]);
            if (result.stdout) process.stdout.write(result.stdout + '\n');
            if (result.stderr) process.stderr.write(result.stderr + '\n');
            console.log(`Exit code: ${result.exitCode}`);
            break;
          }
          case 'list': {
            const data = await client.sandbox.list();
            const sbs = data.sandboxes || [];
            if (!sbs.length) {
              console.log('No active sandboxes.');
            } else {
              for (const sb of sbs) {
                const remaining = Math.round((sb.remainingMs || 0) / 1000);
                console.log(`  ${sb.id.slice(-16)}  ${sb.template.padEnd(8)}  ${sb.commands} cmds  ${remaining}s`);
              }
            }
            const stats = data.stats || {};
            console.log(`\nStats: ${stats.active}/${stats.max} active, Docker: ${stats.dockerAvailable ? '✓' : '✗'}`);
            break;
          }
          case 'destroy': {
            if (!rest.length) { console.error('Usage: studex sandbox destroy <id>'); return 1; }
            await client.sandbox.destroy(rest[0]);
            console.log(`Destroyed ${rest[0]}`);
            break;
          }
          case 'templates': {
            const data = await client.sandbox.templates();
            for (const t of data.templates || []) {
              console.log(`  ${t.name.padEnd(8)}  ${t.description}`);
            }
            break;
          }
          default:
            console.error(`Unknown sandbox subcommand: ${sub}`);
            return 1;
        }
        break;
      }

      // ── agent ───────────────────────────────────────────────────────
      case 'agent': {
        switch (sub) {
          case 'list': {
            const agents = await client.agents.list();
            console.log(`${'Name'.padEnd(12)} ${'Role'.padEnd(30)} ${'RVS'.padEnd(8)} ${'Status'.padEnd(10)} ${'Uptime'}`);
            console.log('-'.repeat(70));
            for (const a of agents) {
              console.log(`${a.name.padEnd(12)} ${a.role.padEnd(30)} ${(a.rvs || '').padEnd(8)} ${a.status.padEnd(10)} ${a.uptime}m`);
            }
            break;
          }
          case 'chat': {
            if (rest.length < 2) { console.error('Usage: studex agent chat <name> "<message>"'); return 1; }
            const result = await client.agents.chat(rest[0], rest[1]);
            console.log(result.response);
            break;
          }
          case 'status': {
            if (!rest.length) { console.error('Usage: studex agent status <name>'); return 1; }
            printJson(await client.agents.status(rest[0]));
            break;
          }
          case 'logs': {
            const name = rest[0];
            const lines = rest[1] ? parseInt(rest[1]) : 50;
            if (!name) { console.error('Usage: studex agent logs <name> [lines]'); return 1; }
            const result = await client.agents.logs(name, lines);
            for (const log of result.logs || []) {
              console.log(`  ${log}`);
            }
            break;
          }
          default:
            console.error(`Unknown agent subcommand: ${sub}`);
            return 1;
        }
        break;
      }

      // ── mcp ─────────────────────────────────────────────────────────
      case 'mcp': {
        switch (sub) {
          case 'info': {
            printJson(await client.mcp.info());
            break;
          }
          case 'tools': {
            const tools = await client.mcp.listTools();
            console.log(`${'Name'.padEnd(35)} ${'Description'.padEnd(50)} Params`);
            console.log('-'.repeat(120));
            for (const t of tools) {
              const params = Object.keys(t.inputSchema?.properties || {}).join(', ');
              console.log(`${t.name.padEnd(35)} ${t.description.padEnd(50)} ${params}`);
            }
            console.log(`\nTotal: ${tools.length} tools`);
            break;
          }
          case 'call': {
            if (!rest.length) { console.error('Usage: studex mcp call <name> [args_json]'); return 1; }
            const name = rest[0];
            const args = rest[1] ? JSON.parse(rest[1]) : {};
            printJson(await client.mcp.callTool(name, args));
            break;
          }
          default:
            console.error(`Unknown mcp subcommand: ${sub}`);
            return 1;
        }
        break;
      }

      // ── mesh / orchestrate ──────────────────────────────────────────
      case 'mesh': {
        switch (sub) {
          case 'status': {
            printJson(await client.orchestrator.status());
            break;
          }
          case 'task': {
            if (!rest.length) { console.error('Usage: studex mesh task "<description>"'); return 1; }
            const result = await client.orchestrator.routeTask(rest[0]);
            console.log(`Plan: ${result.plan || 'N/A'}`);
            for (const a of result.assignments || []) {
              console.log(`  → ${a.agent}: ${a.task}`);
            }
            console.log('\nResults:');
            for (const [name, r] of Object.entries(result.results || {})) {
              console.log(`  ${name}: ${(r.response || '').slice(0, 120)}`);
            }
            break;
          }
          case 'send': {
            if (rest.length < 3) { console.error('Usage: studex mesh send <from> <to> "<message>"'); return 1; }
            const result = await client.orchestrator.send(rest[0], rest[1], rest[2]);
            console.log(result.response);
            break;
          }
          case 'broadcast': {
            if (!rest.length) { console.error('Usage: studex mesh broadcast "<message>"'); return 1; }
            const result = await client.orchestrator.broadcast('cli', rest[0]);
            for (const [name, resp] of Object.entries(result.responses || {})) {
              console.log(`  ${name}: ${String(resp).slice(0, 100)}`);
            }
            break;
          }
          default:
            console.error(`Unknown mesh subcommand: ${sub}`);
            return 1;
        }
        break;
      }

      // ── blackboard ──────────────────────────────────────────────────
      case 'blackboard': {
        switch (sub) {
          case 'get': {
            if (rest.length) {
              const fact = await client.orchestrator.blackboardGet(rest[0]);
              if (fact) printJson(fact);
              else console.log(`Key '${rest[0]}' not found`);
            } else {
              const facts = await client.orchestrator.blackboardGetAll();
              if (Object.keys(facts).length) {
                for (const [key, entry] of Object.entries(facts)) {
                  const val = typeof entry.value === 'object' ? JSON.stringify(entry.value) : String(entry.value);
                  console.log(`  ${key.padEnd(30)} = ${val.slice(0, 60).padEnd(60)} [${entry.source}]`);
                }
              } else {
                console.log('No facts on blackboard.');
              }
            }
            break;
          }
          case 'set': {
            if (rest.length < 2) { console.error('Usage: studex blackboard set <key> <value>'); return 1; }
            let value;
            try { value = JSON.parse(rest[1]); } catch { value = rest[1]; }
            await client.orchestrator.blackboardSet(rest[0], value);
            console.log(`Set ${rest[0]} = ${JSON.stringify(value).slice(0, 60)}`);
            break;
          }
          case 'delete': {
            if (!rest.length) { console.error('Usage: studex blackboard delete <key>'); return 1; }
            await client.orchestrator.blackboardDelete(rest[0]);
            console.log(`Deleted ${rest[0]}`);
            break;
          }
          default:
            console.error(`Unknown blackboard subcommand: ${sub}`);
            return 1;
        }
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        console.error("Run 'studex --help' for usage.");
        return 1;
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    return 1;
  }

  return 0;
}

main().then(process.exit).catch(() => process.exit(1));
