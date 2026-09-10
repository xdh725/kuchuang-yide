// 统一智谱 GLM 封装：chat + embedding 两类调用。
// 换模型只改 env（CHAT_MODEL/FILTER_MODEL/EMBED_MODEL），代码不动。

const TIMEOUT_MS = 30000; // CF 边缘→智谱北京往返 + 生成，弱网预算内给足

async function zhipuFetch(env, path, body, timeout = TIMEOUT_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(env.ZHIPU_BASE + path, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + env.ZHIPU_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      throw new Error('zhipu ' + path + ' HTTP ' + r.status + ' ' + text.slice(0, 200));
    }
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

// chat 调用：messages 数组；返回 content 字符串（剥离 reasoning_content）
export async function chat(env, model, messages, opts = {}) {
  const body = {
    model,
    messages,
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.max_tokens ?? 800,
  };
  if (opts.noThinking) body.thinking = { type: 'disabled' }; // 关闭思考链：转述任务不需要，省时省钱
  const d = await zhipuFetch(env, '/chat/completions', body);
  const content = d.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('zhipu chat empty content');
  }
  return content.trim();
}

// embedding 调用：单条文本；返回 Float 向量
export async function embed(env, text) {
  const d = await zhipuFetch(env, '/embeddings', {
    model: env.EMBED_MODEL,
    input: text,
    dimensions: 1536, // Vectorize 上限 1536；智谱 embedding-3 MRL 截断，质量损失极小
  });
  const vec = d.data?.[0]?.embedding;
  if (!Array.isArray(vec) || vec.length === 0) {
    throw new Error('zhipu embedding empty vector');
  }
  return vec;
}
