// kuchuang-yide standalone 后端：原生 http 零依赖（除 better-sqlite3），内存友好。
// 路由：/api/health /api/chat /api/inquiry /api/admin/*
import http from 'node:http';
import crypto from 'node:crypto';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { db } from './db.js';
import { loadVectors, query, upsertVectors } from './vecstore.js';
import { runHarness, sourceLabel } from './harness.js';
import { postFilter } from './postfilter.js';
import { fallbackResponse } from './fallback.js';
import { chat, embed, models } from './llm.js';
import { signUpload } from './oss.js';
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

  let verdict;
  if (top.score > 0.75 && reply.length < 600) verdict = { verdict: 'PASS' };
  else verdict = await postFilter(reply, matches);
  if (verdict.verdict !== 'PASS') return json(res, fallbackResponse(L, 'filter_blocked'));

  return json(res, { reply, source: sourceLabel(top.metadata), fallback: false });
}

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
    return json(res, { ok: true });
  }
  if (sub.startsWith('entries/') && req.method === 'DELETE') {
    db.prepare('DELETE FROM entries WHERE id=?').run(decodeURIComponent(sub.slice(8)));
    return json(res, { ok: true });
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
        metadata: { text: (e.body_en + ' ' + e.body_zh).slice(0, 1200), title: e.title,
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
