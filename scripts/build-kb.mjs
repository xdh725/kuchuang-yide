#!/usr/bin/env node
// 知识库 → 向量入库：解析 frontmatter → 校验 → 智谱 embedding（双语拼接）→ vectors.json + kb-manifest.json
// 用法：source ~/.claude/credentials.env && node scripts/build-kb.mjs
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const KB_DIR = 'knowledge-base';
const BASE = process.env.ZHIPU_BASE || 'https://open.bigmodel.cn/api/paas/v4';
const KEY = process.env.ZHIPU_API_KEY;
if (!KEY) { console.error('missing ZHIPU_API_KEY'); process.exit(1); }

// ---- 最小 frontmatter 解析（YAML 子集：k: v / k: [a, b] / 多行 ---）----
function parseMd(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return null;
  const meta = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].replace(/^\[|\]$/g, '').trim();
  }
  return { meta, body: m[2].trim() };
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.md') && name !== 'README.md') out.push(p);
  }
  return out;
}

async function embedBatch(texts) {
  const r = await fetch(BASE + '/embeddings', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'embedding-3', input: texts }),
  });
  if (!r.ok) throw new Error('embed HTTP ' + r.status + ' ' + (await r.text()).slice(0, 200));
  const d = await r.json();
  return d.data.map((x) => x.embedding);
}

const files = walk(KB_DIR);
console.log('found', files.length, 'entries');
const entries = [];
const seen = new Set();
for (const f of files) {
  const parsed = parseMd(readFileSync(f, 'utf8'));
  if (!parsed) { console.warn('SKIP (no frontmatter):', f); continue; }
  const { meta, body } = parsed;
  if (meta.verified !== 'true') { console.warn('SKIP (not verified):', f); continue; }
  if (seen.has(meta.id)) { console.error('DUP id:', meta.id, f); process.exit(1); }
  seen.add(meta.id);
  entries.push({ file: relative(KB_DIR, f), meta, body });
}
if (!entries.length) { console.error('no valid entries'); process.exit(1); }

// ---- 双语拼接 → 一次 embedding（中英提问都命中同一条）----
const vectors = [];
const manifest = [];
const BATCH = 16;
for (let i = 0; i < entries.length; i += BATCH) {
  const batch = entries.slice(i, i + BATCH);
  const texts = batch.map((e) => e.meta.title + '\n' + e.body); // EN+ZH 已在同 body
  const embs = await embedBatch(texts);
  batch.forEach((e, j) => {
    vectors.push({
      id: e.meta.id,
      values: embs[j],
      metadata: {
        text: e.body.slice(0, 1200),           // 检索上下文用
        title: e.meta.title,
        tags: e.meta.tags || '',
        source_label: e.meta.id + ' · ' + e.meta.title, // 来源标签
        type: e.meta.type || 'text',
      },
    });
    manifest.push({ id: e.meta.id, title: e.meta.title, tags: (e.meta.tags || '').split(',').map(s => s.trim()).filter(Boolean), type: e.meta.type || 'text', file: e.file });
  });
  console.log('embedded', Math.min(i + BATCH, entries.length), '/', entries.length);
}

writeFileSync('vectors.json', JSON.stringify(vectors));
writeFileSync('kb-manifest.json', JSON.stringify(manifest, null, 2));
console.log('✓ vectors.json (' + vectors.length + ') + kb-manifest.json');
console.log('  next: wrangler vectorize insert kcyd-kb --file=vectors.json --binding=KB');
