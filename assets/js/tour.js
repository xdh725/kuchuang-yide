/* Virtual tour: one low-bitrate pre-recorded clip per station (Plan A).
   Videos are HLS/MP4 on Cloudflare R2 behind CDN. Audio off by default. */

(function () {
  'use strict';

  // Phase 1 placeholder paths — replace with real R2/CDN URLs after
  // encoding per docs/video-encoding-guide.md (720p / 500-700kbps / 15fps).
  var STATIONS = [
    { key: 'warehouse', emoji: '📦', label: 'Raw Material Warehouse',
      video: 'assets/video/tour-warehouse.mp4',
      note: 'Incoming inspection for silicon steel, magnets and bearings.' },
    { key: 'winding', emoji: '🧵', label: 'Winding Station',
      video: 'assets/video/tour-winding.mp4',
      note: 'Automatic winding with tension control and turn-count check.' },
    { key: 'inspection', emoji: '🔍', label: 'Visual Inspection',
      video: 'assets/video/tour-inspection.mp4',
      note: 'CCD 2D vision inspection on stator and winding geometry.' },
    { key: 'burnin', emoji: '🔥', label: 'Burn-in Test',
      video: 'assets/video/tour-burnin.mp4',
      note: 'Every batch runs a full burn-in before release.' },
    { key: 'packing', emoji: '📦', label: 'Packing Area',
      video: 'assets/video/tour-packing.mp4',
      note: 'Export-grade packing with moisture protection.' }
  ];

  var grid = document.getElementById('tour-grid');
  var player = document.getElementById('tour-player');
  var note = document.getElementById('tour-note');
  var title = document.getElementById('tour-title');

  function activate(i) {
    var st = STATIONS[i];
    Array.prototype.forEach.call(grid.children, function (b, j) {
      b.classList.toggle('active', i === j);
    });
    title.textContent = st.emoji + ' ' + st.label;
    note.textContent = st.note;
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
      note.textContent =
        'This station clip is being uploaded. Please leave your contact — ' +
        'we will send you the footage.';
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
    l.textContent = st.label;
    b.appendChild(e);
    b.appendChild(l);
    b.onclick = function () { activate(i); };
    grid.appendChild(b);
  });

  activate(0);
})();
