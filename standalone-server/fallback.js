// 兜底话术（双语）。所有失败路径的统一出口——客户永远不看到报错，最坏体验是询盘引导。
export const T = {
  en: 'This specific information is not available in our product database. ' +
      'Please leave your WhatsApp or email; our engineer will send you verified data within one working day.',
  zh: '该信息暂未收录于产品数据库。请留下您的 WhatsApp 或邮箱，工程师将在一个工作日内为您提供经核实的资料。',
};

export function fallbackResponse(lang, reason, extra = {}) {
  return {
    reply: T[lang] || T.en,
    source: null,
    fallback: true,
    reason, // 供埋点：low_score | no_hits | image | rate_limited | daily_cap | gate_off | embed_error | kb_error | gen_error | gen_timeout | filter_blocked | bad_input
    ...extra,
  };
}
