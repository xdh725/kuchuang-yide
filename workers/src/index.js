// 路由入口：/api/chat /api/inquiry /api/health /api/admin/* /admin（后台页）
import { handleChat, corsPreflight } from './chat.js';
import { handleAdmin } from './admin.js';
import { login, logout, requireAuth } from './auth.js';

const CORS = {
  'Access-Control-Allow-Origin': 'https://xdh725.github.io',
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') return corsPreflight();

    if (path === '/api/health') {
      return new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    if (path === '/api/chat' && request.method === 'POST') {
      return handleChat(request, env, ctx);
    }

    if (path === '/api/inquiry' && request.method === 'POST') {
      // 第1批实现（tech-plan-v2）：Turnstile → KV → 飞书/邮件。当前占位。
      return new Response(
        JSON.stringify({ ok: false, error: 'not_implemented_yet' }),
        { status: 501, headers: { 'Content-Type': 'application/json', ...CORS } }
      );
    }

    // ── 后台 ──
    // 静态资产（/admin 页面及其 css）由 env.ASSETS 提供
    if (path === '/admin' || path === '/admin/' || path.startsWith('/assets/') || path === '/favicon.svg') {
      return env.ASSETS.fetch(request);
    }
    if (path === '/api/admin/login' && request.method === 'POST') return login(request, env);
    if (path === '/api/admin/logout' && request.method === 'POST') return logout(request, env);

    if (path.startsWith('/api/admin/')) {
      if (!(await requireAuth(request, env))) {
        return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return handleAdmin(request, env, url);
    }

    return new Response('Not Found', { status: 404 });
  },
};
