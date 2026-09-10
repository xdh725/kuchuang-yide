/* Lightweight i18n — no framework, one JSON-ish dictionary per language.
   Usage: give elements data-i18n="key" (textContent) or data-i18n-html="key"
   (innerHTML). Placeholder text uses data-i18n-placeholder. Chat/tour JS
   read strings via I18N.t(key). New languages: add a block to DICT and a
   <option> in every page's lang <select>. */

(function () {
  'use strict';

  var SUPPORTED = ['en', 'zh', 'es']; // es seeded but not translated yet
  var DICT = {
    en: {
      'header.note': 'BLDC Motor Manufacturer · B2B Export',
      'header.note.explorer': 'AI Product Guide · answers only from our verified database',
      'header.note.tour': 'Low-bandwidth video · plays smoothly on weak networks',
      'home.hero.title': 'High-Performance BLDC Motors,<br>Built and Proven in Our Own Factory',
      'home.hero.sub': 'Two ways to get to know us — <b>talk to our AI product guide</b>, or <b>step inside the workshop</b> from wherever you are.',
      'home.card1.title': 'Explore Our Products',
      'home.card1.body': 'Chat with our AI guide. Ask about performance, raw materials, production processes and application cases — answered only from our verified product database, layer by layer.',
      'home.cta1': 'Talk to our AI guide',
      'home.cta2': 'Tour the factory',
      'home.trust1': 'Verified in-house production',
      'home.trust2': 'Layer-by-layer technical answers',
      'home.trust3': 'Engineer reply within 1 working day',
      'home.trust4': 'Export-grade packing',
      'home.card1.go': 'Start the conversation',
      'home.card2.title': 'Virtual Factory Tour',
      'home.card2.body': 'Walk through our winding stations, CCD vision inspection, burn-in room and packing area in low-bitrate video — designed to play smoothly even on unstable connections.',
      'home.card2.go': 'Enter the workshop',
      'footer.contact': 'Contact',
      'footer.email': 'Email: sales@kuchuangyide.com',
      'footer.whatsapp': 'WhatsApp: +86-xxx-xxxx-xxxx',
      'footer.address': 'Address: [Factory address, City, China]',
      'footer.brand': 'KUCHUANG YIDE',
      'footer.line1': 'High-performance BLDC motors',
      'footer.line2': 'Drones · AGV · Robotics · Pumps',
      'footer.trust': 'Trust',
      'footer.trust1': 'Answers cite their source material',
      'footer.trust2': 'Unverified questions go straight to an engineer',
      'footer.whysoft': 'Why the video looks soft',
      'footer.soft1': '360–720p, under 900 kbps, on purpose',
      'footer.soft2': 'Smooth beats sharp on weak networks',
      'explorer.title': '🤖 Product Explorer',
      'explorer.sub': 'Ask anything about our BLDC motors — performance, materials, processes, application cases. The guide answers layer by layer, with sources.',
      'explorer.placeholder': 'e.g. What magnet grade do you use?',
      'explorer.send': 'Send',
      'explorer.attach': 'Attach a photo of your current motor / equipment',
      'chat.welcome': 'Hello! You can ask me anything about our BLDC motors, performance, raw materials, processes and application cases.',
      'chat.fallback': 'This specific information is not available in our product database. Please leave your WhatsApp or email; our engineer will send you verified data.',
      'chat.offline': 'The assistant service is not connected yet. ',
      'chat.cta': 'If you need custom specifications or a sample offer, please leave your WhatsApp / Email — our engineer will contact you.',
      'chat.cta.btn': 'Leave contact',
      'chat.attach.note': ' — will be analyzed for a suggestive match only',
      'chat.attach.toobig': 'Please attach an image under 3 MB.',
      'inquiry.fab': 'Inquiry',
      'inquiry.title': 'Get verified data from our engineer',
      'inquiry.title.book': 'Book a LIVE guided tour',
      'inquiry.hint': 'Three fields only. We reply within one working day.',
      'inquiry.name': 'Name',
      'inquiry.company': 'Company',
      'inquiry.contact': 'Email / WhatsApp',
      'inquiry.contact.book': 'Email / WhatsApp + preferred time & time zone',
      'inquiry.cancel': 'Cancel',
      'inquiry.send': 'Send',
      'inquiry.book': 'Book',
      'inquiry.sending': 'Sending…',
      'tour.title': '🏭 Virtual Factory Tour',
      'tour.sub': 'Click a station to watch. Videos are kept small on purpose — clarity yields to smoothness, so they play even on unstable connections.',
      'tour.snapshot': "Today's workshop snapshot — fresh footage is recorded every day.",
      'tour.book.title': 'Want a <b>live guided tour</b> with our engineer walking the floor and answering your questions in real time?',
      'tour.book.btn': 'Book a LIVE guided tour',
      'tour.book.sub': 'Leave your preferred time, time zone and WhatsApp — we will confirm a slot.',
      'tour.video.missing': 'This station clip is being uploaded. Please leave your contact — we will send you the footage.',
      'st.warehouse': 'Raw Material Warehouse',
      'st.warehouse.note': 'Incoming inspection for silicon steel, magnets and bearings.',
      'st.winding': 'Winding Station',
      'st.winding.note': 'Automatic winding with tension control and turn-count check.',
      'st.inspection': 'Visual Inspection',
      'st.inspection.note': 'CCD 2D vision inspection on stator and winding geometry.',
      'st.burnin': 'Burn-in Test',
      'st.burnin.note': 'Every batch runs a full burn-in before release.',
      'st.packing': 'Packing Area',
      'st.packing.note': 'Export-grade packing with moisture protection.',
      'thanks.title': 'Thank you!',
      'thanks.body': 'Our engineer will contact you shortly.',
      'thanks.back': '← Back to home'
    },
    zh: {
      'header.note': '无刷电机制造商 · B2B 出口',
      'header.note.explorer': 'AI 产品导购 · 只基于我们已核实的数据库回答',
      'header.note.tour': '低码率视频 · 弱网络下流畅播放',
      'home.hero.title': '高性能无刷电机，<br>自有工厂制造与验证',
      'home.hero.sub': '两种方式了解我们 —— <b>与 AI 产品导购对话</b>，或随时随地<b>云参观车间</b>。',
      'home.card1.title': '探索我们的产品',
      'home.card1.body': '与 AI 导购对话。咨询性能、原材料、生产工序和应用案例 —— 每一条回答都只来自我们已核实的产品数据库，逐层递进讲解。',
      'home.card1.go': '开始对话',
      'home.card2.title': '云参观工厂',
      'home.card2.body': '走进绕线车间、CCD 视觉检测工位、老化房和打包区 —— 低码率视频专为不稳定网络优化，播放不卡顿。',
      'home.card2.go': '进入车间',
      'footer.contact': '联系方式',
      'footer.email': '邮箱：sales@kuchuangyide.com',
      'footer.whatsapp': 'WhatsApp：+86-xxx-xxxx-xxxx',
      'footer.address': '地址：[工厂地址，中国]',
      'footer.brand': '酷创易德 KUCHUANG YIDE',
      'footer.line1': '高性能无刷电机',
      'footer.line2': '无人机 · AGV · 机器人 · 泵类',
      'footer.trust': '可信回答',
      'footer.trust1': '回答附带来源素材',
      'footer.trust2': '未核实的问题直达工程师',
      'footer.whysoft': '为什么视频不追求高清',
      'footer.soft1': '360–720p、低于 900 kbps，是有意为之',
      'footer.soft2': '弱网下，流畅优先于清晰',
      'explorer.title': '产品探索',
      'explorer.sub': '咨询无刷电机的任何问题 —— 性能、材料、工序、应用案例。导购逐层解答，并附来源。',
      'explorer.placeholder': '例如：你们用什么等级的磁钢？',
      'explorer.send': '发送',
      'explorer.attach': '上传您现有电机/设备的照片',
      'chat.welcome': '您好！欢迎咨询我们无刷电机的性能、原材料、工序和应用案例等任何问题。',
      'chat.fallback': '该信息暂未收录于我们的产品数据库。请留下您的 WhatsApp 或邮箱，工程师将为您提供经核实的资料。',
      'chat.offline': '导购服务尚未接入。 ',
      'chat.cta': '如需定制规格或样品报价，请留下您的 WhatsApp / 邮箱 —— 工程师会尽快与您联系。',
      'chat.cta.btn': '留下联系方式',
      'chat.attach.note': ' —— 仅作参考匹配，不构成保证',
      'chat.attach.toobig': '请上传 3 MB 以内的图片。',
      'inquiry.fab': '询盘',
      'inquiry.title': '获取工程师核实的资料',
      'inquiry.title.book': '预约真人实时导览',
      'inquiry.hint': '仅需三项信息。我们将在一个工作日内回复。',
      'inquiry.name': '姓名',
      'inquiry.company': '公司',
      'inquiry.contact': '邮箱 / WhatsApp',
      'inquiry.contact.book': '邮箱 / WhatsApp + 期望时间与时区',
      'inquiry.cancel': '取消',
      'inquiry.send': '发送',
      'inquiry.book': '预约',
      'inquiry.sending': '发送中…',
      'tour.title': '云参观工厂',
      'tour.sub': '点击工位即可观看。视频刻意压缩得很小 —— 为流畅让路，弱网也能播。',
      'tour.snapshot': '今日车间实拍 —— 每天更新最新产线画面。',
      'tour.book.title': '想要工程师<b>真人带逛车间</b>、实时答疑的导览吗？',
      'tour.book.btn': '预约真人实时导览',
      'tour.book.sub': '留下您方便的时间、时区和 WhatsApp —— 我们会与您确认档期。',
      'tour.video.missing': '该工位视频正在上传。请留下联系方式 —— 我们将把视频发给您。',
      'st.warehouse': '来料仓库',
      'st.warehouse.note': '矽钢片、磁钢、轴承来料检验。',
      'st.winding': '绕线工位',
      'st.winding.note': '自动绕线，张力控制与圈数检测。',
      'st.inspection': '视觉检测',
      'st.inspection.note': 'CCD 二次元视觉检测定子与绕组几何。',
      'st.burnin': '老化测试',
      'st.burnin.note': '每批出货前均经过完整老化测试。',
      'st.packing': '打包区',
      'st.packing.note': '出口级包装，含防潮保护。',
      'thanks.title': '谢谢！',
      'thanks.body': '工程师将尽快与您联系。',
      'thanks.back': '← 返回首页'
    },
    es: {} // seeded: add translations here (also footer/legal keys) to enable
  };

  function detect() {
    var saved = null;
    try { saved = localStorage.getItem('kcyd-lang'); } catch (e) {}
    if (saved && SUPPORTED.indexOf(saved) >= 0) return saved;
    var nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return SUPPORTED.indexOf(nav) >= 0 ? nav : 'en';
  }

  var lang = detect();

  function t(key) {
    var d = DICT[lang] || {};
    return d[key] !== undefined ? d[key] : (DICT.en[key] !== undefined ? DICT.en[key] : key);
  }

  function apply() {
    var nodes = document.querySelectorAll('[data-i18n],[data-i18n-html],[data-i18n-placeholder]');
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.getAttribute('data-i18n') !== null) n.textContent = t(n.getAttribute('data-i18n'));
      if (n.getAttribute('data-i18n-html') !== null) n.innerHTML = t(n.getAttribute('data-i18n-html'));
      var ph = n.getAttribute('data-i18n-placeholder');
      if (ph) n.setAttribute('placeholder', t(ph));
    }
    document.documentElement.lang = lang;
    var sel = document.getElementById('lang-select');
    if (sel) sel.value = lang;
  }

  window.I18N = {
    t: t,
    get lang() { return lang; },
    set: function (l) {
      if (SUPPORTED.indexOf(l) < 0) return;
      lang = l;
      try { localStorage.setItem('kcyd-lang', l); } catch (e) {}
      apply();
      document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: l } }));
    },
    apply: apply,
    supported: SUPPORTED
  };

  // Auto-apply as soon as DOM is ready; re-apply on language switch.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();
