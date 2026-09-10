/* Virtual tour: one low-bitrate pre-recorded clip per station (Plan A).
   Videos are HLS/MP4 on Cloudflare R2 behind CDN. Audio off by default.
   Station labels/notes are localized via i18n.js keys st.<key> / st.<key>.note */

(function () {
  'use strict';

  // Phase 1 placeholder paths — replace with real R2/CDN URLs after
  // encoding per docs/video-encoding-guide.md (720p / 500-700kbps / 15fps).
  var STATIONS = [
    { key: 'warehouse', emoji: '📦', video: 'assets/video/tour-warehouse.mp4' },
    { key: 'winding', emoji: '🧵', video: 'assets/video/tour-winding.mp4' },
    { key: 'inspection', emoji: '🔍', video: 'assets/video/tour-inspection.mp4' },
    { key: 'burnin', emoji: '🔥', video: 'assets/video/tour-burnin.mp4' },
    { key: 'packing', emoji: '📦', video: 'assets/video/tour-packing.mp4' }
  ];

  var grid = document.getElementById('tour-grid');
  var player = document.getElementById('tour-player');
  var note = document.getElementById('tour-note');
  var title = document.getElementById('tour-title');
  var current = 0;

  function stationLabel(st) { return st.emoji + ' ' + I18N.t('st.' + st.key); }

  function activate(i) {
    current = i;
    var st = STATIONS[i];
    Array.prototype.forEach.call(grid.children, function (b, j) {
      b.classList.toggle('active', i === j);
      b.lastChild.textContent = I18N.t('st.' + STATIONS[j].key);
    });
    title.textContent = stationLabel(st);
    note.textContent = I18N.t('st.' + st.key + '.note');
    player.innerHTML = '';
    var v = document.createElement('video');
    v.controls = true;
    v.muted = true;            // audio off by default — factory noise
    v.playsInline = true;
    v.preload = 'none';        // bandwidth-friendly: load on demand only
    var src = document.createElement('source');
    src.src = st.video;
    src.type = 'video/mp4';
    v.appendChild(src);
    v.addEventListener('error', function () {
      note.textContent = I18N.t('tour.video.missing');
    });
    player.appendChild(v);
    v.play().catch(function () { /* autoplay blocked: user presses play */ });
  }

  STATIONS.forEach(function (st, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'tour-btn';
    var e = document.createElement('span');
    e.className = 'emoji';
    e.textContent = st.emoji;
    var l = document.createElement('span');
    l.textContent = I18N.t('st.' + st.key);
    b.appendChild(e);
    b.appendChild(l);
    b.onclick = function () { activate(i); };
    grid.appendChild(b);
  });

  activate(0);
  document.addEventListener('langchange', function () {
    // relabel buttons + current title/note without reloading the video
    Array.prototype.forEach.call(grid.children, function (btn, j) {
      btn.lastChild.textContent = I18N.t('st.' + STATIONS[j].key);
    });
    title.textContent = stationLabel(STATIONS[current]);
    if (note.textContent === I18N.t('tour.video.missing') ||
        note.textContent !== I18N.t('tour.video.missing')) {
      // keep showing the missing-clip notice if the video failed earlier
      note.textContent = player.querySelector('video') &&
        player.querySelector('video').error
        ? I18N.t('tour.video.missing')
        : I18N.t('st.' + STATIONS[current].key + '.note');
    }
  });
})();
