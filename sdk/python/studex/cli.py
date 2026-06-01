#!/usr/bin/env python3
"""
StudEx CLI — Interact with the StudEx Agent OS from the terminal.

Pattern matches Google ADK's CLI:
    adk run <agent_name>          →  studex agent chat <name> "<message>"
    adk web                       →  studex health
    adk deploy <agent_name>       →  studex deploy

Usage:
    studex [command] [subcommand] [args...]

Commands:
    agent                         Chat with agents, check status
    sandbox                       Spawn sandboxes, run code
    mcp                           Discover and call MCP tools
    mesh                          Multi-agent orchestration
    blackboard                    Shared agent state
    health                        Server health check
    ping                          Quick connectivity check
    help                          Show this help

Environment:
    STUDEX_URL     Server URL (default: http://localhost:4000)
    STUDEX_TIMEOUT Request timeout in seconds (default: 30)
"""

import sys
import os
import json


def print_json(data):
    """Pretty-print JSON data."""
    if isinstance(data, str):
        print(data)
    else:
        print(json.dumps(data, indent=2, default=str, ensure_ascii=False))


def main():
    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help", "help"):
        print(__doc__.strip())
        return 0

    from studex import StudEx

    base_url = os.environ.get("STUDEX_URL", "http://localhost:4000")
    timeout = int(os.environ.get("STUDEX_TIMEOUT", "30"))
    client = StudEx(base_url=base_url, timeout=timeout)

    command = args[0]
    sub = args[1] if len(args) > 1 else None
    rest = args[2:]

    try:
        # ── health / ping ──────────────────────────────────────────────
        if command == "health":
            print_json(client.health())

        elif command == "ping":
            ok = client.ping()
            print(f"{'✅' if ok else '❌'} Server {'reachable' if ok else 'unreachable'} at {base_url}")
            return 0 if ok else 1

        # ── agent ─────────────────────────────────────────────────────
        elif command == "agent":
            if sub == "list" or sub == "ls":
                agents = client.agents.list()
                print(f"{'Name'.ljust(12)} {'Role'.ljust(30)} {'RVS'.ljust(8)} {'Status'.ljust(10)} {'Msgs'.ljust(6)}")
                print("-" * 68)
                for a in agents:
                    print(f"{a.name.ljust(12)} {a.role.ljust(30)} {a.rvs.ljust(8)} "
                          f"{a.status.ljust(10)} {str(a.messages).ljust(6)}")

            elif sub in ("chat", "create", "send"):
                if len(rest) < 2:
                    print("Usage: studex agent chat <name> '<message>'")
                    return 1
                resp = client.agents.create(rest[0], rest[1])
                print(resp.response)

            elif sub == "status":
                if not rest:
                    print("Usage: studex agent status <name>")
                    return 1
                print_json(client.agents.status(rest[0]))

            elif sub == "logs":
                name = rest[0] if rest else None
                lines = int(rest[1]) if len(rest) > 1 else 50
                if not name:
                    print("Usage: studex agent logs <name> [lines]")
                    return 1
                logs = client.agents.logs(name, lines)
                for log in logs:
                    print(f"  {log}")

            else:
                print(f"Unknown agent subcommand: {sub}")
                return 1

        # ── sandbox ────────────────────────────────────────────────────
        elif command == "sandbox":
            if sub == "spawn":
                template = rest[0] if rest else "python"
                sb = client.sandbox.spawn(template)
                print(f"✅ Spawned {sb.id} ({sb.template})")
                print(f"   Template: {sb.template_description}")

            elif sub == "run":
                if len(rest) < 2:
                    print("Usage: studex sandbox run <id> '<code>'")
                    return 1
                result = client.sandbox.run(rest[0], rest[1])
                if result.stdout:
                    sys.stdout.write(result.stdout + "\n")
                if result.stderr:
                    sys.stderr.write(result.stderr + "\n")
                print(f"Exit code: {result.exit_code}")

            elif sub in ("list", "ls"):
                sandboxes = client.sandbox.list()
                if not sandboxes:
                    print("No active sandboxes.")
                else:
                    for sb in sandboxes:
                        print(f"  {sb.id[-16:]}  {sb.template.ljust(8)}  "
                              f"{sb.commands} cmds  {sb.remaining_ms // 1000}s")
                stats = client.sandbox.stats()
                print(f"\nStats: {stats.get('active', 0)}/{stats.get('max', '?')} active, "
                      f"Docker: {'✓' if stats.get('dockerAvailable') else '✗'}")

            elif sub == "destroy":
                if not rest:
                    print("Usage: studex sandbox destroy <id>")
                    return 1
                client.sandbox.destroy(rest[0])
                print(f"✅ Destroyed {rest[0]}")

            elif sub == "templates":
                templates = client.sandbox.templates()
                for t in templates:
                    print(f"  {t.name.ljust(8)}  {t.description}")

            elif sub == "session":
                template = rest[0] if rest else "python"
                print(f"Starting sandbox session ({template})...")
                with client.sandbox.session(template) as sb:
                    print(f"  Sandbox: {sb.id}")
                    while True:
                        try:
                            code = input("  code> ")
                            if code.lower() in ("exit", "quit"):
                                break
                            result = sb.run(code)
                            if result.stdout:
                                print(f"  {result.stdout}")
                            if result.stderr:
                                print(f"  [err] {result.stderr}")
                        except (EOFError, KeyboardInterrupt):
                            break
                print("Session ended, sandbox destroyed.")

            else:
                print(f"Unknown sandbox subcommand: {sub}")
                return 1

        # ── mcp ────────────────────────────────────────────────────────
        elif command == "mcp":
            if sub == "tools":
                tools = client.mcp.tools.list()
                print(f"{'Name'.ljust(35)} {'Description'.ljust(50)} Params")
                print("-" * 120)
                for t in tools:
                    params = ", ".join(t.parameters)
                    print(f"{t.name.ljust(35)} {t.description.ljust(50)} {params}")
                print(f"\nTotal: {len(tools)} tools")

            elif sub == "call":
                if len(rest) < 1:
                    print("Usage: studex mcp call <name> [args_json]")
                    return 1
                name = rest[0]
                args = json.loads(rest[1]) if len(rest) > 1 else {}
                result = client.mcp.tools.call(name, args)
                print_json(result)

            elif sub == "info":
                print_json(client.mcp.info())

            else:
                print(f"Unknown mcp subcommand: {sub}")
                return 1

        # ── mesh ───────────────────────────────────────────────────────
        elif command == "mesh":
            if sub == "status":
                print_json(client.orchestrator.status().__dict__)

            elif sub == "task":
                if not rest:
                    print("Usage: studex mesh task '<description>'")
                    return 1
                task = client.orchestrator.tasks.create(rest[0])
                print(f"Plan: {task.plan}")
                for a in task.assignments:
                    print(f"  → {a.agent}: {a.task}")
                if task.results:
                    print("\nResults:")
                    for name, r in task.results.items():
                        resp = r.get("response", "") if isinstance(r, dict) else str(r)
                        print(f"  {name}: {resp[:120]}")

            elif sub == "send":
                if len(rest) < 3:
                    print("Usage: studex mesh send <from> <to> '<message>'")
                    return 1
                result = client.orchestrator.send(rest[0], rest[1], rest[2])
                print(result.get("response", ""))

            elif sub == "broadcast":
                if not rest:
                    print("Usage: studex mesh broadcast '<message>'")
                    return 1
                result = client.orchestrator.broadcast("cli", rest[0])
                for name, resp in result.get("responses", {}).items():
                    print(f"  {name}: {str(resp)[:100]}")

            elif sub == "log":
                count = int(rest[0]) if rest else 20
                messages = client.orchestrator.message_log(count)
                for m in messages:
                    print(f"  {m.get('from','?')} → {m.get('to','?')}: {m.get('message','')[:60]}")

            else:
                print(f"Unknown mesh subcommand: {sub}")
                return 1

        # ── blackboard ────────────────────────────────────────────────
        elif command in ("blackboard", "bb"):
            if sub in ("get", "read"):
                if rest:
                    entry = client.orchestrator.blackboard.get(rest[0])
                    if entry:
                        print(f"Value: {entry.value}")
                        print(f"Source: {entry.source}")
                        print(f"Updated: {entry.updated_at}")
                    else:
                        print(f"Key '{rest[0]}' not found")
                else:
                    facts = client.orchestrator.blackboard.all()
                    if facts:
                        for key, entry in facts.items():
                            val = json.dumps(entry.value) if not isinstance(entry.value, str) else entry.value
                            print(f"  {key.ljust(30)} = {str(val)[:60].ljust(60)} [{entry.source}]")
                    else:
                        print("No facts on blackboard.")

            elif sub in ("set", "write"):
                if len(rest) < 2:
                    print("Usage: studex bb set <key> <value>")
                    return 1
                try:
                    value = json.loads(rest[1])
                except (json.JSONDecodeError, IndexError):
                    value = rest[1]
                client.orchestrator.blackboard.set(rest[0], value)
                print(f"✅ Set {rest[0]} = {json.dumps(value)[:60]}")

            elif sub in ("delete", "del", "rm"):
                if not rest:
                    print("Usage: studex bb delete <key>")
                    return 1
                client.orchestrator.blackboard.delete(rest[0])
                print(f"✅ Deleted {rest[0]}")

            else:
                print(f"Unknown blackboard subcommand: {sub}")
                return 1

        else:
            print(f"Unknown command: {command}")
            print("Run 'studex help' for usage.")
            return 1

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
