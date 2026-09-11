/* Product Explorer chat UI.
   Talks to a thin backend endpoint that implements the
   Router -> Harness / controlled Agent -> post-filter pipeline.
   The endpoint URL is configured in RAG_ENDPOINT below (Cloudflare
   Pages Function /api/chat — keys stay server-side, never here).
   All user-facing strings come from i18n.js (I18N.t). */

(function () {
  'use strict';

  // Workers 后端（生产）。本地开发可改为 http://localhost:8787/api/chat
  var RAG_ENDPOINT = '/api/chat'; // 同域（Workers 静态托管 + API 同源，零 CORS）

  var log = document.getElementById('chat-log');
  var input = document.getElementById('chat-input');
  var sendBtn = document.getElementById('chat-send');
  var attachBtn = document.getElementById('chat-attach-btn');
  var fileInput = document.getElementById('chat-file');
  var attachPreview = document.getElementById('attach-preview');
  var pendingImage = null;
  var welcomeNode = null;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  function scrollBottom() { log.scrollTop = log.scrollHeight; }

  function addMsg(role, text, opts) {
    opts = opts || {};
    var m = el('div', 'msg ' + role + (opts.fallback ? ' fallback' : ''));
    m.textContent = text;
    if (opts.source) {
      var s = el('span', 'src', 'Source: ' + opts.source);
      m.appendChild(s);
    }
    log.appendChild(m);
    scrollBottom();
    return m;
  }

  function addTyping() {
    var m = el('div', 'msg bot');
    var t = el('span', 'typing');
    t.appendChild(el('i'));
    t.appendChild(el('i'));
    t.appendChild(el('i'));
    m.appendChild(t);
    log.appendChild(m);
    scrollBottom();
    return m;
  }

  function inquiryCTA() {
    var m = el('div', 'msg bot fallback');
    m.textContent = I18N.t('chat.cta');
    var b = el('button', 'btn ghost');
    b.type = 'button';
    b.style.marginTop = '8px';
    b.textContent = I18N.t('chat.cta.btn');
    b.onclick = function () { openInquiry(); };
    m.appendChild(b);
    log.appendChild(m);
    scrollBottom();
  }

  function send(text) {
    if (!text || !text.trim()) return;
    addMsg('user', text.trim());
    input.value = '';
    var img = pendingImage;
    clearAttach();

    var typing = addTyping();

    var payload = { message: text.trim(), lang: I18N.lang };
    if (img) payload.image = img.dataUrl;

    fetch(RAG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (data) {
        log.removeChild(typing);
        // data: { reply, source, fallback }
        if (data.fallback) {
          addMsg('bot', I18N.t('chat.fallback'), { fallback: true });
          inquiryCTA();
        } else {
          addMsg('bot', data.reply, { source: data.source });
        }
      })
      .catch(function () {
        log.removeChild(typing);
        // Endpoint not deployed yet (phase 1 wiring) — honest offline reply.
        addMsg('bot', I18N.t('chat.offline') + I18N.t('chat.fallback'), { fallback: true });
        inquiryCTA();
      });
  }

  /* ---- image attach (routes to controlled Agent image matching) ---- */
  attachBtn.onclick = function () { fileInput.click(); };
  fileInput.onchange = function () {
    var f = fileInput.files && fileInput.files[0];
    if (!f) return;
    if (f.size > 3 * 1024 * 1024) {
      alert(I18N.t('chat.attach.toobig'));
      return;
    }
    var fr = new FileReader();
    fr.onload = function () {
      pendingImage = { name: f.name, dataUrl: fr.result };
      attachPreview.innerHTML = '';
      var im = el('img');
      im.src = fr.result;
      im.alt = f.name;
      attachPreview.appendChild(im);
      attachPreview.appendChild(
        el('span', null, f.name + I18N.t('chat.attach.note'))
      );
    };
    fr.readAsDataURL(f);
  };
  function clearAttach() {
    pendingImage = null;
    attachPreview.innerHTML = '';
    fileInput.value = '';
  }

  sendBtn.onclick = function () { send(input.value); };
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); send(input.value); }
  });

  // Welcome message follows the active language (also after a switch,
  // as long as the conversation has not started yet).
  welcomeNode = addMsg('bot', I18N.t('chat.welcome'));
  document.addEventListener('langchange', function () {
    if (log.children.length === 1 && log.children[0] === welcomeNode) {
      welcomeNode.textContent = I18N.t('chat.welcome');
    }
  });
})();
