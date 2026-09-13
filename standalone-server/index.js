// kuchuang-yide standalone 后端：原生 http 零依赖（除 better-sqlite3），内存友好。
// 路由：/api/health /api/chat /api/inquiry /api/admin/*
import http from 'node:http';
import crypto from 'node:crypto';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { db } from './db.js';
import { loadVectors, query, upsertVectors, removeVectors } from './vecstore.js';
import { runHarness, sourceLabel } from './harness.js';
import { postFilter } from './postfilter.js';
import { fallbackResponse } from './fallback.js';
import { chat, embed, models } from './llm.js';
import { signUpload } from './oss.js';
import { extractEntries } from './assist.js';
import {
  ADMIN_PASSWORD, KB_THRESHOLD, TOP_K, GATE_ENABLED, DAILY_CHAT_CAP, PORT,
} from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
import { existsSync as _ex } from 'node:fs';
// 部署布局 /www/wwwroot/kuchuang-yide/{public/, server/}；本地测试布局 项目根/workers/public
const _cand = [join(__dirname, '..', 'public'), join(__dirname, '..', 'workers', 'public')];
const PUBLIC_DIR = _cand.find((p) => _ex(join(p, 'index.html'))) || _cand[0];
loadVectors();

// ── 限流（进程内存版：IP 滑动窗口 + 日计数）──
const rlMap = new Map(); // ip → [ts]
let dayCount = { day: '', n: 0 };
function checkRate(ip) {
  const now = Date.now();
  const arr = (rlMap.get(ip) || []).filter((t) => now - t < 3600_000);
  if (arr.length >= 20) { rlMap.set(ip, arr); return { ok: false, reason: 'rate_limited' }; }
  arr.push(now); rlMap.set(ip, arr);
  const day = new Date().toISOString().slice(0, 10);
  if (dayCount.day !== day) dayCount = { day, n: 0 };
  dayCount.n++;
  if (dayCount.n > Number(DAILY_CHAT_CAP)) return { ok: false, reason: 'daily_cap' };
  return { ok: true };
}

// ── 会话鉴权（sessions 表）──
const COOKIE = 'kcyd_admin';
function getCookie(req) {
  return (req.headers.cookie || '').split(';').map((s) => s.trim())
    .find((s) => s.startsWith(COOKIE + '='))?.split('=')[1] || null;
}
function requireAuth(req) {
  const token = getCookie(req);
  if (!token) return false;
  const row = db.prepare('SELECT ts FROM sessions WHERE token=?').get(token);
  if (!row || Date.now() - row.ts > 8 * 3600_000) return false;
  return true;
}

// ── 工具 ──
function json(res, obj, status = 200, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(obj));
}
async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks);
}

// ── chat 管线（与 Workers 版同构）──
async function handleChat(req, res, body) {
  const rl = checkRate(req.socket.remoteAddress || 'unknown');
  if (!rl.ok) return json(res, fallbackResponse('en', rl.reason), rl.reason === 'rate_limited' ? 429 : 200);
  let { message, lang, image } = body || {};
  const L = lang === 'zh' ? 'zh' : 'en';
  if (typeof message !== 'string' || !message.trim() || message.length > 500)
    return json(res, fallbackResponse(L, 'bad_input'), 400);
  if (image) return json(res, fallbackResponse(L, 'image'));
  if (String(GATE_ENABLED) === 'false') return json(res, fallbackResponse(L, 'gate_off'));

  let qvec;
  try { qvec = await embed(message.trim()); }
  catch { return json(res, fallbackResponse(L, 'embed_error')); }

  const matches = query(qvec, Number(TOP_K) || 5);
  const top = matches[0];
  if (!top || top.score < Number(KB_THRESHOLD))
    return json(res, fallbackResponse(L, 'low_score'));

  let reply;
  try { reply = await runHarness(matches, message.trim(), L); }
  catch { return json(res, fallbackResponse(L, 'gen_error')); }

  // 后置校验：旁路监控模式（不拦截，只记录）——2026-09-13 A/B 实验后降级
  // 实验结论：校验器误杀率 50%（把"声明型号不存在"判成越界），Harness 实测零越界。
  // 观察期：违规样本记日志，积累真实越界率数据后再决定恢复拦截或彻底移除。
  let verdict = 'skipped';
  let violations = null;
  try {
    if (!(top.score > 0.75 && reply.length < 600)) {
      const v = await postFilter(reply, matches);
      verdict = v.verdict;
      if (v.verdict !== 'PASS') violations = v.violations || v.reason || null;
    }
  } catch (e) {
    verdict = 'filter_error';
  }
  if (verdict !== 'PASS' && verdict !== 'skipped') {
    console.log(JSON.stringify({
      ev: 'filter_bypass_watch', ts: new Date().toISOString(),
      q: message.trim().slice(0, 120), verdict, violations,
      reply_head: reply.slice(0, 150), top_id: top.id, top_score: top.score.toFixed(3),
    }));
  }

  return json(res, { reply, source: sourceLabel(top.metadata), fallback: false });
}

