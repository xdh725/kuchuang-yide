var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// wrangler-modules-watch:wrangler:modules-watch
var init_wrangler_modules_watch = __esm({
  "wrangler-modules-watch:wrangler:modules-watch"() {
    init_modules_watch_stub();
  }
});

// node_modules/wrangler/templates/modules-watch-stub.js
var init_modules_watch_stub = __esm({
  "node_modules/wrangler/templates/modules-watch-stub.js"() {
    init_wrangler_modules_watch();
  }
});

// src/llm.js
var llm_exports = {};
__export(llm_exports, {
  chat: () => chat,
  embed: () => embed
});
async function zhipuFetch(env, path, body, timeout = TIMEOUT_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(env.ZHIPU_BASE + path, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + env.ZHIPU_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      signal: ctrl.signal
    });
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      throw new Error("zhipu " + path + " HTTP " + r.status + " " + text.slice(0, 200));
    }
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}
async function chat(env, model, messages, opts = {}) {
  const body = {
    model,
    messages,
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.max_tokens ?? 800
  };
  if (opts.noThinking) body.thinking = { type: "disabled" };
  const d = await zhipuFetch(env, "/chat/completions", body);
  const content = d.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("zhipu chat empty content");
  }
  return content.trim();
}
async function embed(env, text) {
  const d = await zhipuFetch(env, "/embeddings", {
    model: env.EMBED_MODEL,
    input: text,
    dimensions: 1536
    // Vectorize 上限 1536；智谱 embedding-3 MRL 截断，质量损失极小
  });
  const vec = d.data?.[0]?.embedding;
  if (!Array.isArray(vec) || vec.length === 0) {
    throw new Error("zhipu embedding empty vector");
  }
  return vec;
}
var TIMEOUT_MS;
var init_llm = __esm({
  "src/llm.js"() {
    init_modules_watch_stub();
    TIMEOUT_MS = 3e4;
    __name(zhipuFetch, "zhipuFetch");
    __name(chat, "chat");
    __name(embed, "embed");
  }
});

// src/ratelimit.js
var ratelimit_exports = {};
__export(ratelimit_exports, {
  checkRate: () => checkRate
});
async function checkRate(env, ip) {
  try {
    const { success } = await env.CHAT_RL.limit({ key: ip });
    if (!success) return { ok: false, reason: "rate_limited" };
  } catch {
  }
  try {
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const key = "chat:" + today;
    const n = parseInt(await env.COUNTERS.get(key) || "0", 10) + 1;
    await env.COUNTERS.put(key, String(n), { expirationTtl: 172800 });
    if (n > Number(env.DAILY_CHAT_CAP)) return { ok: false, reason: "daily_cap" };
  } catch {
  }
  return { ok: true };
}
var init_ratelimit = __esm({
  "src/ratelimit.js"() {
    init_modules_watch_stub();
    __name(checkRate, "checkRate");
  }
});

// .wrangler/tmp/bundle-7A7boc/middleware-loader.entry.ts
init_modules_watch_stub();

// .wrangler/tmp/bundle-7A7boc/middleware-insertion-facade.js
init_modules_watch_stub();

// src/index.js
init_modules_watch_stub();

// src/chat.js
init_modules_watch_stub();

