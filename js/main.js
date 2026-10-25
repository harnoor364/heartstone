/* Heartstone Inn · demo homepage
   Vanilla JS. GSAP + ScrollTrigger + Lenis load from CDN; every feature
   still works (more simply) if a CDN is blocked. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  function navH() {
    return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 60;
  }

  /* ---------------- Smooth scrolling (Lenis) ---------------- */
  var lenis = null;
  if (!reduceMotion && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    if (hasGsap) {
      lenis.on('scroll', window.ScrollTrigger.update);
      window.gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      window.gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
    }
  }
  if (hasGsap) window.gsap.registerPlugin(window.ScrollTrigger);

  // In-page links: smooth scroll, offset by the sticky nav
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      var target = id === '#top' ? document.body : $(id);
      if (!target) return;
      e.preventDefault();
      var y = id === '#top' ? 0 : target.getBoundingClientRect().top + window.scrollY - navH() + 1;
      if (lenis) lenis.scrollTo(y, { duration: 1.4 });
      else window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });

  /* ---------------- Scroll bookkeeping (works with or without Lenis) ---------------- */
  var scrollHandlers = [];
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      for (var i = 0; i < scrollHandlers.length; i++) scrollHandlers[i]();
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  // Progress (0–1) of a tall section whose sticky child is pinned
  function pinProgress(section, stage) {
    var r = section.getBoundingClientRect();
    var travel = section.offsetHeight - stage.offsetHeight;
    if (travel <= 0) return 0;
    return clamp((navH() - r.top) / travel, 0, 1);
  }

  /* ---------------- Header ---------------- */
  var navbar = $('.navbar');
  scrollHandlers.push(function () {
    navbar.classList.toggle('is-stuck', navbar.getBoundingClientRect().top <= 0.5 && window.scrollY > 10);
  });

  /* =========================================================
     HERO · frame-by-frame scroll scrub on <canvas>
     ========================================================= */
  var hero = $('.hero');
  var stage = $('.hero__stage');
  var canvas = $('.hero__canvas');
  var ctx = canvas.getContext('2d');
  var video = $('.hero__video');
  var caps = $$('.cap', hero);
  var preloader = $('.preloader');
  var pctEl = $('.preloader__pct');
  var barEl = $('.preloader__bar i');
  var hdEl = $('.hero__hd span');

  var frames = [];      // Image objects (or undefined until requested)
  var loaded = [];      // booleans
  var frameCount = 0;
  var currentFrame = -1;
  var heroMode = 'pending';

  function setPct(p) {
    var v = Math.round(p * 100) + '%';
    pctEl.textContent = v;
    barEl.style.width = v;
  }

  function sizeCanvas() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = stage.clientWidth, h = stage.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      currentFrame = -1;
    }
  }

  function drawCover(img) {
    var cw = canvas.width, ch = canvas.height;
    var ir = img.naturalWidth / img.naturalHeight, cr = cw / ch;
    var w, h;
    if (ir > cr) { h = ch; w = h * ir; } else { w = cw; h = w / ir; }
    ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
  }

  function nearestLoaded(i) {
    if (loaded[i]) return i;
    for (var d = 1; d < frameCount; d++) {
      if (i - d >= 0 && loaded[i - d]) return i - d;
      if (i + d < frameCount && loaded[i + d]) return i + d;
    }
    return -1;
  }

  function render(i) {
    var n = nearestLoaded(i);
    if (n < 0 || n === currentFrame) return;
    currentFrame = n;
    drawCover(frames[n]);
  }

  // Captions: each owns a quarter of the scroll; the last one stays on screen.
  function updateCaptions(p) {
    var seg = 1 / caps.length, fade = 0.06;
    caps.forEach(function (cap, i) {
      var start = i * seg, end = (i + 1) * seg;
      var o;
      if (i === 0) o = 1 - clamp((p - (end - fade)) / fade, 0, 1);
      else if (i === caps.length - 1) o = clamp((p - start) / fade, 0, 1);
      else o = Math.min(clamp((p - start) / fade, 0, 1), 1 - clamp((p - (end - fade)) / fade, 0, 1));
      cap.style.opacity = o;
      cap.style.transform = 'translateY(' + ((1 - o) * 24).toFixed(1) + 'px)';
      cap.style.visibility = o < 0.01 ? 'hidden' : 'visible';
    });
  }

  function heroScroll() {
    if (heroMode !== 'sequence') return;
    var p = pinProgress(hero, stage);
    hero.classList.toggle('is-scrolled', p > 0.01);
    updateCaptions(p);
    render(Math.round(p * (frameCount - 1)));
  }

  function loadImage(src, timeout) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var t = setTimeout(function () { reject(new Error('timeout')); }, timeout || 15000);
      img.decoding = 'async';
      img.onload = function () { clearTimeout(t); resolve(img); };
      img.onerror = function () { clearTimeout(t); reject(new Error('404 ' + src)); };
      img.src = src;
    });
  }

  function useVideoFallback(reason) {
    if (heroMode === 'video') return;
    if (reason && window.console) console.info('[hero] video fallback:', reason);
    heroMode = 'video';
    hero.classList.add('is-static');
    hero.classList.remove('is-loading-hd');
    preloader.classList.add('is-done');
    caps.forEach(function (c) { c.style.cssText = ''; c.classList.remove('is-on'); });
    $$('source', video).forEach(function (s) { s.src = s.getAttribute('data-src'); });
    video.poster = 'assets/photos/optimized/grounds-forest-1600.webp';
    video.load();
    var play = video.play();
    if (play && play.catch) play.catch(function () { /* poster stays */ });

    if (reduceMotion) {
      hero.classList.add('is-still'); // one calm caption + Book Now
      return;
    }
    // Gently rotate the four captions
    var i = 0;
    caps[0].classList.add('is-on');
    setInterval(function () {
      caps[i].classList.remove('is-on');
      i = (i + 1) % caps.length;
      caps[i].classList.add('is-on');
    }, 4200);
  }

  function initSequence() {
    var conn = navigator.connection || {};
    if (reduceMotion) return useVideoFallback('prefers-reduced-motion');
    if (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '')) return useVideoFallback('save-data / slow connection');

    fetch('assets/frames/manifest.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('no manifest'); return r.json(); })
      .then(function (m) {
        var small = Math.min(window.innerWidth, screen.width) < 820 || window.innerHeight > window.innerWidth;
        var set = (small && m.mobile) ? m.mobile : (m.desktop || m.mobile);
        if (!set || !set.count) throw new Error('empty manifest');
        frameCount = set.count;
        var path = set.path.replace(/\/?$/, '/');
        var src = function (i) { return path + 'frame_' + String(i + 1).padStart(4, '0') + '.webp'; };

        // Load order: first frame, then a coarse pass (every 6th), then fill in.
        // Long sequences: phones load every other frame (still smooth), desktops only past 15 s.
        var stride = (small && frameCount > 160) || frameCount > 360 ? 2 : 1;
        var keyStep = 6;
        var order = [0], seen = { 0: 1 }, keyCount;
        for (var k = keyStep; k < frameCount; k += keyStep) { order.push(k); seen[k] = 1; }
        if (!seen[frameCount - 1]) { order.push(frameCount - 1); seen[frameCount - 1] = 1; }
        keyCount = order.length;
        [3, stride].forEach(function (step) {
          for (var j = 0; j < frameCount; j += step) if (!seen[j]) { order.push(j); seen[j] = 1; }
        });

        var total = order.length, done = 0, errors = 0, next = 0, keyDone = 0;
        var revealed = false;

        function reveal() {
          if (revealed) return;
          revealed = true;
          preloader.classList.add('is-done');
          hero.classList.add('is-loading-hd');
        }

        function pump() {
          while (next < total && inflight < 6) {
            (function (idx, isKey) {
              inflight++;
              loadImage(src(idx)).then(function (img) {
                frames[idx] = img; loaded[idx] = true;
              }, function () { errors++; }).then(function () {
                inflight--; done++;
                if (isKey) {
                  keyDone++;
                  setPct(keyDone / keyCount);
                  if (keyDone === keyCount) reveal();
                }
                hdEl.style.width = (done / total * 100).toFixed(1) + '%';
                if (errors > 8 && errors / done > 0.25) { next = total; return useVideoFallback('too many frames failed'); }
                if (done === total) hero.classList.remove('is-loading-hd');
                currentFrame = -1; heroScroll();
                pump();
              });
            })(order[next], next < keyCount);
            next++;
          }
        }
        var inflight = 0;

        // First frame decides whether the sequence is usable at all
        return loadImage(src(0), 8000).then(function (img) {
          frames[0] = img; loaded[0] = true;
          heroMode = 'sequence';
          sizeCanvas();
          heroScroll();
          next = 1; done = 1; keyDone = 1;
          setPct(keyDone / keyCount);
          pump();
        });
      })
      .catch(function (err) { useVideoFallback(err && err.message); });
  }

  scrollHandlers.push(heroScroll);
  window.addEventListener('resize', function () { if (heroMode === 'sequence') { sizeCanvas(); heroScroll(); } });
  initSequence();

  /* =========================================================
     ROOMS · CSS 3D carousel (scroll + swipe + keys + hover tilt)
     ========================================================= */
  var rooms = $('.rooms');
  var roomsStage = $('.rooms__sticky');
  var carousel = $('.carousel');
  var ring = $('.carousel__ring');
  var cards = $$('.card', ring);
  var nowEl = $('.carousel__now');
  var N = cards.length, STEP = 360 / N;
  var radius = 0;
  var scrollRot = 0, dragRot = 0, shownRot = 0;
  var dragging = false, dragStartX = 0, dragStartRot = 0, dragMoved = false;
  var lastFront = -1;

  if (reduceMotion) rooms.classList.add('is-static');

  function layoutRing() {
    var w = cards[0].offsetWidth;
    radius = Math.round((w / 2) / Math.tan(Math.PI / N) * 1.12);
  }

  // Scroll → rotation with a small "dwell" on each card so it sits square to the viewer
  function scrollToRotation(p) {
    var s = p * (N - 1), k = Math.floor(s), f = s - k;
    var t = clamp((f - 0.18) / 0.64, 0, 1);
    t = t * t * (3 - 2 * t);
    return -(Math.min(k + t, N - 1)) * STEP;
  }

  function roomsScroll() {
    if (!rooms.classList.contains('is-static')) scrollRot = scrollToRotation(pinProgress(rooms, roomsStage));
  }
  scrollHandlers.push(roomsScroll);

  function paintRing() {
    ring.style.transform = 'translateZ(' + (-radius) + 'px) rotateY(' + shownRot.toFixed(3) + 'deg)';
    var front = 0, best = 999;
    cards.forEach(function (card, i) {
      var a = ((i * STEP + shownRot) % 360 + 540) % 360 - 180; // -180..180, 0 = facing us
      var abs = Math.abs(a);
      card.style.transform = 'rotateY(' + (i * STEP) + 'deg) translateZ(' + radius + 'px)';
      card.querySelector('.card__shade').style.opacity = clamp(abs / 110, 0, 0.7).toFixed(3);
      card.style.pointerEvents = abs > 75 ? 'none' : '';
      if (abs < best) { best = abs; front = i; }
    });
    if (front !== lastFront) {
      cards.forEach(function (c, i) {
        c.classList.toggle('is-front', i === front);
        c.setAttribute('aria-hidden', i === front ? 'false' : 'true');
        $$('a', c).forEach(function (a) { a.tabIndex = i === front ? 0 : -1; });
      });
      nowEl.textContent = String(front + 1).padStart(2, '0');
      lastFront = front;
    }
  }

  function snapDrag() {
    // Make scroll + drag land exactly on a card
    var total = scrollRot + dragRot;
    dragRot += Math.round(total / STEP) * STEP - total;
  }

  function ringLoop() {
    var target = scrollRot + dragRot;
    var k = reduceMotion ? 1 : (dragging ? 0.35 : 0.1);
    shownRot += (target - shownRot) * k;
    if (Math.abs(target - shownRot) < 0.01) shownRot = target;
    paintRing();
    requestAnimationFrame(ringLoop);
  }

  function step(dir) { snapDrag(); dragRot -= dir * STEP; }

  carousel.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    dragging = true; dragMoved = false;
    dragStartX = e.clientX; dragStartRot = dragRot;
  });
  window.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - dragStartX;
    if (Math.abs(dx) > 6 && !dragMoved) { dragMoved = true; carousel.classList.add('is-dragging'); }
    if (dragMoved) dragRot = dragStartRot + dx * (carousel.offsetWidth < 600 ? 0.42 : 0.28);
  });
  function endDrag() {
    if (!dragging) return;
    dragging = false;
    carousel.classList.remove('is-dragging');
    if (dragMoved) {
      var moved = dragRot - dragStartRot;
      // a quick flick always advances at least one card
      if (Math.abs(moved) > 8 && Math.abs(moved) < STEP / 2) dragRot = dragStartRot + (moved > 0 ? STEP : -STEP);
      snapDrag();
    }
  }
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  // Swallow the click that ends a drag, so a swipe never opens the booking link
  carousel.addEventListener('click', function (e) {
    if (dragMoved) { e.preventDefault(); e.stopPropagation(); dragMoved = false; return; }
    var card = e.target.closest('.card');
    if (card && !card.classList.contains('is-front') && !e.target.closest('a')) {
      var i = +card.getAttribute('data-i');
      var a = ((i * STEP + shownRot) % 360 + 540) % 360 - 180;
      snapDrag(); dragRot -= Math.round(a / STEP) * STEP;
    }
  }, true);
  carousel.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  });
  $$('.arrow').forEach(function (b) {
    b.addEventListener('click', function () { step(+b.getAttribute('data-dir')); });
  });

  // Hover tilt on the front card (mouse only)
  if (canHover && !reduceMotion) {
    cards.forEach(function (card) {
      var inner = card.querySelector('.card__inner');
      card.addEventListener('pointermove', function (e) {
        if (!card.classList.contains('is-front') || dragging) return;
        var r = inner.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        inner.style.setProperty('--ry', (x * 14).toFixed(2) + 'deg');
        inner.style.setProperty('--rx', (-y * 10).toFixed(2) + 'deg');
      });
      card.addEventListener('pointerleave', function () {
        inner.style.setProperty('--ry', '0deg');
        inner.style.setProperty('--rx', '0deg');
      });
    });
  }

  layoutRing();
  window.addEventListener('resize', layoutRing);
  roomsScroll();
  shownRot = scrollRot;
  ringLoop();

  /* =========================================================
     Reveals + parallax (GSAP ScrollTrigger)
     ========================================================= */
  if (hasGsap && !reduceMotion) {
    var gsap = window.gsap;
    $$('[data-reveal]').forEach(function (el) {
      gsap.from(el.children.length ? el.children : el, {
        y: 34, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: 0.09,
        scrollTrigger: { trigger: el, start: 'top 86%', once: true }
      });
    });
    $$('[data-parallax]').forEach(function (img) {
      var amt = parseFloat(img.getAttribute('data-parallax')) || 10;
      gsap.fromTo(img, { yPercent: -amt / 2 }, {
        yPercent: amt / 2, ease: 'none',
        scrollTrigger: { trigger: img.parentNode, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
    $$('.breakfast__item').forEach(function (fig, i) {
      gsap.from(fig, {
        y: 60 + i * 20, opacity: 0, duration: 1.3, ease: 'power3.out',
        scrollTrigger: { trigger: fig, start: 'top 92%', once: true }
      });
    });
    // Images load lazily; refresh trigger positions once things settle
    window.addEventListener('load', function () { window.ScrollTrigger.refresh(); });
  }

  /* ---------------- Phone book bar: hide while the big CTA is on screen ---------------- */
  var bookbar = $('.bookbar');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { bookbar.classList.toggle('is-hidden', en.isIntersecting); });
    }, { threshold: 0.25 }).observe($('.cta'));
  }

  onScroll();
})();
