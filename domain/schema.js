/*
 * MNP domain schema — EDIT THIS FILE to adapt the skeleton to your own domain.
 *
 * This is the only file (besides data/ and NOTATION.md) you need to touch to
 * repurpose the graph editor. The engine reads window.MNP_SCHEMA at load time.
 *
 * The built-in renderer draws a node-and-edge graph. Each node is a colored
 * circle with a label; edges are arrows (solid or dashed). Everything below
 * is configurable without writing JavaScript.
 */
window.MNP_SCHEMA = {
  // Shown in the header.
  title: 'サービスエコシステム',

  // The keyword that starts a node definition line.
  //   <nodeKeyword> ID "label" <color> <icon>
  // e.g. nodeKeyword:'actor'  ->  actor O "ネコカフェ運営" teal store
  nodeKeyword: 'actor',

  // Indented attribute keys allowed under a node. Order = serialize order.
  //   role: ...
  //   memo: ...
  // The first attribute is rendered as a small subtitle inside the node.
  attributes: ['role', 'memo'],

  // Color name -> hex. The color name is what appears in the notation text.
  palette: {
    teal: '#5cc8c8', amber: '#e0b15a', coral: '#e07a6a', violet: '#9a8ce0',
    emerald: '#5cc88a', pink: '#e08ac0', sky: '#6ab6e0', orange: '#e09a5a',
    lime: '#aacf5a', purple: '#b07ae0',
  },
  defaultColor: 'teal',

  // Allowed icon tokens (free-form label; used for the legend / validation hint).
  icons: ['person', 'group', 'company', 'store', 'ai', 'app', 'platform', 'data', 'gov', 'service'],
  defaultIcon: 'person',

  // Edge arrow tokens. solid = primary, dashed = secondary.
  edge: { solid: '->', dashed: '-->' },

  // Where the data file lives (relative to repo root). Used by save + poll.
  dataFile: 'data/diagram.mnp',
};
