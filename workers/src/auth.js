// 单管理员鉴权：密码(env secret) → 签名 Cookie → session 记 KV。
// 单用户系统，不搞用户表。
const COOKIE = 'kcyd_admin';
const TTL = 8 * 3600 * 1000; // 8 小时

export async function login(request, env) {
  const { password } = await request.json();
  if (typeof password !== 'string' || password !== env.ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ ok: false }), { status: 401 });
  }
  const token = crypto.randomUUID() + '.' + crypto.randomUUID();
  await env.COUNTERS.put('session:' + token, String(Date.now()), { expirationTtl: TTL / 1000 });
  const res = new Response(JSON.stringify({ ok: true }));
  res.headers.append(
    'Set-Cookie',
    COOKIE + '=' + token + '; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=' + TTL / 1000
  );
  return res;
}

export async function logout(request, env) {
  const token = getCookie(request);
  if (token) await env.COUNTERS.delete('session:' + token);
  const res = new Response(JSON.stringify({ ok: true }));
  res.headers.append('Set-Cookie', COOKIE + '=; Max-Age=0');
  return res;
}

export async function requireAuth(request, env) {
  const token = getCookie(request);
  if (!token) return false;
  const ts = await env.COUNTERS.get('session:' + token);
  if (!ts || Date.now() - Number(ts) > TTL) {
    await env.COUNTERS.delete('session:' + token);
    return false;
  }
  return true;
}

function getCookie(request) {
  return (request.headers.get('Cookie') || '')
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(COOKIE + '='))
    ?.split('=')[1] || null;
}
