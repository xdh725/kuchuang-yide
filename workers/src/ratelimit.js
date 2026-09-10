// 两层限流：RL binding（原子 IP 限流）+ KV 日全局上限。
// 无成本上限决策下（D12/D13），这是唯一硬闸。

export async function checkRate(env, ip) {
  // ① 原子 IP 限流（20 次/时，wrangler.toml 配置）
  try {
    const { success } = await env.CHAT_RL.limit({ key: ip });
    if (!success) return { ok: false, reason: 'rate_limited' };
  } catch {
    // RL binding 不可用（本地 dev 未模拟时）→ 放行，靠日上限兜底
  }
  // ② 日全局上限
  try {
    const today = new Date().toISOString().slice(0, 10);
    const key = 'chat:' + today;
    const n = parseInt((await env.COUNTERS.get(key)) || '0', 10) + 1;
    await env.COUNTERS.put(key, String(n), { expirationTtl: 172800 });
    if (n > Number(env.DAILY_CHAT_CAP)) return { ok: false, reason: 'daily_cap' };
  } catch {
    // KV 故障不阻塞主流程（宁可漏计数不断服务）
  }
  return { ok: true };
}
