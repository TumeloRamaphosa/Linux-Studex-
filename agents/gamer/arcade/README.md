# Studex Arcade (static hub)

**Owner:** Gamer agent (Head of Studex Arcade)  
**Branding:** Studex Arcade — powered by Stud-Bot  
**Theme:** Berzerker (CSS + SVG backdrop; original art, not third-party UI clones)

## Layout

- `index.html` — hub
- `style.css` — Berzerker styling
- `arcade-frame.css` / `arcade-frame.js` — shared top bar on game pages
- `games/` — 2048, hextris, clumsy-bird, tetris, snake, racer

## Local serve

```bash
cd /path/to/Linux-Studex-
python3 -m http.server 8765
# open http://127.0.0.1:8765/agents/gamer/arcade/
```

## Licenses

Every game keeps its LICENSE in its folder. The hub lists all upstream projects in the **Open-source credits** section.