// src/harness.js
init_modules_watch_stub();
var SYSTEM_EN = `You are the Product Guide Assistant for KUCHUANG YIDE, a manufacturer of high-performance brushless DC (BLDC) motors for overseas B2B buyers.
You operate in STRICT CONSTRAINED MODE (Harness).
ABSOLUTE RULES:
1. You may ONLY state facts that come from the provided knowledge base snippets below. If a fact is not in the snippets, it does not exist.
2. ZERO NEW FACTS. You may rephrase and connect retrieved snippets, but NEVER introduce any parameter, material grade, test result, model number, or performance figure not literally present in the snippets.
3. NO ESTIMATING. Forbidden: "approximately", "generally", "usually", "typically", "around". If the exact value is not in the snippets, say you do not have it.
4. After answering, offer ONE relevant next step drawn from the snippets.
5. Answer in English, concise and warm, B2B tone. Output only the answer text.`;
var SYSTEM_ZH = `\u4F60\u662F\u9177\u521B\u6613\u5FB7\uFF08KUCHUANG YIDE\uFF09\u7684\u4EA7\u54C1\u5BFC\u8D2D\u52A9\u624B\u2014\u2014\u9AD8\u6027\u80FD\u65E0\u5237\u7535\u673A\uFF08BLDC\uFF09\u5236\u9020\u5546\uFF0C\u670D\u52A1\u6D77\u5916 B2B \u91C7\u8D2D\u5546\u3002
\u4F60\u8FD0\u884C\u5728\u4E25\u683C\u7EA6\u675F\u6A21\u5F0F\uFF08Harness\uFF09\u4E0B\u3002
\u94C1\u5F8B\uFF1A
1. \u4F60\u53EA\u80FD\u9648\u8FF0\u4E0B\u65B9\u77E5\u8BC6\u5E93\u7247\u6BB5\u4E2D\u7684\u4E8B\u5B9E\u3002\u7247\u6BB5\u91CC\u6CA1\u6709\u7684\u4FE1\u606F\u7B49\u4E8E\u4E0D\u5B58\u5728\u3002
2. \u96F6\u65B0\u589E\u4E8B\u5B9E\u3002\u53EF\u4EE5\u6539\u5199\u3001\u4E32\u8054\u7247\u6BB5\uFF0C\u4F46\u7EDD\u4E0D\u5F15\u5165\u7247\u6BB5\u4E2D\u672A\u51FA\u73B0\u7684\u4EFB\u4F55\u53C2\u6570\u3001\u6750\u6599\u724C\u53F7\u3001\u6D4B\u8BD5\u7ED3\u679C\u3001\u578B\u53F7\u6216\u6027\u80FD\u6570\u5B57\u3002
3. \u7981\u6B62\u4F30\u7B97\u3002\u7981\u6B62\u4F7F\u7528"\u5927\u7EA6""\u4E00\u822C""\u901A\u5E38"\u3002\u7247\u6BB5\u4E2D\u6CA1\u6709\u7684\u7CBE\u786E\u503C\u5C31\u76F4\u8BF4\u6CA1\u6709\u3002
4. \u56DE\u7B54\u540E\uFF0C\u57FA\u4E8E\u7247\u6BB5\u5185\u5BB9\u7ED9\u51FA\u4E00\u4E2A\u81EA\u7136\u7684\u4E0B\u4E00\u6B65\u5F15\u5BFC\u3002
5. \u7528\u4E2D\u6587\u56DE\u7B54\uFF0C\u7B80\u6D01\u4E13\u4E1A\uFF0CB2B \u8BED\u6C14\u3002\u53EA\u8F93\u51FA\u56DE\u7B54\u6B63\u6587\u3002`;
async function runHarness(env, snippets, question, lang) {
  const { chat: chat2 } = await Promise.resolve().then(() => (init_llm(), llm_exports));
  const system = lang === "zh" ? SYSTEM_ZH : SYSTEM_EN;
  const ctx = snippets.map((m) => "[" + m.id + "] " + (m.metadata?.text || "")).join("\n---\n");
  return chat2(env, env.CHAT_MODEL, [
    { role: "system", content: system },
    {
      role: "user",
      content: "Knowledge base snippets:\n" + ctx + "\n\nCustomer question: " + question
    }
  ], { temperature: 0.2, max_tokens: 600, noThinking: true });
}
__name(runHarness, "runHarness");
function sourceLabel(meta) {
  if (!meta) return null;
  return meta.source_label || meta.title || null;
}
__name(sourceLabel, "sourceLabel");

