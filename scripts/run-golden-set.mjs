#!/usr/bin/env node
// 黄金集命中率测试 + 阈值 sweep。用法：
//   node scripts/run-golden-set.mjs                       # 按 KB_THRESHOLD 默认阈值
//   node scripts/run-golden-set.mjs --sweep 0.30,0.35,0.40,0.45,0.50
// 输入：tests/golden-set.json [{q, expected_kb_id, lang}]
import { readFileSync, existsSync } from 'node:fs';

const KEY = process.env.ZHIPU_API_KEY;
const BASE = process.env.ZHIPU_BASE || 'https://open.bigmodel.cn/api/paas/v4';
if (!KEY) { console.error('missing ZHIPU_API_KEY'); process.exit(1); }
if (!existsSync('tests/golden-set.json')) {
  console.error('missing tests/golden-set.json（工程师独立编写：50 题标准答案）');
  process.exit(1);
}
const golden = JSON.parse(readFileSync('tests/golden-set.json', 'utf8'));

const args = process.argv.slice(2);
let thresholds = [parseFloat(process.env.KB_THRESHOLD || '0.42')];
if (args[0] === '--sweep') thresholds = args[1].split(',').map(Number);

// 本地跑直接查 vectors.json（不依赖 Vectorize）；部署后可改 Workers 内测端点
const vectors = JSON.parse(readFileSync('vectors.json', 'utf8'));

async function embed(text) {
  const r = await fetch(BASE + '/embeddings', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'embedding-3', input: text }),
  });
  const d = await r.json();
  if (!d.data?.[0]?.embedding) throw new Error('embed failed: ' + JSON.stringify(d).slice(0, 200));
  return d.data[0].embedding;
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// 预计算每题的查询向量与全库相似度
const scored = [];
for (const g of golden) {
  const qv = await embed(g.q);
  const sims = vectors
    .map((v) => ({ id: v.id, score: cosine(qv, v.values) }))
    .sort((a, b) => b.score - a.score);
  scored.push({ ...g, sims });
  process.stdout.write('.');
}
console.log('');

for (const th of thresholds) {
  let hit = 0;
  for (const s of scored) {
    const top5 = s.sims.slice(0, 5);
    const ok = top5.some((x) => x.id === s.expected_kb_id && x.score >= th) && top5[0].score >= th;
    if (ok) hit++;
  }
  const rate = Math.round((hit / scored.length) * 100);
  const mark = rate >= 80 ? '✓ PASS(≥80%)' : '✗';
  console.log(`threshold=${th.toFixed(2)} → hit_rate=${rate}% (${hit}/${scored.length}) ${mark}`);
}
console.log('选满足 ≥80% 的最低阈值，写回 workers/wrangler.toml KB_THRESHOLD');
