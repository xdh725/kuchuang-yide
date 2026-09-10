// /api/chat 管线：限流 → 输入校验 → embed → 检索 → 阈值 → Harness → 后置校验 → 契约输出
// 失败路径全部导向兜底（fallback.js），绝不 500。
import { runHarness, sourceLabel } from './harness.js';
import { postFilter } from './postfilter.js';
import { fallbackResponse } from './fallback.js';

export async function handleChat(request, env, ctx) {
  const t0 = Date.now();

  // ── 0. 限流 ─────────────────────────────────────
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const { checkRate } = await import('./ratelimit.js');
  const rl = await checkRate(env, ip);
  if (!rl.ok) {
    return json(fallbackResponse('en', rl.reason), rl.reason === 'rate_limited' ? 429 : 200);
  }

  // ── 1. 输入校验 ─────────────────────────────────
  let body;
  try {
    body = await request.json();
  } catch {
    return json(fallbackResponse('en', 'bad_input'), 400);
  }
  const { message, lang, image } = body || {};
  const L = lang === 'zh' ? 'zh' : 'en';
  if (typeof message !== 'string' || !message.trim() || message.length > 500) {
    return json(fallbackResponse(L, 'bad_input'), 400);
  }
  // 阶段一无视觉：带图直接兜底（工程师人肉看图，反而最可信）
  if (image) {
    return json(fallbackResponse(L, 'image', {
      note: 'Our engineer will review your photo. Please leave contact.',
    }));
  }

  // ── 2. 上线 gate（黄金集未达标期间强制全兜底）──
  if (String(env.GATE_ENABLED) === 'false') {
    return json(fallbackResponse(L, 'gate_off'));
  }

  // ── 3. 查询 embedding ──────────────────────────
  const { embed } = await import('./llm.js');
  let qvec;
  try {
    qvec = await embed(env, message.trim());
  } catch (e) {
    return json(fallbackResponse(L, 'embed_error'));
  }

  // ── 4. 检索 + 阈值 ─────────────────────────────
  let hits;
  try {
    hits = await env.KB.query(qvec, {
      topK: Number(env.TOP_K) || 5,
      returnMetadata: 'all',
    });
  } catch {
    return json(fallbackResponse(L, 'kb_error'));
  }
  const matches = hits?.matches || [];
  const top = matches[0];
  if (!top || top.score < Number(env.KB_THRESHOLD)) {
    return json(fallbackResponse(L, 'low_score', { score: top?.score ?? null }));
  }

  // ── 5. Harness 生成 ────────────────────────────
  let reply;
  try {
    reply = await runHarness(env, matches, message.trim(), L);
  } catch {
    return json(fallbackResponse(L, 'gen_error'));
  }

  // ── 6. 后置校验（高置信跳过）────────────────────
  let verdict;
  if (top.score > 0.75 && reply.length < 600) {
    verdict = { verdict: 'PASS', skipped: true };
  } else {
    verdict = await postFilter(env, reply, matches);
  }
  if (verdict.verdict !== 'PASS') {
    return json(fallbackResponse(L, 'filter_blocked'));
  }

  // ── 7. 返回（前端 chat.js 契约）─────────────────
  return json({
    reply,
    source: sourceLabel(top.metadata),
    fallback: false,
  });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': corsOrigin(),
    },
  });
}

function corsOrigin() {
  // MVP：GitHub Pages 预览域 + 本地联调；正式域接入后加白名单（tech-plan-v2 第0批）
  return 'https://xdh725.github.io';
}

export function corsPreflight() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': corsOrigin(),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