// src/postfilter.js
init_modules_watch_stub();
var BANNED_PATTERNS = [
  /efficiency of\s*\d{1,3}(\.\d+)?\s*%/i,
  // 未入库精确效率
  /(definitely|perfectly|absolutely)\s+(work|match|fit)/i,
  // 打包票
  /it is (commonly|generally|widely) known/i,
  // 通用科普
  /\b(approximately|generally|usually|typically)\b/i
  // 估算措辞（Harness 禁）
];
function regexPrecheck(reply) {
  for (const re of BANNED_PATTERNS) {
    if (re.test(reply)) return { verdict: "FAIL", pattern: re.source };
  }
  return { verdict: "PASS" };
}
__name(regexPrecheck, "regexPrecheck");
var FILTER_SYSTEM = `You verify a draft answer from a B2B motor assistant against its knowledge base snippets.
Check ONLY factual containment:
1. Every model number in the draft must appear in the snippets.
2. Every specific performance figure must appear in the snippets (hedged trend statements are OK).
3. Material grades must appear in the snippets.
4. No absolute guarantees ("definitely work", "perfect match").
Reply ONLY JSON: {"verdict":"PASS"} or {"verdict":"FAIL","violations":[{"excerpt":"...","reason":"..."}]}
When unsure, FAIL.`;
async function postFilter(env, reply, snippets) {
  const pre = regexPrecheck(reply);
  if (pre.verdict === "FAIL") return pre;
  try {
    const { chat: chat2 } = await Promise.resolve().then(() => (init_llm(), llm_exports));
    const ctx = snippets.map((m2) => "[" + m2.id + "] " + (m2.metadata?.text || "")).join("\n---\n");
    const out = await chat2(env, env.FILTER_MODEL, [
      { role: "system", content: FILTER_SYSTEM },
      {
        role: "user",
        content: "SNIPPETS:\n" + ctx + "\n\nDRAFT ANSWER:\n" + reply + "\n\nJSON verdict:"
      }
    ], { temperature: 0, max_tokens: 400, noThinking: true });
    const m = out.match(/\{[\s\S]*\}/);
    if (!m) return { verdict: "FAIL", reason: "unparseable_filter_output" };
    const v = JSON.parse(m[0]);
    return v.verdict === "PASS" ? { verdict: "PASS" } : { verdict: "FAIL", violations: v.violations };
  } catch (e) {
    return { verdict: "FAIL", reason: "filter_error: " + e.message };
  }
}
__name(postFilter, "postFilter");

// src/fallback.js
init_modules_watch_stub();
var T = {
  en: "This specific information is not available in our product database. Please leave your WhatsApp or email; our engineer will send you verified data within one working day.",
  zh: "\u8BE5\u4FE1\u606F\u6682\u672A\u6536\u5F55\u4E8E\u4EA7\u54C1\u6570\u636E\u5E93\u3002\u8BF7\u7559\u4E0B\u60A8\u7684 WhatsApp \u6216\u90AE\u7BB1\uFF0C\u5DE5\u7A0B\u5E08\u5C06\u5728\u4E00\u4E2A\u5DE5\u4F5C\u65E5\u5185\u4E3A\u60A8\u63D0\u4F9B\u7ECF\u6838\u5B9E\u7684\u8D44\u6599\u3002"
};
function fallbackResponse(lang, reason, extra = {}) {
  return {
    reply: T[lang] || T.en,
    source: null,
    fallback: true,
    reason,
    // 供埋点：low_score | no_hits | image | rate_limited | daily_cap | gate_off | embed_error | kb_error | gen_error | gen_timeout | filter_blocked | bad_input
    ...extra
  };
}
__name(fallbackResponse, "fallbackResponse");

