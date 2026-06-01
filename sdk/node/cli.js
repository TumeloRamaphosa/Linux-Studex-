#!/usr/bin/env node
/**
 * StudEx CLI — Interact with the StudEx Agent OS from the terminal.
 *
 * Pattern matches Google ADK's CLI:
 *   adk run <agent_name>    →  studex agent chat <name> "<message>"
 *   adk web                 →  studex health
 *   adk deploy              →  studex deploy (future)
 *
 * Usage:
 *   studex help
 *   studex health
 *   studex agent list | chat <name> "<message>" | status <name> | logs <name>
 *   studex sandbox spawn | run <id> "<code>" | list | destroy <id> | session
 *   studex mcp tools | call <name> '{...}' | info
 *   studex mesh status | task "<desc>" | send <from> <to> "<msg>" | log
 *   studex bb get [key] | set <key> <value> | delete <key>
 *
 * Environment:
 *   STUDEX_URL     Server URL (default: http://localhost:4000)
 */

const { StudEx } = require('./studex');

const BASE_URL = process.env.STUDEX_URL || 'http://localhost:4000';

function printJson(data) {
  console.log(JSON.stringify(data, null, 2));
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args[0] === '-h' || args[0] === '--help' || args[0] === 'help') {
    console.log(`
StudEx CLI — Interact with the StudEx Agent OS

Usage:
  studex health
  studex ping
  studex agent list
  studex agent chat <name> "<message>"
  studex agent status <name>
  studex agent logs <name> [lines]
  studex sandbox spawn [template]
  studex sandbox run <id> "<code>"
  studex sandbox list
  studex sandbox destroy <id>
  studex sandbox templates
  studex sandbox session [template]
  studex mcp tools
  studex mcp call <name> [args_json]
  studex mcp info
  studex mesh status
  studex mesh task "<description>"
  studex mesh send <from> <to> "<message>"
  studex mesh broadcast "<message>"
  studex mesh log [count]
  studex bb get [key]
  studex bb set <key> <value>
  studex bb delete <key>

Environment:
  STUDEX_URL  Server URL (default: http://localhost:4000)
`);
    return 0;
  }

  const client = new StudEx(BASE_URL);
  const [command, sub, ...rest] = args;

  try {
    switch (command) {
      case 'health':
        printJson(await client.health());
        break;

      case 'ping':
        const ok = await client.ping();
        console.log(`${ok ? '✅' : '❌'} Server ${ok ? 'reachable' : 'unreachable'} at ${BASE_URL}`);
        return ok ? 0 : 1;

      case 'agent': {
        switch (sub) {
          case 'list': case 'ls': {
            const agents = await client.agents.list();
            console.log('Name'.padEnd(12), 'Role'.padEnd(30), 'RVS'.padEnd(8), 'Status'.padEnd(10), 'Msgs');
            console.log('-'.repeat(70));
            for (const a of agents) {
              console.log(a.name.padEnd(12), a.role.padEnd(30), (a.rvs || '').padEnd(8), a.status.padEnd(10), a.messages);
            }
            break;
          }
          case 'chat': case 'create': case 'send': {
            if (rest.length < 2) { console.error('Usage: studex agent chat <name> "<message>"'); return 1; }
            const resp = await client.agents.create(rest[0], rest[1]);
            console.log(resp.response);
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
            const logs = await client.agents.logs(name, lines);
            for (const log of logs) console.log(`  ${log}`);
            break;
          }
          default: console.error(`Unknown: ${sub}`); return 1;
        }
        break;
      }

      case 'sandbox': {
        switch (sub) {
          case 'spawn': {
            const template = rest[0] || 'python';
            const sb = await client.sandbox.spawn(template);
            console.log(`✅ Spawned ${sb.id} (${sb.template})`);
            break;
          }
          case 'run': {
            if (rest.length < 2) { console.error('Usage: studex sandbox run <id> "<code>"'); return 1; }
            const result = await client.sandbox.run(rest[0], rest[1]);
            if (result.stdout) process.stdout.write(result.stdout + '\n');
            if (result.stderr) process.stderr.write(result.stderr + '\n');
            console.log(`Exit code: ${result.exitCode}${result.success ? ' ✅' : ''}`);
            break;
          }
          case 'list': case 'ls': {
            const sandboxes = await client.sandbox.list();
            if (!sandboxes.length) { console.log('No active sandboxes.'); break; }
            for (const sb of sandboxes) {
              console.log(`  ${sb.id.slice(-16)}  ${sb.template.padEnd(8)}  ${sb.commands} cmds  ${(sb.remainingMs / 1000).toFixed(0)}s`);
            }
            break;
          }
          case 'destroy': {
            if (!rest.length) { console.error('Usage: studex sandbox destroy <id>'); return 1; }
            await client.sandbox.destroy(rest[0]);
            console.log(`✅ Destroyed ${rest[0]}`);
            break;
          }
          case 'templates': {
            const templates = await client.sandbox.templates();
            for (const t of templates) console.log(`  ${t.name.padEnd(8)}  ${t.description}`);
            break;
          }
          case 'session': {
            const template = rest[0] || 'python';
            console.log(`Starting sandbox session (${template})...`);
            const sb = await client.sandbox.session(template);
            console.log(`  Sandbox: ${sb.id}`);
            const readline = require('readline');
            const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
            const prompt = () => {
              rl.question('  code> ', async (code) => {
                if (code.toLowerCase() === 'exit' || code.toLowerCase() === 'quit') {
                  await sb.destroy();
                  console.log('Session ended, sandbox destroyed.');
                  rl.close();
                  return;
                }
                try {
                  const result = await sb.run(code);
                  if (result.stdout) process.stdout.write(result.stdout);
                  if (result.stderr) process.stderr.write(result.stderr);
                } catch (e) { console.error(`Error: ${e.message}`); }
                prompt();
              });
            };
            prompt();
            await new Promise((resolve) => rl.on('close', resolve));
            return 0;
          }
          default: console.error(`Unknown: ${sub}`); return 1;
        }
        break;
      }

      case 'mcp': {
        switch (sub) {
          case 'tools': {
            const tools = await client.mcp.tools.list();
            console.log('Name'.padEnd(35), 'Description'.padEnd(50), 'Params');
            console.log('-'.repeat(120));
            for (const t of tools) {
              console.log(t.name.padEnd(35), t.description.padEnd(50), t.params.join(', '));
            }
            console.log(`\nTotal: ${tools.length} tools`);
            break;
          }
          case 'call': {
            if (!rest.length) { console.error('Usage: studex mcp call <name> [args_json]'); return 1; }
            const args = rest[1] ? JSON.parse(rest[1]) : {};
            printJson(await client.mcp.tools.call(rest[0], args));
            break;
          }
          case 'info': printJson(await client.mcp.info()); break;
          default: console.error(`Unknown: ${sub}`); return 1;
        }
        break;
      }

      case 'mesh': {
        switch (sub) {
          case 'status': printJson(await client.orchestrator.status()); break;
          case 'task': {
            if (!rest.length) { console.error('Usage: studex mesh task "<description>"'); return 1; }
            const task = await client.orchestrator.tasks.create(rest[0]);
            console.log(`Plan: ${task.plan || 'N/A'}`);
            for (const a of task.assignments) console.log(`  → ${a.agent}: ${a.task}`);
            console.log('\nResults:');
            for (const [name, r] of Object.entries(task.results)) {
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
          case 'log': {
            const count = rest[0] ? parseInt(rest[0]) : 20;
            const msgs = await client.orchestrator.messageLog(count);
            for (const m of msgs) {
              console.log(`  ${m.from || '?'} → ${m.to || '?'}: ${(m.message || '').slice(0, 60)}`);
            }
            break;
          }
          default: console.error(`Unknown: ${sub}`); return 1;
        }
        break;
      }

      case 'bb': case 'blackboard': {
        switch (sub) {
          case 'get': case 'read': {
            if (rest.length) {
              const entry = await client.orchestrator.blackboard.get(rest[0]);
              if (entry) { printJson(entry); } else { console.log(`Key '${rest[0]}' not found`); }
            } else {
              const facts = await client.orchestrator.blackboard.all();
              const keys = Object.keys(facts);
              if (!keys.length) { console.log('No facts on blackboard.'); break; }
              for (const [key, entry] of Object.entries(facts)) {
                const val = typeof entry.value === 'object' ? JSON.stringify(entry.value) : String(entry.value);
                console.log(`  ${key.padEnd(30)} = ${val.slice(0, 60).padEnd(60)} [${entry.source || '?'}]`);
              }
            }
            break;
          }
          case 'set': case 'write': {
            if (rest.length < 2) { console.error('Usage: studex bb set <key> <value>'); return 1; }
            let value; try { value = JSON.parse(rest[1]); } catch { value = rest[1]; }
            await client.orchestrator.blackboard.set(rest[0], value);
            console.log(`✅ Set ${rest[0]} = ${JSON.stringify(value).slice(0, 60)}`);
            break;
          }
          case 'delete': case 'del': case 'rm': {
            if (!rest.length) { console.error('Usage: studex bb delete <key>'); return 1; }
            await client.orchestrator.blackboard.delete(rest[0]);
            console.log(`✅ Deleted ${rest[0]}`);
            break;
          }
          default: console.error(`Unknown: ${sub}`); return 1;
        }
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        console.error("Run 'studex help' for usage.");
        return 1;
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    return 1;
  }
  return 0;
}

main().then(process.exit).catch(() => process.exit(1));
