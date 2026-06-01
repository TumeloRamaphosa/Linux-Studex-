#!/usr/bin/env python3
"""
StudEx SDK CLI — Interact with the StudEx Agent OS from the terminal.

Usage:
    studex --help
    studex health
    studex sandbox spawn [--template python]
    studex sandbox run <id> "<code>"
    studex sandbox list
    studex sandbox destroy <id>
    studex agent list
    studex agent chat <name> "<message>"
    studex agent status <name>
    studex mcp tools
    studex mcp call <name> '{"key": "value"}'
    studex mesh status
    studex mesh task "<description>"
    studex blackboard get [key]
    studex blackboard set <key> <value>

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
        print(json.dumps(data, indent=2, default=str))


def main():
    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help"):
        print(__doc__.strip())
        return 0

    from studex_sdk import StudExClient

    base_url = os.environ.get("STUDEX_URL", "http://localhost:4000")
    timeout = int(os.environ.get("STUDEX_TIMEOUT", "30"))
    client = StudExClient(base_url, timeout=timeout)

    command = args[0]
    sub = args[1] if len(args) > 1 else None
    rest = args[2:]

    try:
        # ── health ────────────────────────────────────────────────────
        if command == "health":
            print_json(client.health())

        # ── sandbox ───────────────────────────────────────────────────
        elif command == "sandbox":
            if sub == "spawn":
                template = "python"
                if rest and rest[0].startswith("--template="):
                    template = rest[0].split("=", 1)[1]
                elif rest and not rest[0].startswith("--"):
                    template = rest[0]
                result = client.sandbox.spawn(template)
                print(f"✅ Spawned {result['id']} ({template})")
                print(f"   Work dir: {result.get('workDir', 'N/A')}")

            elif sub == "run":
                if len(rest) < 2:
                    print("Usage: studex sandbox run <id> '<code>'")
                    return 1
                sb_id = rest[0]
                code = rest[1]
                result = client.sandbox.run(sb_id, code)
                if result.get("stdout"):
                    print(result["stdout"])
                if result.get("stderr"):
                    print(result["stderr"], file=sys.stderr)
                print(f"Exit code: {result.get('exitCode', '?')}")

            elif sub == "list":
                data = client.sandbox.list()
                sandboxes = data.get("sandboxes", [])
                if not sandboxes:
                    print("No active sandboxes.")
                else:
                    for sb in sandboxes:
                        remaining = sb.get("remainingMs", 0) // 1000
                        print(f"  {sb['id'][-16:]}  {sb['template']:8}  "
                              f"{sb['commands']} cmds  {remaining}s remaining")
                stats = data.get("stats", {})
                print(f"\nStats: {stats.get('active', 0)}/{stats.get('max', '?')} active, "
                      f"Docker: {'✓' if stats.get('dockerAvailable') else '✗'}")

            elif sub == "destroy":
                if not rest:
                    print("Usage: studex sandbox destroy <id>")
                    return 1
                result = client.sandbox.destroy(rest[0])
                print(f"Destroyed {rest[0]}")

            elif sub == "templates":
                data = client.sandbox.templates()
                for t in data.get("templates", []):
                    print(f"  {t['name']:8}  {t['description']}")

            else:
                print(f"Unknown sandbox subcommand: {sub}")
                return 1

        # ── agent ─────────────────────────────────────────────────────
        elif command == "agent":
            if sub == "list":
                agents = client.agents.list()
                print(f"{'Name':12} {'Role':30} {'RVS':8} {'Status':10} {'Uptime':8}")
                print("-" * 70)
                for a in agents:
                    print(f"{a['name']:12} {a['role']:30} {a.get('rvs', ''):8} "
                          f"{a['status']:10} {a.get('uptime', 0)}m")

            elif sub == "chat":
                if len(rest) < 2:
                    print("Usage: studex agent chat <name> '<message>'")
                    return 1
                result = client.agents.chat(rest[0], rest[1])
                print(result.get("response", ""))

            elif sub == "status":
                if not rest:
                    print("Usage: studex agent status <name>")
                    return 1
                status = client.agents.status(rest[0])
                print_json(status)

            elif sub == "logs":
                name = rest[0] if rest else None
                lines = int(rest[1]) if len(rest) > 1 else 50
                if not name:
                    print("Usage: studex agent logs <name> [lines]")
                    return 1
                result = client.agents.logs(name, lines)
                for log in result.get("logs", []):
                    print(f"  {log}")

            else:
                print(f"Unknown agent subcommand: {sub}")
                return 1

        # ── mcp ───────────────────────────────────────────────────────
        elif command == "mcp":
            if sub == "tools":
                tools = client.mcp.list_tools()
                print(f"{'Name':35} {'Description':50} {'Params'}")
                print("-" * 120)
                for t in tools:
                    params = list(t.get("inputSchema", {}).get("properties", {}).keys())
                    print(f"{t['name']:35} {t['description']:50} {', '.join(params)}")
                print(f"\nTotal: {len(tools)} tools")

            elif sub == "call":
                if len(rest) < 1:
                    print("Usage: studex mcp call <name> '[args_json]'")
                    return 1
                name = rest[0]
                args = json.loads(rest[1]) if len(rest) > 1 else {}
                result = client.mcp.call_tool(name, args)
                print_json(result)

            elif sub == "info":
                info = client.mcp.info()
                print_json(info)

            else:
                print(f"Unknown mcp subcommand: {sub}")
                return 1

        # ── mesh / orchestrate ────────────────────────────────────────
        elif command == "mesh":
            if sub == "status":
                print_json(client.orchestrator.status())

            elif sub == "task":
                if not rest:
                    print("Usage: studex mesh task '<description>'")
                    return 1
                result = client.orchestrator.route_task(rest[0])
                print(f"Plan: {result.get('plan', 'N/A')}")
                for a in result.get("assignments", []):
                    print(f"  → {a['agent']}: {a['task']}")
                print("\nResults:")
                for name, r in result.get("results", {}).items():
                    resp = r.get("response", "")
                    print(f"  {name}: {resp[:120]}...")

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

            elif sub == "workflow":
                if len(rest) < 1:
                    print("Usage: studex mesh workflow <name> '<steps_json>'")
                    return 1
                name = rest[0]
                steps = json.loads(rest[1]) if len(rest) > 1 else []
                result = client.orchestrator.workflow(name, steps)
                print_json(result)

            else:
                print(f"Unknown mesh subcommand: {sub}")
                return 1

        # ── blackboard ────────────────────────────────────────────────
        elif command == "blackboard":
            if sub == "get":
                if rest:
                    fact = client.orchestrator.blackboard_get(rest[0])
                    if fact:
                        print_json(fact)
                    else:
                        print(f"Key '{rest[0]}' not found")
                else:
                    facts = client.orchestrator.blackboard_get_all()
                    if facts:
                        for key, entry in facts.items():
                            val = entry.get("value", "")
                            source = entry.get("source", "?")
                            val_str = json.dumps(val) if not isinstance(val, str) else val
                            print(f"  {key:30} = {str(val_str)[:60]:60}  [{source}]")
                    else:
                        print("No facts on blackboard.")

            elif sub == "set":
                if len(rest) < 2:
                    print("Usage: studex blackboard set <key> <value>")
                    return 1
                # Try to parse value as JSON, fallback to string
                try:
                    value = json.loads(rest[1])
                except (json.JSONDecodeError, IndexError):
                    value = rest[1]
                result = client.orchestrator.blackboard_set(rest[0], value)
                print(f"Set {rest[0]} = {json.dumps(value)[:60]}")

            elif sub == "delete":
                if not rest:
                    print("Usage: studex blackboard delete <key>")
                    return 1
                client.orchestrator.blackboard_delete(rest[0])
                print(f"Deleted {rest[0]}")

            else:
                print(f"Unknown blackboard subcommand: {sub}")
                return 1

        else:
            print(f"Unknown command: {command}")
            print("Run 'studex --help' for usage.")
            return 1

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