// src/chat.js
async function handleChat(request, env, ctx) {
  const t0 = Date.now();
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const { checkRate: checkRate2 } = await Promise.resolve().then(() => (init_ratelimit(), ratelimit_exports));
  const rl = await checkRate2(env, ip);
  if (!rl.ok) {
    return json(fallbackResponse("en", rl.reason), rl.reason === "rate_limited" ? 429 : 200);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return json(fallbackResponse("en", "bad_input"), 400);
  }
  const { message, lang, image } = body || {};
  const L = lang === "zh" ? "zh" : "en";
  if (typeof message !== "string" || !message.trim() || message.length > 500) {
    return json(fallbackResponse(L, "bad_input"), 400);
  }
  if (image) {
    return json(fallbackResponse(L, "image", {
      note: "Our engineer will review your photo. Please leave contact."
    }));
  }
  if (String(env.GATE_ENABLED) === "false") {
    return json(fallbackResponse(L, "gate_off"));
  }
  const { embed: embed2 } = await Promise.resolve().then(() => (init_llm(), llm_exports));
  let qvec;
  try {
    qvec = await embed2(env, message.trim());
  } catch (e) {
    return json(fallbackResponse(L, "embed_error"));
  }
  let hits;
  try {
    hits = await env.KB.query(qvec, {
      topK: Number(env.TOP_K) || 5,
      returnMetadata: "all"
    });
  } catch {
    return json(fallbackResponse(L, "kb_error"));
  }
  const matches = hits?.matches || [];
  const top = matches[0];
  if (!top || top.score < Number(env.KB_THRESHOLD)) {
    return json(fallbackResponse(L, "low_score", { score: top?.score ?? null }));
  }
  let reply;
  try {
    reply = await runHarness(env, matches, message.trim(), L);
  } catch {
    return json(fallbackResponse(L, "gen_error"));
  }
  let verdict;
  if (top.score > 0.75 && reply.length < 600) {
    verdict = { verdict: "PASS", skipped: true };
  } else {
    verdict = await postFilter(env, reply, matches);
  }
  if (verdict.verdict !== "PASS") {
    return json(fallbackResponse(L, "filter_blocked"));
  }
  return json({
    reply,
    source: sourceLabel(top.metadata),
    fallback: false
  });
}
__name(handleChat, "handleChat");
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": corsOrigin()
    }
  });
}
__name(json, "json");
function corsOrigin() {
  return "https://xdh725.github.io";
}
__name(corsOrigin, "corsOrigin");
function corsPreflight() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": corsOrigin(),
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
__name(corsPreflight, "corsPreflight");

// src/admin.js
init_modules_watch_stub();
init_llm();

// src/oss.js
init_modules_watch_stub();
function b64(str) {
  return btoa(String.fromCharCode(...new Uint8Array(new TextEncoder().encode(str))));
}
__name(b64, "b64");
function b64bytes(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}
__name(b64bytes, "b64bytes");
async function hmacSha1(key, msg) {
  const c = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", c, new TextEncoder().encode(msg)));
}
__name(hmacSha1, "hmacSha1");
async function signUpload(env, contentType, sizeLimit = 100 * 1024 * 1024) {
  const bucket = env.OSS_BUCKET;
  const region = env.OSS_REGION;
  const dir = "kb/";
  const expire = new Date(Date.now() + 10 * 60 * 1e3).toISOString();
  const policy = {
    expiration: expire,
    conditions: [
      { bucket },
      ["starts-with", "$key", dir],
      ["content-length-range", 1, sizeLimit],
      ...contentType ? [{ "Content-Type": contentType }] : []
    ]
  };
  const policyB64 = b64(JSON.stringify(policy));
  const sig = b64bytes(await hmacSha1(
    new TextEncoder().encode(env.OSS_ACCESS_KEY_SECRET),
    policyB64
  ));
  return {
    host: `https://${bucket}.${region}.aliyuncs.com`,
    keyPrefix: dir,
    policy: policyB64,
    signature: sig,
    accessKeyId: env.OSS_ACCESS_KEY_ID,
    expireAt: expire
    // 上传后的公开访问 URL 前端拼：host/key（桶公共读或绑定域名）
  };
}
__name(signUpload, "signUpload");

