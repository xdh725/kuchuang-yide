// 路由入口：/api/chat /api/inquiry /api/health
import { handleChat, corsPreflight } from './chat.js';

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

    return new Response('Not Found', { status: 404 });
  },
};