// ── 自动增量索引：素材保存/删除即生效，无需手动重建 ──
async function autoIndex(entry) {
  try {
    const vec = await embed(entry.title + '\n' + entry.body_en + '\n' + entry.body_zh);
    upsertVectors([{
      id: entry.id, values: vec,
      metadata: {
        text: (entry.title + '\n' + entry.body_en + ' ' + entry.body_zh).slice(0, 1200),
        title: entry.title, tags: entry.tags,
        source_label: entry.id + ' · ' + entry.title, type: entry.type,
      },
    }]);
    console.log('[auto-index] indexed', entry.id);
  } catch (e) {
    console.error('[auto-index] FAILED', entry.id, e.message); // 失败不影响保存；全量重建可修复
  }
}
function removeFromIndex(id) { removeVectors([id]); }

// ── admin ──
async function handleAdmin(req, res, url) {
  const sub = url.pathname.replace('/api/admin/', '');

  if (sub === 'login' && req.method === 'POST') {
    const body = JSON.parse((await readBody(req)).toString() || '{}');
    if (body.password !== ADMIN_PASSWORD) return json(res, { ok: false }, 401);
    const token = crypto.randomUUID() + '.' + crypto.randomUUID();
    db.prepare('INSERT INTO sessions (token, ts) VALUES (?,?)').run(token, Date.now());
    return json(res, { ok: true }, 200, {
      'Set-Cookie': `${COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=28800`,
    });
  }
  if (sub === 'logout' && req.method === 'POST') {
    const t = getCookie(req);
    if (t) db.prepare('DELETE FROM sessions WHERE token=?').run(t);
    return json(res, { ok: true }, 200, { 'Set-Cookie': `${COOKIE}=; Max-Age=0` });
  }
  if (!requireAuth(req)) return json(res, { ok: false, error: 'unauthorized' }, 401);

  if (sub === 'stats') {
    const s = db.prepare(`SELECT COUNT(*) total, SUM(verified) verified, (SELECT COUNT(*) FROM golden) golden FROM entries`).get();
    const last = db.prepare('SELECT * FROM rebuild_log ORDER BY ts DESC LIMIT 1').get();
    return json(res, { stats: s, last_rebuild: last });
  }
  if (sub === 'entries' && req.method === 'GET') {
    return json(res, { entries: db.prepare('SELECT * FROM entries ORDER BY updated_at DESC').all() });
  }
  if (sub === 'entries' && req.method === 'POST') {
    const e = JSON.parse((await readBody(req)).toString());
    if (!/^KB-[A-Z]{2}-\d{3}$/.test(e.id || '') || !e.title || !e.body_en || !e.body_zh)
      return json(res, { ok: false, error: 'id 须为 KB-XX-000 格式；title/body_en/body_zh 必填' }, 400);
    db.prepare(`INSERT INTO entries (id,title,tags,type,media,body_en,body_zh,verified,verified_by,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))
      ON CONFLICT(id) DO UPDATE SET title=excluded.title,tags=excluded.tags,type=excluded.type,media=excluded.media,
        body_en=excluded.body_en,body_zh=excluded.body_zh,verified=excluded.verified,verified_by=excluded.verified_by,
        updated_at=datetime('now')`)
      .run(e.id, e.title, e.tags || '', e.type || 'text', e.media || null,
           e.body_en, e.body_zh, e.verified ? 1 : 0, e.verified_by || null);
    if (e.verified) { autoIndex({ ...e, id: e.id }); }
    else { removeFromIndex(e.id); } // 未核实条目确保不进检索
    return json(res, { ok: true });
  }
  if (sub.startsWith('entries/') && req.method === 'DELETE') {
    const id = decodeURIComponent(sub.slice(8));
    db.prepare('DELETE FROM entries WHERE id=?').run(id);
    removeFromIndex(id);
    return json(res, { ok: true });
  }
  if (sub === 'assist' && req.method === 'POST') {
    const body = JSON.parse((await readBody(req)).toString() || '{}');
    if (!body.input || !String(body.input).trim())
      return json(res, { ok: false, error: 'input 为空' }, 400);
    try {
      const ids = db.prepare('SELECT id FROM entries').all().map((r) => r.id);
      const drafts = await extractEntries(body.input, ids);
      return json(res, { ok: true, drafts });
    } catch (e) {
      return json(res, { ok: false, error: '解析失败：' + e.message }, 500);
    }
  }
  if (sub === 'next-id') {
    // 自动分配下一个 KB-XX-000 ID（按前缀最大号+1）
    const rows = db.prepare("SELECT id FROM entries").all();
    const next = (pfx) => {
      const nums = rows.map((r) => r.id.match(new RegExp('^KB-' + pfx + '-\\d+$')) ? Number(r.id.slice(-3)) : 0);
      return 'KB-' + pfx + '-' + String(Math.max(0, ...nums) + 1).padStart(3, '0');
    };
    return json(res, { ok: true, model: next('MD'), raw: next('RM'), process: next('PR'), app: next('AP'), effect: next('EF') });
  }
  if (sub === 'upload-sign') {
    const sig = await signUpload(url.searchParams.get('content_type') || '');
    return json(res, { ok: true, ...sig });
  }
  if (sub === 'rebuild' && req.method === 'POST') {
    const entries = db.prepare('SELECT * FROM entries WHERE verified=1').all();
    if (!entries.length) return json(res, { ok: false, error: '没有 verified 素材' }, 400);
    const vectors = [];
    for (const e of entries) {
      const vec = await embed(e.title + '\n' + e.body_en + '\n' + e.body_zh);
      vectors.push({
        id: e.id, values: vec,
        metadata: { text: (e.title + '\n' + e.body_en + ' ' + e.body_zh).slice(0, 1200), title: e.title,
                    tags: e.tags, source_label: e.id + ' · ' + e.title, type: e.type },
      });
    }
    upsertVectors(vectors);
    db.prepare('INSERT INTO rebuild_log (entry_count, ok) VALUES (?,1)').run(vectors.length);
    return json(res, { ok: true, indexed: vectors.length });
  }
  if (sub === 'golden' && req.method === 'GET') {
    return json(res, { golden: db.prepare('SELECT * FROM golden ORDER BY id').all() });
  }
  if (sub === 'golden' && req.method === 'POST') {
    const g = JSON.parse((await readBody(req)).toString());
    if (!g.q || !g.expected_kb_id) return json(res, { ok: false, error: 'q/expected_kb_id 必填' }, 400);
    db.prepare('INSERT INTO golden (q, expected_kb_id, lang) VALUES (?,?,?)')
      .run(g.q, g.expected_kb_id, g.lang === 'zh' ? 'zh' : 'en');
    return json(res, { ok: true });
  }
  if (sub === 'golden/run' && req.method === 'POST') {
    const rows = db.prepare('SELECT * FROM golden ORDER BY id').all();
    const th = Number(KB_THRESHOLD);
    let hit = 0;
    const report = [];
    for (const g of rows) {
      const qv = await embed(g.q);
      const top5 = query(qv, 5);
      const ok = top5.some((m) => m.id === g.expected_kb_id && m.score >= th) && top5[0].score >= th;
      if (ok) hit++;
      report.push({ q: g.q, expected: g.expected_kb_id, top1: top5[0]?.id, top1_score: top5[0]?.score, hit: ok });
    }
    const rate = rows.length ? Math.round((hit / rows.length) * 100) : 0;
    return json(res, { hit_rate: rate, hit, total: rows.length, threshold: th, gate_pass: rate >= 80, report });
  }
  return json(res, { error: 'not found' }, 404);
}

