# MNP skeleton

English | [日本語](./README-ja.md)

A reusable skeleton for the **Mid Notation Pattern (MNP)**. The diagram state lives in an external text file (`data/diagram.mnp`). Claude Code edits that file directly, giving you an "edit a diagram by talking to an AI" experience with no API key. Zero runtime dependencies (Node built-ins only).

## UX

```
git clone <repo>
cd mnp-skeleton
npm start            # = node server.js (no npm install)
# → open http://127.0.0.1:8777/ in a browser
```

- Drag / add / connect nodes in the browser → auto-saved to `data/diagram.mnp` via `/save`.
- Ask Claude Code, e.g. "add a courier to `data/diagram.mnp` and connect it to the customer with a delivery edge" → the file changes and the page reflects it within ~1.5s.
- Editing the notation text in the right pane also updates the figure (two-way).

No API key needed. Claude Code plays the role of the AI engine by editing `data/diagram.mnp` (the bundled `CLAUDE.md` defines the rules it follows).

## Injecting your own data / domain

This skeleton specializes in node-and-edge **graph** rendering. To repurpose it for another domain, edit just these three files — no JavaScript changes required:

| File | Role |
|---|---|
| `data/diagram.mnp` | The data itself. Put your initial state here. |
| `domain/schema.js` | Node colors / icons / attributes, edge tokens, title, and the data file path. |
| `domain/NOTATION.md` | Notation spec and design rules (the rules Claude Code follows). |

For non-graph subjects (kanban, forms, etc.) you also need to replace `render` / `parse` / `serialize` in `engine.js`.

## Layout

```
mnp-skeleton/
  README.md          English (default)
  README-ja.md       Japanese
  CLAUDE.md          Editing rules for Claude Code
  package.json       start: node server.js (zero deps)
  server.js          Static serving + POST /save (persists drags back to the file)
  index.html         The UI
  engine.js          Domain-agnostic engine (parse/serialize/render/drag/sync/poll/save)
  domain/
    schema.js        ← domain config (edit this)
    NOTATION.md      ← notation spec & rules (edit this)
  data/
    diagram.mnp      ← data (you / Claude Code edit this)
```

## How it works (the MNP sync loop)

```
data/diagram.mnp ──poll(1.5s)──▶ parse ──▶ render(SVG)
       ▲                                        │
       └────── POST /save ◀── serialize ◀── drag / notation edit
       ▲
       └────── Claude Code edits the file
```

The AI only ever handles the lightweight text notation; rendering happens locally (browser JS). This keeps the AI's output small — the source of MNP's speed and cost advantage.

## Configuration

- Port: `PORT=9000 npm start` (default 8777)
- Bind address: `HOST=0.0.0.0 npm start` (default 127.0.0.1)

## Credit

The **Mid Notation Pattern (MNP)** is the name of a design pattern: hold an application's state in a text notation (a DSL) that an AI can read and write, and keep it in two-way sync with the app. This repository is an implementation skeleton of that idea.

## License

MIT License. See [LICENSE](./LICENSE).
