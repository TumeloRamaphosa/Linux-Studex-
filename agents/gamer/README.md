# Gamer agent — Studex Arcade

The **Gamer** agent owns **Studex Arcade**, the browser game hub for the Linux StudEx Agent Operating System.

| Item | Path |
|------|------|
| Arcade hub | [`arcade/`](arcade/) |
| Entry page | [`arcade/index.html`](arcade/index.html) |

## Run locally

From the repository root:

```bash
python3 -m http.server 8765
```

Then open:

- Hub: `http://127.0.0.1:8765/agents/gamer/arcade/index.html`
- OS dashboard (with Arcade link): `http://127.0.0.1:8765/dashboard.html`

When the Node backend is running (`server/`), static files from the repo root are also available under the same paths on the server port.

## Branding

Hub copy uses **Studex Arcade — powered by Stud-Bot**. Visual theme: **Berzerker** (near-black, blood-red frames, grim backdrop).

## Games

Six vendored HTML5 titles under `arcade/games/`, each with its upstream LICENSE. See the hub **Credits** section and [`arcade/README.md`](arcade/README.md).
