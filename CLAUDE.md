# Claude Code instructions for this MNP repo

This repository is an MNP (Mid Notation Pattern) editor. The diagram state lives
as a plain-text notation file. You act as the AI editing engine: the user asks in
chat, you edit the data file, and the running browser page reflects it within ~1.5s.

## Where things are

- `data/diagram.mnp` — THE DATA. This is what you edit on user request.
- `domain/NOTATION.md` — the notation spec and design rules. READ THIS before editing.
- `domain/schema.js` — node colors/icons/attributes and edge tokens for this domain.
- `engine.js`, `index.html`, `server.js` — the engine. Do not touch unless asked.

## How to edit on request

1. Read `domain/NOTATION.md` to learn the current notation grammar and rules.
2. Read `data/diagram.mnp` to get the current full state.
3. Apply the user's change by editing `data/diagram.mnp`, obeying every rule in
   NOTATION.md. In particular:
   - Keep the file a COMPLETE state (all nodes, all edges, all layout coords).
   - Preserve existing IDs and existing layout coordinates. Place new nodes near
     related existing nodes (±200px) in the `layout` section.
   - IDs are alphanumeric only.
4. Do not run a server or call any API for the edit itself — just edit the file.
   The user runs `npm start` once; the page polls the file and re-renders.

## Changing the domain

If the user wants a different domain (org chart, dependency map, journey, etc.),
edit `domain/schema.js` (title, nodeKeyword, attributes, palette, icons, edge) and
rewrite `domain/NOTATION.md`, then re-initialize `data/diagram.mnp`. No engine
changes are needed for any node-and-edge (graph-shaped) domain.