// src/admin.js
var J = /* @__PURE__ */ __name((obj, status = 200, extra = {}) => new Response(JSON.stringify(obj), {
  status,
  headers: { "Content-Type": "application/json", ...extra }
}), "J");
async function handleAdmin(request, env, url) {
  const sub = url.pathname.replace("/api/admin/", "");
  if (sub === "entries" && request.method === "GET") {
    const rows = await env.DB.prepare("SELECT * FROM entries ORDER BY updated_at DESC").all();
    return J({ entries: rows.results });
  }
  if (sub === "entries" && request.method === "POST") {
    const e = await request.json();
    if (!e.id?.match(/^KB-[A-Z]{2}-\d{3}$/) || !e.title || !e.body_en || !e.body_zh) {
      return J({ ok: false, error: "id \u987B\u4E3A KB-XX-000 \u683C\u5F0F\uFF1Btitle/body_en/body_zh \u5FC5\u586B" }, 400);
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
      e.id,
      e.title,
      e.tags || "",
      e.type || "text",
      e.media || null,
      e.body_en,
      e.body_zh,
      e.verified ? 1 : 0,
      e.verified_by || null
    ).run();
    return J({ ok: true });
  }
  if (sub.startsWith("entries/") && request.method === "DELETE") {
    const id = decodeURIComponent(sub.slice(8));
    await env.DB.prepare("DELETE FROM entries WHERE id=?").bind(id).run();
    return J({ ok: true });
  }
  if (sub === "upload-sign" && request.method === "GET") {
    const ct = url.searchParams.get("content_type") || "";
    const sig = await signUpload(env, ct);
    return J({ ok: true, ...sig });
  }
  if (sub === "rebuild" && request.method === "POST") {
    const rows = await env.DB.prepare("SELECT * FROM entries WHERE verified=1").all();
    const entries = rows.results;
    if (!entries.length) return J({ ok: false, error: "\u6CA1\u6709 verified \u7D20\u6750" }, 400);
    const vectors = [];
    const BATCH = 16;
    for (let i = 0; i < entries.length; i += BATCH) {
      const batch = entries.slice(i, i + BATCH);
      const texts = batch.map((e) => e.title + "\n" + e.body_en + "\n" + e.body_zh);
      for (let j = 0; j < batch.length; j++) {
        const vec = await embed(env, texts[j]);
        vectors.push({
          id: batch[j].id,
          values: vec,
          metadata: {
            text: (batch[j].body_en + " " + batch[j].body_zh).slice(0, 1200),
            title: batch[j].title,
            tags: batch[j].tags,
            source_label: batch[j].id + " \xB7 " + batch[j].title,
            type: batch[j].type
          }
        });
      }
    }
    for (let i = 0; i < vectors.length; i += 100) {
      await env.KB.upsert(vectors.slice(i, i + 100));
    }
    await env.DB.prepare("INSERT INTO rebuild_log (entry_count, ok, detail) VALUES (?,?,?)").bind(vectors.length, 1, null).run();
    return J({ ok: true, indexed: vectors.length });
  }
  if (sub === "golden" && request.method === "GET") {
    const rows = await env.DB.prepare("SELECT * FROM golden ORDER BY id").all();
    return J({ golden: rows.results });
  }
  if (sub === "golden" && request.method === "POST") {
    const g = await request.json();
    if (!g.q || !g.expected_kb_id) return J({ ok: false, error: "q/expected_kb_id \u5FC5\u586B" }, 400);
    await env.DB.prepare("INSERT INTO golden (q, expected_kb_id, lang) VALUES (?,?,?)").bind(g.q, g.expected_kb_id, g.lang === "zh" ? "zh" : "en").run();
    return J({ ok: true });
  }
  if (sub === "golden/run" && request.method === "POST") {
    const rows = await env.DB.prepare("SELECT * FROM golden ORDER BY id").all();
    const th = Number(env.KB_THRESHOLD);
    let hit = 0;
    const report = [];
    for (const g of rows.results) {
      const qv = await embed(env, g.q);
      const r = await env.KB.query(qv, { topK: 5, returnMetadata: "none" });
      const top5 = r.matches || [];
      const ok = top5.some((m) => m.id === g.expected_kb_id && m.score >= th) && top5[0].score >= th;
      if (ok) hit++;
      report.push({ q: g.q, expected: g.expected_kb_id, top1: top5[0]?.id, top1_score: top5[0]?.score, hit: ok });
    }
    const rate = rows.results.length ? Math.round(hit / rows.results.length * 100) : 0;
    return J({ hit_rate: rate, hit, total: rows.results.length, threshold: th, gate_pass: rate >= 80, report });
  }
  if (sub === "stats" && request.method === "GET") {
    const s = await env.DB.prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN verified=1 THEN 1 ELSE 0 END) AS verified,
         (SELECT COUNT(*) FROM golden) AS golden
       FROM entries`
    ).first();
    const lastRebuild = await env.DB.prepare(
      "SELECT * FROM rebuild_log ORDER BY ts DESC LIMIT 1"
    ).first();
    return J({ stats: s, last_rebuild: lastRebuild });
  }
  return new Response("Not Found", { status: 404 });
}
__name(handleAdmin, "handleAdmin");

// src/auth.js
init_modules_watch_stub();
var COOKIE = "kcyd_admin";
var TTL = 8 * 3600 * 1e3;
async function login(request, env) {
  const { password } = await request.json();
  if (typeof password !== "string" || password !== env.ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ ok: false }), { status: 401 });
  }
  const token = crypto.randomUUID() + "." + crypto.randomUUID();
  await env.COUNTERS.put("session:" + token, String(Date.now()), { expirationTtl: TTL / 1e3 });
  const res = new Response(JSON.stringify({ ok: true }));
  res.headers.append(
    "Set-Cookie",
    COOKIE + "=" + token + "; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=" + TTL / 1e3
  );
  return res;
}
__name(login, "login");
async function logout(request, env) {
  const token = getCookie(request);
  if (token) await env.COUNTERS.delete("session:" + token);
  const res = new Response(JSON.stringify({ ok: true }));
  res.headers.append("Set-Cookie", COOKIE + "=; Max-Age=0");
  return res;
}
__name(logout, "logout");
async function requireAuth(request, env) {
  const token = getCookie(request);
  if (!token) return false;
  const ts = await env.COUNTERS.get("session:" + token);
  if (!ts || Date.now() - Number(ts) > TTL) {
    await env.COUNTERS.delete("session:" + token);
    return false;
  }
  return true;
}
__name(requireAuth, "requireAuth");
function getCookie(request) {
  return (request.headers.get("Cookie") || "").split(";").map((s) => s.trim()).find((s) => s.startsWith(COOKIE + "="))?.split("=")[1] || null;
}
__name(getCookie, "getCookie");

// src/index.js
var CORS = {
  "Access-Control-Allow-Origin": "https://xdh725.github.io"
};
var src_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (request.method === "OPTIONS") return corsPreflight();
    if (path === "/api/health") {
      return new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
        headers: { "Content-Type": "application/json", ...CORS }
      });
    }
    if (path === "/api/chat" && request.method === "POST") {
      return handleChat(request, env, ctx);
    }
    if (path === "/api/inquiry" && request.method === "POST") {
      return new Response(
        JSON.stringify({ ok: false, error: "not_implemented_yet" }),
        { status: 501, headers: { "Content-Type": "application/json", ...CORS } }
      );
    }
    if (path === "/api/admin/login" && request.method === "POST") return login(request, env);
    if (path === "/api/admin/logout" && request.method === "POST") return logout(request, env);
    if (path.startsWith("/api/admin/")) {
      if (!await requireAuth(request, env)) {
        return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      return handleAdmin(request, env, url);
    }
    return new Response("Not Found", { status: 404 });
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
init_modules_watch_stub();
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
init_modules_watch_stub();
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-7A7boc/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
init_modules_watch_stub();
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-7A7boc/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