// ── 静态文件（public/，防目录穿越）──
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png', '.mp4': 'video/mp4', '.json': 'application/json' };
function serveStatic(res, pathname) {
  let p = normalize(join(PUBLIC_DIR, pathname));
  if (!p.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end(); }
  if (pathname === '/' || pathname === '') p = join(PUBLIC_DIR, 'index.html');
  if (pathname === '/admin') p = join(PUBLIC_DIR, 'admin.html');
  if (existsSync(p) && statSync(p).isFile()) {
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    return res.end(readFileSync(p));
  }
  // clean URL：/product-explorer → product-explorer.html（与 Workers assets 行为一致）
  if (!extname(p)) {
    const hp = p + '.html';
    if (existsSync(hp) && statSync(hp).isFile()) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(readFileSync(hp));
    }
  }
  res.writeHead(404); res.end('Not Found');
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname === '/api/health') return json(res, { ok: true, ts: Date.now() });
    if (url.pathname === '/api/chat' && req.method === 'POST') {
      const body = JSON.parse((await readBody(req)).toString() || '{}');
      return await handleChat(req, res, body);
    }
    if (url.pathname === '/api/inquiry' && req.method === 'POST') {
      return json(res, { ok: false, error: 'not_implemented_yet' }, 501);
    }
    if (url.pathname.startsWith('/api/admin/')) return await handleAdmin(req, res, url);
    return serveStatic(res, url.pathname);
  } catch (e) {
    console.error('[err]', url.pathname, e.message);
    return json(res, { error: 'internal' }, 500);
  }
}).listen(Number(PORT), () => console.log(`kuchuang-yide standalone on :${PORT} (models: ${JSON.stringify(models())})`));
