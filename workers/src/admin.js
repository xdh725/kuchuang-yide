// /api/admin/*：素材 CRUD（D1）、媒体上传（OSS直传签名）、重建索引（embedding→Vectorize）、黄金集、健康报告
import { embed } from './llm.js';
import { signUpload } from './oss.js';

const J = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });

export async function handleAdmin(request, env, url) {
  const sub = url.pathname.replace('/api/admin/', '');

  // ── 登录/登出（auth.js 在 index.js 路由处理）──
  if (sub === 'entries' && request.method === 'GET') {
    const rows = await env.DB.prepare('SELECT * FROM entries ORDER BY updated_at DESC').all();
    return J({ entries: rows.results });
  }

  if (sub === 'entries' && request.method === 'POST') {
    const e = await request.json();
    if (!e.id?.match(/^KB-[A-Z]{2}-\d{3}$/) || !e.title || !e.body_en || !e.body_zh) {
      return J({ ok: false, error: 'id 须为 KB-XX-000 格式；title/body_en/body_zh 必填' }, 400);
    }
    await env.DB.prepare(
      `INSERT INTO entries (id,title,tags,type,media,body_en,body_zh,verified,verified_by,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         title=excluded.title, tags=excluded.tags, type=excluded.type, media=excluded.media,
         body_en=excluded.body_en, body_zh=excluded.body_zh,
         verified=excluded.verified, verified_by=excluded.verified_by,
         updated_at=datetime('now')`
    ).bind(
      e.id, e.title, e.tags || '', e.type || 'text', e.media || null,
      e.body_en, e.body_zh, e.verified ? 1 : 0, e.verified_by || null
    ).run();
    return J({ ok: true });
  }

  if (sub.startsWith('entries/') && request.method === 'DELETE') {
    const id = decodeURIComponent(sub.slice(8));
    await env.DB.prepare('DELETE FROM entries WHERE id=?').bind(id).run();
    return J({ ok: true });
  }

  // ── 媒体上传：签发 OSS PostObject 直传凭证（浏览器直传阿里云，文件不过 Workers）──
  if (sub === 'upload-sign' && request.method === 'GET') {
    const ct = url.searchParams.get('content_type') || '';
    const sig = await signUpload(env, ct);
    return J({ ok: true, ...sig });
  }

  // ── 重建索引：D1 verified 素材 → 智谱 embedding → Vectorize upsert ──
  if (sub === 'rebuild' && request.method === 'POST') {
    const rows = await env.DB.prepare('SELECT * FROM entries WHERE verified=1').all();
    const entries = rows.results;
    if (!entries.length) return J({ ok: false, error: '没有 verified 素材' }, 400);

    const vectors = [];
    const BATCH = 16;
    for (let i = 0; i < entries.length; i += BATCH) {
      const batch = entries.slice(i, i + BATCH);
      const texts = batch.map((e) => e.title + '\n' + e.body_en + '\n' + e.body_zh);
      // 智谱 embeddings 接口按单条调（batch 数组在 v4 也支持，这里逐条稳妥）
      for (let j = 0; j < batch.length; j++) {
        const vec = await embed(env, texts[j]);
        vectors.push({
          id: batch[j].id,
          values: vec,
          metadata: {
            text: (batch[j].body_en + ' ' + batch[j].body_zh).slice(0, 1200),
            title: batch[j].title,
            tags: batch[j].tags,
            source_label: batch[j].id + ' · ' + batch[j].title,
            type: batch[j].type,
          },
        });
      }
    }
    // Vectorize upsert（Workers 绑定原生支持）
    for (let i = 0; i < vectors.length; i += 100) {
      await env.KB.upsert(vectors.slice(i, i + 100));
    }
    await env.DB.prepare('INSERT INTO rebuild_log (entry_count, ok, detail) VALUES (?,?,?)')
      .bind(vectors.length, 1, null).run();
    return J({ ok: true, indexed: vectors.length });
  }

  // ── 黄金集 CRUD + 命中测试 ──
  if (sub === 'golden' && request.method === 'GET') {
    const rows = await env.DB.prepare('SELECT * FROM golden ORDER BY id').all();
    return J({ golden: rows.results });
  }
  if (sub === 'golden' && request.method === 'POST') {
    const g = await request.json();
    if (!g.q || !g.expected_kb_id) return J({ ok: false, error: 'q/expected_kb_id 必填' }, 400);
    await env.DB.prepare('INSERT INTO golden (q, expected_kb_id, lang) VALUES (?,?,?)')
      .bind(g.q, g.expected_kb_id, g.lang === 'zh' ? 'zh' : 'en').run();
    return J({ ok: true });
  }
  if (sub === 'golden/run' && request.method === 'POST') {
    const rows = await env.DB.prepare('SELECT * FROM golden ORDER BY id').all();
    const th = Number(env.KB_THRESHOLD);
    let hit = 0;
    const report = [];
    for (const g of rows.results) {
      const qv = await embed(env, g.q);
      const r = await env.KB.query(qv, { topK: 5, returnMetadata: 'none' });
      const top5 = r.matches || [];
      const ok = top5.some((m) => m.id === g.expected_kb_id && m.score >= th) && top5[0].score >= th;
      if (ok) hit++;
      report.push({ q: g.q, expected: g.expected_kb_id, top1: top5[0]?.id, top1_score: top5[0]?.score, hit: ok });
    }
    const rate = rows.results.length ? Math.round((hit / rows.results.length) * 100) : 0;
    return J({ hit_rate: rate, hit, total: rows.results.length, threshold: th, gate_pass: rate >= 80, report });
  }

  // ── 概览（后台首页数据）──
  if (sub === 'stats' && request.method === 'GET') {
    const s = await env.DB.prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN verified=1 THEN 1 ELSE 0 END) AS verified,
         (SELECT COUNT(*) FROM golden) AS golden
       FROM entries`
    ).first();
    const lastRebuild = await env.DB.prepare(
      'SELECT * FROM rebuild_log ORDER BY ts DESC LIMIT 1'
    ).first();
    return J({ stats: s, last_rebuild: lastRebuild });
  }

  return new Response('Not Found', { status: 404 });
}
