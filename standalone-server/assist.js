// 对话式录入：把口述文本/粘贴的规格书内容 交给 GLM 抽取成知识库条目草稿（JSON）。
// 用户在后台确认后走既有 entries API 入库——LLM 只产草稿，不直接写库（防幻觉入库）。
import { chat, models } from './llm.js';

const SYSTEM = `You are a knowledge-base entry extractor for KUCHUANG YIDE, a BLDC motor manufacturer.
Convert the user's raw input (spoken description, pasted spec sheet, BOM fragment, process notes — Chinese or English)
into knowledge base entry drafts, following these rules STRICTLY:

1. Output ONLY a JSON array (no prose, no markdown fences). Each element:
{"title": string, "tags": string (comma separated, lowercase), "type": "text"|"spec-sheet"|"image"|"video",
 "body_en": string, "body_zh": string}

2. ONE entry = ONE fact cluster. A pasted spec sheet usually yields 1-5 entries (model spec / material / process / application), split them.

3. body_en and body_zh must state the SAME facts. If the source is Chinese-only, translate faithfully into English; if English-only, translate into Chinese. NO invented facts — carry over only what the source states. If a value is absent, omit it entirely; never fill with typical/estimated values.

4. Style: plain factual statements, B2B tone, no marketing words (best/leading/premium). Numbers/units exactly as in source.

5. tags vocabulary: model, raw-material, process, application, effect + specifics (model names kc-xxxx, materials like n35sh, 35ww300, class-h, processes like dynamic-balance, ccd, burn-in, applications like drone, agv, lawn-mower, gimbal, pump).

6. Existing entry IDs (do NOT duplicate these; new drafts get empty id and the UI assigns):
{{EXISTING_IDS}}

User input follows. Return the JSON array only.`;

export async function extractEntries(userInput, existingIds) {
  const sys = SYSTEM.replace('{{EXISTING_IDS}}', existingIds.join(', ') || '(none)');
  const out = await chat(models().CHAT_MODEL, [
    { role: 'system', content: sys },
    { role: 'user', content: String(userInput).slice(0, 12000) },
  ], { temperature: 0.1, max_tokens: 2500, noThinking: true, timeout: 90000 });

  // 提取 JSON 数组（容忍 markdown 围栏/前后杂文）
  const m = out.match(/\[[\s\S]*\]/);
  if (!m) throw new Error('LLM 未返回 JSON 数组');
  const drafts = JSON.parse(m[0]);
  if (!Array.isArray(drafts) || !drafts.length) throw new Error('解析结果为空');
  // 规范化 + 基本校验
  return drafts.map((d) => ({
    title: String(d.title || '').trim(),
    tags: String(d.tags || '').trim(),
    type: ['text', 'spec-sheet', 'image', 'video'].includes(d.type) ? d.type : 'text',
    body_en: String(d.body_en || '').trim(),
    body_zh: String(d.body_zh || '').trim(),
  })).filter((d) => d.title && (d.body_en || d.body_zh));
}
