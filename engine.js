/*
 * MNP engine — domain-agnostic core.
 * Reads window.MNP_SCHEMA (see domain/schema.js). Do NOT edit per-domain logic
 * here; change domain/schema.js + domain/NOTATION.md + data/diagram.mnp instead.
 *
 * Responsibilities: parse / serialize (symmetric), apply, SVG render, drag,
 * textarea two-way sync, file polling (Claude Code edits -> live update),
 * and save-back to the data file via POST /save (drag -> file).
 */
(function () {
  const SCHEMA = window.MNP_SCHEMA;
  const KW = SCHEMA.nodeKeyword;
  const ATTRS = SCHEMA.attributes || [];
  const PALETTE = SCHEMA.palette;
  const COLOR_KEYS = Object.keys(PALETTE);
  const DCOLOR = SCHEMA.defaultColor || COLOR_KEYS[0];
  const DICON = SCHEMA.defaultIcon || (SCHEMA.icons || [])[0] || 'node';
  const SOLID = SCHEMA.edge.solid, DASHED = SCHEMA.edge.dashed;
  const DATA_FILE = SCHEMA.dataFile || 'data/diagram.mnp';

  // ---- state: the single source of truth ----
  const S = { nodes: {}, edges: [] };
  let idCounter = 1, selected = null, linkMode = false, linkFrom = null;

  const esc = s => String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const unesc = s => String(s).replace(/\\"/g, '"').replace(/\\\\/g, '\\');

  // ---- serialize: state -> notation text ----
  function serialize() {
    const L = [`# ${SCHEMA.title} (MNP data)`, ''];
    for (const [id, n] of Object.entries(S.nodes)) {
      L.push(`${KW} ${id} "${esc(n.label)}" ${n.color} ${n.icon}`);
      for (const a of ATTRS) if (n.attrs[a]) L.push(`  ${a}: ${esc(n.attrs[a])}`);
      L.push('');
    }
    for (const e of S.edges) L.push(`${e.src} ${e.dash ? DASHED : SOLID} ${e.dst} "${esc(e.label)}"`);
    L.push('', 'layout');
    for (const [id, n] of Object.entries(S.nodes)) L.push(`${id} ${Math.round(n.x)} ${Math.round(n.y)}`);
    return L.join('\n');
  }

  // ---- normalize: absorb human/AI input drift ----
  function normalize(t) {
    return t.replace(/<\/?notation>/g, '').replace(/^```\w*$/gm, '')
      .replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
      .replace(/→/g, '->').replace(/＞/g, '>').trim();
  }

  // ---- parse: notation text -> intermediate structure (tolerant) ----
  const nodeRe = new RegExp('^' + KW + '\\s+(\\w+)\\s+"((?:[^"\\\\]|\\\\.)*)"(?:\\s+(\\w+))?(?:\\s+(\\w+))?');
  const edgeRe = new RegExp('^(\\w+)\\s*(' + escRe(DASHED) + '|' + escRe(SOLID) + ')\\s*(\\w+)\\s+"((?:[^"\\\\]|\\\\.)*)"');
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function parse(text) {
    const res = { nodes: {}, edges: [] }, warnings = [];
    let mode = null, current = null;
    text = normalize(text);
    text.split('\n').forEach((raw, i) => {
      const line = raw.replace(/\s+$/, ''), t = line.trim();
      if (!t || t.startsWith('#')) { if (!/^\s/.test(line)) current = null; return; }
      const am = t.match(nodeRe);
      if (am) {
        const [, id, label, color, icon] = am;
        res.nodes[id] = {
          label: unesc(label), color: PALETTE[color] ? color : DCOLOR, icon: icon || DICON,
          attrs: {}, x: 600 + (Math.random() * 200 - 100), y: 400 + (Math.random() * 200 - 100),
        };
        current = id; return;
      }
      if (current && /^\s/.test(line)) {
        const am2 = t.match(/^(\w+):\s*(.*)/);
        if (am2 && ATTRS.includes(am2[1])) res.nodes[current].attrs[am2[1]] = unesc(am2[2]);
        return;
      }
      current = null;
      const em = t.match(edgeRe);
      if (em) { res.edges.push({ src: em[1], dst: em[3], dash: em[2] === DASHED, label: unesc(em[4]) }); return; }
      if (t === 'layout') { mode = 'layout'; return; }
      if (mode === 'layout') {
        const pm = t.match(/^(\w+)\s+(-?[\d.]+)\s+(-?[\d.]+)/);
        if (pm && res.nodes[pm[1]]) { res.nodes[pm[1]].x = +pm[2]; res.nodes[pm[1]].y = +pm[3]; return; }
      }
      warnings.push(`${i + 1}: ${t}`);
    });
    const ids = new Set(Object.keys(res.nodes));
    res.edges = res.edges.filter(e => ids.has(e.src) && ids.has(e.dst));
    res.warnings = warnings;
    let mx = 0; for (const id of ids) { const m = id.match(/(\d+)$/); if (m) mx = Math.max(mx, +m[1]); }
    idCounter = mx + 1;
    return res;
  }

  // ---- apply: intermediate -> state -> render ----
  function apply(parsed, { fromNotation = false } = {}) {
    Object.keys(S.nodes).forEach(k => delete S.nodes[k]);
    Object.assign(S.nodes, parsed.nodes);
    S.edges = parsed.edges;
    render();
    if (!fromNotation) syncToNotation();
    if (parsed.warnings && parsed.warnings.length) log('⚠ ' + parsed.warnings.join(' / '));
  }

  // ---- render: state -> SVG ----
  const svg = document.getElementById('svg');
  const mk = (tag, a) => { const n = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const k in a) n.setAttribute(k, a[k]); return n; };
  function render() {
    svg.innerHTML = '<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#6b7785"/></marker></defs>';
    for (const e of S.edges) {
      const a = S.nodes[e.src], b = S.nodes[e.dst]; if (!a || !b) continue;
      const ang = Math.atan2(b.y - a.y, b.x - a.x), r = 42;
      const x1 = a.x + Math.cos(ang) * r, y1 = a.y + Math.sin(ang) * r, x2 = b.x - Math.cos(ang) * r, y2 = b.y - Math.sin(ang) * r;
      svg.appendChild(mk('line', { x1, y1, x2, y2, stroke: '#6b7785', 'stroke-width': 2, 'stroke-dasharray': e.dash ? '6 5' : '0', 'marker-end': 'url(#arrow)' }));
      const t = mk('text', { x: (x1 + x2) / 2, y: (y1 + y2) / 2 - 4, 'class': 'edge-label' }); t.textContent = e.label; svg.appendChild(t);
    }
    for (const [id, n] of Object.entries(S.nodes)) {
      const sub = ATTRS.map(a => n.attrs[a]).find(Boolean);
      const g = mk('g', { transform: `translate(${n.x},${n.y})`, 'data-id': id, style: 'cursor:grab' });
      g.appendChild(mk('circle', { r: 42, fill: PALETTE[n.color] || PALETTE[DCOLOR], stroke: selected === id ? '#fff' : 'rgba(0,0,0,.25)', 'stroke-width': selected === id ? 3 : 1.5 }));
      const lab = mk('text', { 'text-anchor': 'middle', y: sub ? -2 : 5, 'class': 'node-label' }); lab.textContent = n.label; g.appendChild(lab);
      if (sub) { const rl = mk('text', { 'text-anchor': 'middle', y: 13, 'class': 'node-sub' }); rl.textContent = sub.slice(0, 8); g.appendChild(rl); }
      const idt = mk('text', { 'text-anchor': 'middle', y: 60, 'class': 'edge-label' }); idt.textContent = id; g.appendChild(idt);
      svg.appendChild(g);
    }
  }

  // ---- textarea two-way sync ----
  const notation = document.getElementById('notation');
  function syncToNotation() { notation.value = serialize(); }
  let syncTimer = null;
  notation.addEventListener('input', () => {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      try { apply(parse(notation.value), { fromNotation: true }); persist(); stat('記法→図 反映'); }
      catch (e) { stat('⚠ 記法エラー'); }
    }, 700);
  });

  // ---- drag & drop ----
  let drag = null;
  const pt = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); };
  svg.addEventListener('mousedown', e => {
    const g = e.target.closest('g[data-id]'); if (!g) { selected = null; render(); return; }
    const id = g.dataset.id;
    if (linkMode) {
      if (!linkFrom) { linkFrom = id; stat(`接続元:${id} → 接続先クリック`); }
      else if (linkFrom !== id) {
        S.edges.push({ src: linkFrom, dst: id, dash: false, label: '価値提供' });
        linkFrom = null; linkMode = false; document.getElementById('linkBtn').classList.remove('on');
        render(); syncToNotation(); persist(); stat('矢印追加');
      }
      return;
    }
    selected = id; const p = pt(e); drag = { id, dx: p.x - S.nodes[id].x, dy: p.y - S.nodes[id].y }; render();
  });
  svg.addEventListener('mousemove', e => { if (!drag) return; const p = pt(e); S.nodes[drag.id].x = p.x - drag.dx; S.nodes[drag.id].y = p.y - drag.dy; render(); });
  window.addEventListener('mouseup', () => { if (drag) { drag = null; syncToNotation(); persist(); stat('座標をファイルに保存'); } });

  // ---- toolbar ----
  function stat(s) { document.getElementById('stat').textContent = s; }
  function log(s) { const l = document.getElementById('log'); l.textContent = (s + '\n' + l.textContent).slice(0, 4000); }
  document.getElementById('addBtn').onclick = () => {
    const id = 'N' + (idCounter++), c = COLOR_KEYS[Object.keys(S.nodes).length % COLOR_KEYS.length];
    S.nodes[id] = { label: '新ノード', color: c, icon: DICON, attrs: {}, x: 600 + Math.random() * 120 - 60, y: 400 + Math.random() * 120 - 60 };
    selected = id; render(); syncToNotation(); persist(); stat(`${id} 追加`);
  };
  document.getElementById('linkBtn').onclick = e => { linkMode = !linkMode; linkFrom = null; e.target.classList.toggle('on', linkMode); stat(linkMode ? '接続モード' : ''); };
  document.getElementById('delBtn').onclick = () => {
    if (!selected) return stat('ノード未選択');
    delete S.nodes[selected]; S.edges = S.edges.filter(x => x.src !== selected && x.dst !== selected);
    selected = null; render(); syncToNotation(); persist(); stat('削除');
  };
  document.getElementById('fitBtn').onclick = fitView;
  function fitView() {
    const ns = Object.values(S.nodes); if (!ns.length) return;
    const xs = ns.map(n => n.x), ys = ns.map(n => n.y);
    const a = Math.min(...xs) - 100, b = Math.max(...xs) + 100, c = Math.min(...ys) - 100, d = Math.max(...ys) + 100;
    svg.setAttribute('viewBox', `${a} ${c} ${Math.max(400, b - a)} ${Math.max(300, d - c)}`);
  }
  const copyBtn = document.getElementById('copyBtn');
  if (copyBtn) copyBtn.onclick = () => navigator.clipboard.writeText(serialize()).then(() => stat('記法をコピー')).catch(() => stat('コピー失敗'));

  // ---- file loop: poll DATA_FILE (Claude edits -> live); save back (drag -> file) ----
  let lastFileText = null, watching = true, canSave = false;
  const livePill = document.getElementById('livePill');
  function updatePill() { livePill.textContent = watching ? '● ファイル監視: ON (1.5s)' : '● ファイル監視: 停止'; livePill.classList.toggle('live', watching); }

  async function loadFile(announce) {
    try {
      const r = await fetch(DATA_FILE + '?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const text = await r.text(); canSave = true;
      if (text !== lastFileText) {
        lastFileText = text; apply(parse(text)); fitView();
        log('📄 ' + DATA_FILE + ' の変更を検知 → 反映'); stat('ファイル変更を反映');
      } else if (announce) stat('変更なし');
    } catch (e) {
      stat('⚠ ローカルサーバ経由で開いてください（npm start）');
      log('⚠ ' + e.message + ' — file:// では fetch がブロックされます。node server.js で配信してください');
      watching = false; updatePill();
    }
  }
  let saveTimer = null;
  function persist() {
    if (!canSave) return;            // skip until first successful load (avoids file:// errors)
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const text = serialize(); lastFileText = text;   // mark so the poller won't re-apply our own write
      try { await fetch('/save', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: text }); }
      catch (e) { log('⚠ 保存失敗: ' + e.message); }
    }, 400);
  }
  function poll() { if (watching) loadFile(false); setTimeout(poll, 1500); }

  document.getElementById('watchBtn').onclick = () => { watching = !watching; updatePill(); stat(watching ? '監視ON' : '監視OFF'); };
  document.getElementById('reloadBtn').onclick = () => loadFile(true);

  // ---- boot ----
  document.getElementById('title').textContent = 'MNP — ' + SCHEMA.title;
  updatePill();
  loadFile(true).then(() => poll());
  log('起動。Claude Code に「' + DATA_FILE + ' を編集して」と頼むと自動反映されます。');
})();
