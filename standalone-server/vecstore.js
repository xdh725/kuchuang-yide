// 本地向量库替代 Cloudflare Vectorize：全量载入内存，余弦相似度 top-K。
// 规模预算：万条 × 1536 维 float32 ≈ 60MB，1.8G 内存服务器够用（当前 15 条）。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VEC_FILE = join(__dirname, '..', 'vectors.json');

let store = []; // [{id, values(Float64Array), metadata}]

export function loadVectors() {
  if (!existsSync(VEC_FILE)) { store = []; return store; }
  const raw = JSON.parse(readFileSync(VEC_FILE, 'utf8'));
  store = raw.map((v) => ({ id: v.id, values: new Float64Array(v.values), metadata: v.metadata }));
  return store;
}

export function upsertVectors(vectors) {
  for (const v of vectors) {
    const i = store.findIndex((x) => x.id === v.id);
    const item = { id: v.id, values: new Float64Array(v.values), metadata: v.metadata };
    if (i >= 0) store[i] = item; else store.push(item);
  }
  persist();
}

export function removeVectors(ids) {
  store = store.filter((x) => !ids.includes(x.id));
  persist();
}

function persist() {
  writeFileSync(VEC_FILE, JSON.stringify(store.map((x) => ({
    id: x.id, values: Array.from(x.values), metadata: x.metadata,
  }))));
}

export function query(qvec, topK = 5) {
  const q = new Float64Array(qvec);
  let qn = 0;
  for (const x of q) qn += x * x;
  qn = Math.sqrt(qn);
  return store
    .map((item) => {
      let d = 0, n = 0;
      for (let i = 0; i < q.length; i++) { d += q[i] * item.values[i]; n += item.values[i] * item.values[i]; }
      return { id: item.id, score: d / (qn * Math.sqrt(n)), metadata: item.metadata };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
