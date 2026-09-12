// 智谱 GLM 统一封装（与 workers/src/llm.js 同构；env → config）
import { ZHIPU_API_KEY, CHAT_MODEL, FILTER_MODEL, EMBED_MODEL } from './config.js';

const BASE = 'https://open.bigmodel.cn/api/paas/v4';
const TIMEOUT_MS = 30000;

async function zhipuFetch(path, body, timeout = TIMEOUT_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(BASE + path, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + ZHIPU_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: ctrl.signal,
    });
    if (!r.ok) throw new Error('zhipu ' + path + ' HTTP ' + r.status + ' ' + (await r.text()).slice(0, 200));
    return await r.json();
  } finally { clearTimeout(t); }
}

export async function chat(model, messages, opts = {}) {
  const body = { model, messages, temperature: opts.temperature ?? 0.2, max_tokens: opts.max_tokens ?? 800 };
  if (opts.noThinking) body.thinking = { type: 'disabled' };
  const d = await zhipuFetch('/chat/completions', body, opts.timeout ?? TIMEOUT_MS);
  const content = d.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new Error('zhipu chat empty content');
  return content.trim();
}

export async function embed(text) {
  const d = await zhipuFetch('/embeddings', { model: EMBED_MODEL, input: text, dimensions: 1536 });
  const vec = d.data?.[0]?.embedding;
  if (!Array.isArray(vec) || !vec.length) throw new Error('zhipu embedding empty vector');
  return vec;
}

export const models = () => ({ CHAT_MODEL, FILTER_MODEL, EMBED_MODEL });
