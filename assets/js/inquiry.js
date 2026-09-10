/* Minimal 3-field inquiry modal: name / company / email-or-WhatsApp.
   Posts to /api/inquiry (Pages Function -> email + Feishu webhook). */

(function () {
  'use strict';

  var mask = document.getElementById('inquiry-mask');

  window.openInquiry = function () {
    if (!mask) return;
    mask.classList.add('open');
  };

  function close() { mask.classList.remove('open'); }

  var closeBtn = document.getElementById('inquiry-close');
  if (closeBtn) closeBtn.onclick = close;
  mask.addEventListener('click', function (e) {
    if (e.target === mask) close();
  });

  var form = document.getElementById('inquiry-form');
  form.onsubmit = function (e) {
    e.preventDefault();
    var btn = document.getElementById('inquiry-submit');
    btn.disabled = true;
    btn.textContent = 'Sending…';

    var body = JSON.stringify({
      name: form.name.value.trim(),
      company: form.company.value.trim(),
      contact: form.contact.value.trim(),
      page: location.pathname
    });

    fetch('/api/inquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body
    })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function () { location.href = 'thank-you.html'; })
      .catch(function () {
        // Honest fallback: mailto link still closes the loop.
        location.href =
          'mailto:sales@kuchuangyide.com?subject=Inquiry%20from%20website' +
          '&body=' + encodeURIComponent(
            'Name: ' + form.name.value + '\n' +
            'Company: ' + form.company.value + '\n' +
            'Contact: ' + form.contact.value + '\n'
          );
        btn.disabled = false;
        btn.textContent = 'Send';
      });
  };
})();
