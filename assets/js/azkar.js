/*
  قارئ الأذكار ثلاثي الأبعاد — Made By Spy
  ─────────────────────────────
  نافذة بطاقات ثلاثية الأبعاد: اسحب أو استخدم الأسهم للتنقل، واضغط الدائرة (أو Space) لتعدّ التسبيح.
  النصوص في azkar-data.js، والتقدم يُحفظ في متصفح الزائر فقط (localStorage).
*/
(function () {
  'use strict';
  const DATA = window.AZKAR_DATA || [];
  if (!DATA.length) return;

  const KEY = 'spy-azkar-progress';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const AR = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const day = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const hook = () => window.SPY || {};   // script.js exposes Sound, toast and setMenu here
  const snd = n => { try { const S = hook().Sound; if (S && S[n]) S[n](); } catch (e) { /* sound is optional */ } };
  const say = (m, bad) => { try { if (hook().toast) hook().toast(m, bad); } catch (e) { /* toast is optional */ } };
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- saved progress: today's counts reset every day, the lifetime total stays ----------
  let P;
  try { P = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { P = {}; }
  if (P.d !== day()) P = { d: day(), counts: {}, today: 0, life: P.life || 0 };
  P.counts = P.counts || {}; P.today = P.today || 0; P.life = P.life || 0;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { /* private mode */ } };

  // ---------- markup ----------
  const el = document.createElement('div');
  el.className = 'az'; el.id = 'az'; el.hidden = true;
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'azTitle');
  el.innerHTML =
    '<div class="az-glow" aria-hidden="true"></div>' +
    '<header class="az-top" dir="rtl"><div><p class="az-eyebrow">اقرأ واكسب الأجر</p><h2 id="azTitle">الأذكار بين يديك</h2></div>' +
    '<button class="az-x" id="azClose" type="button" aria-label="إغلاق"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 3l8 8M11 3l-8 8"/></svg></button></header>' +
    '<div class="az-tabs" id="azTabs" role="tablist" dir="rtl" aria-label="أقسام الأذكار"></div>' +
    '<div class="az-stage" id="azStage"><div class="az-ring" id="azRing"></div></div>' +
    '<div class="az-ctrl">' +
    '<button class="az-arrow" id="azNext" type="button" aria-label="الذكر التالي"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5"/></svg></button>' +
    '<span class="az-pos" id="azPos" aria-live="polite"></span>' +
    '<button class="az-arrow" id="azPrev" type="button" aria-label="الذكر السابق"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5"/></svg></button></div>' +
    '<div class="az-bar" aria-hidden="true"><i id="azBar"></i></div>' +
    '<div class="az-stats" dir="rtl">' +
    '<span>تسبيحاتك اليوم <b id="azToday">٠</b></span>' +
    '<span>أذكار هذا القسم <b id="azSec">٠ / ٠</b></span>' +
    '<span>مجموع تسبيحاتك <b id="azLife">٠</b></span></div>' +
    '<p class="az-note" dir="rtl">اسحب البطاقات أو استخدم الأسهم، واضغط الدائرة لكل تسبيحة. الأجر عند الله، ونحن فقط نعدّ لك. النصوص للتذكير، ويُستحسن مراجعتها مع كتاب موثوق.</p>';
  // a slow turning aura and drifting motes of light behind the cards
  const glowEl = $('.az-glow', el);
  glowEl.innerHTML = '<span class="az-aura"></span>';
  for (let k = 0; k < 26; k++) {
    const m = document.createElement('i'); m.className = 'az-mote';
    m.style.left = (Math.random() * 100) + '%'; m.style.width = m.style.height = (2 + Math.random() * 4) + 'px';
    m.style.animationDuration = (9 + Math.random() * 12) + 's'; m.style.animationDelay = (-Math.random() * 14) + 's';
    glowEl.appendChild(m);
  }
  document.body.appendChild(el);

  const ring = $('#azRing', el), stage = $('#azStage', el), tabsEl = $('#azTabs', el);
  const posEl = $('#azPos', el), barEl = $('#azBar', el);
  let ci = 0, cur = 0, cards = [], open = false, lastFocus = null, wheelLock = 0, closeTimer = 0;

  const cat = () => DATA[ci];
  const cid = i => cat().id + '-' + i;
  const got = i => P.counts[cid(i)] || 0;
  const isDone = i => got(i) >= cat().items[i].n;
  const repText = n => n === 1 ? 'مرة واحدة' : n === 2 ? 'مرتان' : n <= 10 ? AR(n) + ' مرات' : AR(n) + ' مرة';

  // ---------- tabs ----------
  function buildTabs() {
    tabsEl.innerHTML = '';
    DATA.forEach((c, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'az-tab'; b.setAttribute('role', 'tab'); b.textContent = c.short;
      b.addEventListener('click', () => setCat(i));
      tabsEl.appendChild(b);
    });
  }
  function paintTabs() {
    $$('.az-tab', tabsEl).forEach((b, i) => {
      const on = i === ci;
      b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false');
      const all = DATA[i].items.every((it, k) => (P.counts[DATA[i].id + '-' + k] || 0) >= it.n);
      b.classList.toggle('full', all);
    });
  }

  // ---------- cards ----------
  function buildCards() {
    ring.innerHTML = '';
    cards = cat().items.map((it, i) => {
      const len = it.t.length, size = len > 320 ? 'xs' : len > 170 ? 'sm' : 'lg';
      const c = document.createElement('article');
      c.className = 'az-card'; c.dataset.i = i;
      c.innerHTML =
        '<div class="az-face">' +
        '<div class="az-head"><span class="az-cat">' + esc(cat().title) + '</span><span class="az-rep">' + repText(it.n) + '</span></div>' +
        '<div class="az-text ' + size + '" tabindex="-1"><p>' + esc(it.t) + '</p></div>' +
        (it.f ? '<p class="az-fadl"><b>من الفضل</b> ' + esc(it.f) + '</p>' : '') +
        (it.s ? '<p class="az-src">' + esc(it.s) + '</p>' : '') +
        '<button class="az-count" type="button" aria-label="اضغط للتسبيح">' +
        '<svg viewBox="0 0 80 80" aria-hidden="true"><circle class="az-track" cx="40" cy="40" r="34"/><circle class="az-prog" cx="40" cy="40" r="34"/></svg>' +
        '<span class="az-num"><b>0</b><small>/ ' + it.n + '</small></span></button>' +
        '</div><span class="az-glint" aria-hidden="true"></span>';
      $('.az-count', c).addEventListener('click', e => { e.stopPropagation(); if (+c.dataset.i === cur) count(); });
      ring.appendChild(c);
      paintCard(i, c);
      return c;
    });
  }
  const CIRC = 2 * Math.PI * 34;
  function paintCard(i, c) {
    c = c || cards[i]; if (!c) return;
    const it = cat().items[i], n = Math.min(got(i), it.n), done = n >= it.n;
    const prog = $('.az-prog', c); prog.style.strokeDasharray = CIRC.toFixed(1); prog.style.strokeDashoffset = (CIRC * (1 - n / it.n)).toFixed(1);
    $('.az-num b', c).textContent = n;
    c.classList.toggle('done', done);
    $('.az-count', c).setAttribute('aria-label', done ? 'تم هذا الذكر، اضغط للانتقال للتالي' : 'اضغط للتسبيح، ' + AR(n) + ' من ' + AR(it.n));
  }

  // ---------- the 3D ring ----------
  function layout() {
    const narrow = innerWidth < 700, step = narrow ? 56 : 64;
    cards.forEach((c, i) => {
      const d = i - cur, a = Math.abs(d), active = d === 0;
      c.classList.toggle('active', active);
      c.setAttribute('aria-hidden', active ? 'false' : 'true');
      $('.az-count', c).tabIndex = active ? 0 : -1;
      if (a > 3) {
        c.style.opacity = 0; c.style.pointerEvents = 'none'; c.style.zIndex = 0;
        c.style.transform = 'translate(-50%,-50%) translateX(' + (-Math.sign(d) * step * 3) + '%) translateZ(-640px) rotateY(' + (Math.sign(d) * 50) + 'deg) scale(.6)';
        return;
      }
      c.style.pointerEvents = 'auto'; c.style.zIndex = 10 - a;
      c.style.opacity = active ? 1 : Math.max(.2, .78 - a * .22);
      // the next card sits to the left, because Arabic reads from right to left
      c.style.transform = 'translate(-50%,-50%) translateX(' + (-d * step) + '%) translateZ(' + (-a * 200) + 'px) rotateY(' + (d * 34) + 'deg) scale(' + (1 - a * .05) + ')';
    });
    const n = cat().items.length;
    posEl.textContent = AR(cur + 1) + ' / ' + AR(n);
    barEl.style.width = ((cur + 1) / n * 100) + '%';
    $('#azPrev', el).disabled = cur === 0; $('#azNext', el).disabled = cur === n - 1;
  }
  function go(i, quiet) {
    const n = cat().items.length;
    i = Math.max(0, Math.min(n - 1, i));
    if (i === cur) return;
    cur = i; layout(); focusCount();
    if (!quiet) snd('glide');
  }
  function focusCount() {
    if (!open || !cards[cur]) return;
    try { $('.az-count', cards[cur]).focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  }
  function setCat(i) {
    ci = i; const items = cat().items;
    cur = Math.max(0, items.findIndex((it, k) => got(k) < it.n));   // start at the first dhikr not finished today
    buildCards(); layout(); paintTabs(); stats();
    if (open) focusCount();
  }

  // ---------- counting ----------
  function count() {
    const it = cat().items[cur], n = got(cur);
    if (n >= it.n) { go(cur + 1); return; }
    P.counts[cid(cur)] = n + 1; P.today++; P.life++; save();
    const c = cards[cur];
    paintCard(cur); stats();
    c.classList.remove('tap'); void c.offsetWidth; c.classList.add('tap');
    snd('bead'); try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) { /* not supported */ }
    if (n + 1 >= it.n) {
      snd('done'); burst(c); paintTabs();
      const at = cur;
      const all = cat().items.every((x, k) => got(k) >= x.n);
      if (all) say('أتممت ' + cat().title + '، تقبّل الله منك');
      else setTimeout(() => { if (open && cur === at && at < cat().items.length - 1) go(at + 1, true); }, 1100);
    }
  }
  function stats() {
    const its = cat().items, d = its.filter((x, k) => got(k) >= x.n).length;
    $('#azToday', el).textContent = AR(P.today);
    $('#azLife', el).textContent = AR(P.life);
    $('#azSec', el).textContent = AR(d) + ' / ' + AR(its.length);
  }
  function burst(c) {
    if (reduced()) return;
    const f = $('.az-face', c);
    for (let k = 0; k < 18; k++) {
      const s = document.createElement('i'); s.className = 'az-spark';
      const a = Math.random() * Math.PI * 2, r = 90 + Math.random() * 110;
      s.style.setProperty('--dx', Math.cos(a) * r + 'px'); s.style.setProperty('--dy', Math.sin(a) * r + 'px');
      s.style.animationDelay = (Math.random() * .12) + 's';
      f.appendChild(s); setTimeout(() => s.remove(), 1200);
    }
  }

  // ---------- open / close ----------
  function openAz(i) {
    clearTimeout(closeTimer);
    if (hook().setMenu) { try { hook().setMenu(false); } catch (e) { /* menu closed already */ } }
    lastFocus = document.activeElement;
    el.hidden = false; open = true;
    document.body.classList.add('az-open', 'lock');
    if (i == null) { const h = new Date().getHours(); i = h >= 4 && h < 12 ? 0 : h < 20 ? 1 : 3; }
    setCat(i);
    setTimeout(() => { void el.offsetWidth; el.classList.add('on'); focusCount(); }, 30);
  }
  // opens the reader on one specific dhikr (used by the floating boards inside the 3D scene)
  function openAt(catId, idx) {
    const i = Math.max(0, DATA.findIndex(c => c.id === catId));
    openAz(i);
    cur = Math.max(0, Math.min(DATA[i].items.length - 1, idx | 0));
    layout(); focusCount();
  }
  function closeAz() {
    if (!open) return;
    open = false; el.classList.remove('on');
    document.body.classList.remove('az-open', 'lock');
    closeTimer = setTimeout(() => { if (!open) el.hidden = true; }, 420);
    try { if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  }

  // ---------- input ----------
  $('#azClose', el).addEventListener('click', closeAz);
  $('#azNext', el).addEventListener('click', () => go(cur + 1));
  $('#azPrev', el).addEventListener('click', () => go(cur - 1));
  el.addEventListener('click', e => { if (e.target === el || e.target.classList.contains('az-glow')) closeAz(); });
  ring.addEventListener('click', e => {
    const c = e.target.closest('.az-card'); if (!c || e.target.closest('.az-count')) return;
    if (drag.moved) return;
    const i = +c.dataset.i; if (i !== cur) go(i);
  });

  // swipe or mouse-drag to turn the ring (dragging left brings the next card)
  const drag = { id: null, x: 0, moved: false };
  stage.addEventListener('pointerdown', e => { if (e.target.closest('.az-count')) return; drag.id = e.pointerId; drag.x = e.clientX; drag.moved = false; });
  stage.addEventListener('pointermove', e => {
    if (drag.id === e.pointerId && !drag.moved) {
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 56) { drag.moved = true; go(cur + (dx < 0 ? 1 : -1)); }
    }
    // a gentle 3D lean of the front card toward the pointer
    if (e.pointerType === 'mouse' && !reduced() && cards[cur]) {
      const r = stage.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - .5, ny = (e.clientY - r.top) / r.height - .5;
      const f = $('.az-face', cards[cur]); f.style.setProperty('--ry', (nx * 9).toFixed(2) + 'deg'); f.style.setProperty('--rx', (-ny * 7).toFixed(2) + 'deg');
    }
  });
  const endDrag = e => { if (drag.id === e.pointerId) { drag.id = null; setTimeout(() => { drag.moved = false; }, 30); } };
  stage.addEventListener('pointerup', endDrag); stage.addEventListener('pointercancel', endDrag);
  stage.addEventListener('pointerleave', () => { const f = cards[cur] && $('.az-face', cards[cur]); if (f) { f.style.removeProperty('--rx'); f.style.removeProperty('--ry'); } });

  // the page behind must not scroll or zoom while the cards are open
  el.addEventListener('wheel', e => {
    e.stopPropagation();
    if (e.target.closest('.az-text')) { const t = e.target.closest('.az-text'); if (t.scrollHeight > t.clientHeight + 2) return; }
    e.preventDefault();
    const now = performance.now(); if (now - wheelLock < 420) return;
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(d) < 8) return;
    wheelLock = now; go(cur + (d > 0 ? 1 : -1));
  }, { passive: false });
  el.addEventListener('touchmove', e => { if (!e.target.closest('.az-text')) e.preventDefault(); }, { passive: false });

  addEventListener('keydown', e => {
    if (!open) return;
    const k = e.key;
    if (k === 'Escape') { e.preventDefault(); closeAz(); }
    else if (k === 'ArrowLeft') { e.preventDefault(); go(cur + 1); }
    else if (k === 'ArrowRight') { e.preventDefault(); go(cur - 1); }
    else if (k === 'Tab') {
      const f = $$('button:not([disabled]):not([tabindex="-1"])', el).filter(b => b.offsetParent !== null);
      if (f.length) {
        const i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && (i === f.length - 1 || i === -1)) { e.preventDefault(); f[0].focus(); }
      }
    }
    else if ((k === ' ' || k === 'Enter') && !(document.activeElement && document.activeElement.closest && document.activeElement.closest('#az button'))) { e.preventDefault(); count(); }
    e.stopImmediatePropagation();   // the 3D scene's own shortcuts stay quiet while reading
  }, true);
  addEventListener('keyup', e => { if (open) e.stopImmediatePropagation(); }, true);
  addEventListener('resize', () => { if (open) layout(); });

  // ---------- anything marked data-azkar opens the reader ----------
  $$('[data-azkar]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); openAz(); }));
  buildTabs();
  window.SpyAzkar = { open: openAz, openAt: openAt, close: closeAz };
})();
