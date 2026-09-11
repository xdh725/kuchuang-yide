// 后置校验：正则预检（零成本拦截高危句式）→ LLM 校验（glm-4.5-air）。
// 引用原文豁免：strip 掉 [KB-xx] 标记的片段引用后，生成文本不应包含库外精确数值/打包票句式。

const BANNED_PATTERNS = [
  /efficiency of\s*\d{1,3}(\.\d+)?\s*%/i,       // 未入库精确效率
  /(definitely|perfectly|absolutely)\s+(work|match|fit)/i, // 打包票
  /it is (commonly|generally|widely) known/i,    // 通用科普
  /\b(approximately|generally|usually|typically)\b/i,      // 估算措辞（Harness 禁）
];

export function regexPrecheck(reply) {
  for (const re of BANNED_PATTERNS) {
    if (re.test(reply)) return { verdict: 'FAIL', pattern: re.source };
  }
  return { verdict: 'PASS' };
}

const FILTER_SYSTEM = `You verify a draft answer from a B2B motor assistant against its knowledge base snippets.
Check ONLY factual containment:
1. Every model number in the draft must appear in the snippets.
2. Every specific performance figure must appear in the snippets (hedged trend statements are OK).
3. Material grades must appear in the snippets.
4. No absolute guarantees ("definitely work", "perfect match").
Reply ONLY JSON: {"verdict":"PASS"} or {"verdict":"FAIL","violations":[{"excerpt":"...","reason":"..."}]}
When unsure, FAIL.`;

export async function postFilter(reply, snippets) {
  // ① 正则预检
  const pre = regexPrecheck(reply);
  if (pre.verdict === 'FAIL') return pre;

  // ② LLM 校验（便宜模型）
  try {
    const { chat, models } = await import('./llm.js');
    const ctx = snippets
      .map((m) => '[' + m.id + '] ' + (m.metadata?.text || ''))
      .join('\n---\n');
    const out = await chat(models().FILTER_MODEL, [
      { role: 'system', content: FILTER_SYSTEM },
      {
        role: 'user',
        content:
          'SNIPPETS:\n' + ctx + '\n\nDRAFT ANSWER:\n' + reply + '\n\nJSON verdict:',
      },
    ], { temperature: 0, max_tokens: 400, noThinking: true });

    // 从输出中提取 JSON（容忍模型前后带杂文字）
    const m = out.match(/\{[\s\S]*\}/);
    if (!m) return { verdict: 'FAIL', reason: 'unparseable_filter_output' };
    const v = JSON.parse(m[0]);
    return v.verdict === 'PASS' ? { verdict: 'PASS' } : { verdict: 'FAIL', violations: v.violations };
  } catch (e) {
    // 校验器自身故障 → 宁严勿松
    return { verdict: 'FAIL', reason: 'filter_error: ' + e.message };
  }
}
