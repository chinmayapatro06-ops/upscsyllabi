/* =============================================
   PARTICLE GLOBE — Hero
   ============================================= */
(function () {
  const c = document.getElementById('globeCanvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  let pts = [];
  let mouse = { x: -9999, y: -9999 };
  let rotY = 0;
  let rotX = 0.3;

  function resize() {
    const h = document.getElementById('hero');
    if (!h) return;
    c.width = h.offsetWidth;
    c.height = h.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // Fibonacci sphere points
  var N = 500;
  var phi = Math.PI * (3 - Math.sqrt(5));
  for (var i = 0; i < N; i++) {
    var y = 1 - (i / (N - 1)) * 2;
    var r = Math.sqrt(Math.max(0, 1 - y * y));
    var th = phi * i;
    pts.push({ x: Math.cos(th) * r, y: y, z: Math.sin(th) * r });
  }

  function rotate(p, ry, rx) {
    var x = p.x, y = p.y, z = p.z;
    var cy = Math.cos(ry), sy = Math.sin(ry);
    var x1 = x * cy - z * sy, z1 = x * sy + z * cy;
    var cx = Math.cos(rx), sx = Math.sin(rx);
    var y1 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;
    return { x: x1, y: y1, z: z2 };
  }

  function project(p, cx, cy, rad) {
    var sc = rad / (2.2 + p.z);
    return { x: cx + p.x * sc, y: cy + p.y * sc, s: sc / rad, z: p.z };
  }

  var heroEl = document.getElementById('hero');
  if (heroEl) {
    heroEl.addEventListener('mousemove', function (e) {
      var rect = c.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });
    heroEl.addEventListener('mouseleave', function () {
      mouse.x = -9999;
      mouse.y = -9999;
    });
  }

  function draw() {
    ctx.clearRect(0, 0, c.width, c.height);
    var cx = c.width / 2;
    var cy = c.height / 2;
    var rad = Math.min(c.width, c.height) * 0.28;

    if (mouse.x > 0) {
      var dx = (mouse.x - cx) / cx;
      var dy = (mouse.y - cy) / cy;
      rotY += dx * 0.004;
      rotX = 0.3 + dy * 0.3;
    }
    rotY += 0.003;

    var projected = [];
    for (var i = 0; i < pts.length; i++) {
      var r = rotate(pts[i], rotY, rotX);
      if (r.z > -0.5) {
        var pr = project(r, cx, cy, rad);
        projected.push(pr);
      }
    }

    // Draw connections
    for (var i = 0; i < projected.length; i++) {
      for (var j = i + 1; j < projected.length; j++) {
        var ddx = projected[i].x - projected[j].x;
        var ddy = projected[i].y - projected[j].y;
        var d = ddx * ddx + ddy * ddy;
        if (d < 2500) {
          var a = 0.04 * (1 - d / 2500) * Math.min(projected[i].s, projected[j].s) * 4;
          ctx.beginPath();
          ctx.moveTo(projected[i].x, projected[i].y);
          ctx.lineTo(projected[j].x, projected[j].y);
          ctx.strokeStyle = 'rgba(42,139,110,' + a + ')';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    // Draw points
    for (var i = 0; i < projected.length; i++) {
      var p = projected[i];
      var a = 0.15 + p.s * 0.7;
      var sz = Math.max(0.5, p.s * 2.5);
      ctx.beginPath();
      ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(201,168,76,' + a + ')';
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }
  draw();
})();

/* =============================================
   RADIAL SYLLABUS CHART
   ============================================= */
(function () {
  var c = document.getElementById('radialCanvas');
  if (!c) return;
  var ctx = c.getContext('2d');
  var tip = document.getElementById('radialTip');
  var dpr = window.devicePixelRatio || 1;
  var W = 700, H = 700;
  c.width = W * dpr;
  c.height = H * dpr;
  c.style.width = W + 'px';
  c.style.height = H + 'px';
  ctx.scale(dpr, dpr);
  var cx = W / 2, cy = H / 2;

  var papers = [
    { name: 'Prelims GS-I', t: 7, color: '#8a7a4c', geo: false },
    { name: 'Prelims CSAT', t: 6, color: '#7a6a3c', geo: false },
    { name: 'Qualifying Lang', t: 2, color: '#3a5a4c', geo: false },
    { name: 'Essay', t: 1, color: '#5aaa8a', geo: false },
    { name: 'GS-I Heritage', t: 12, color: '#2a8b6e', geo: false },
    { name: 'GS-II Polity', t: 20, color: '#30a07a', geo: false },
    { name: 'GS-III Tech/Eco', t: 20, color: '#36b586', geo: false },
    { name: 'GS-IV Ethics', t: 8, color: '#3cc992', geo: false },
    { name: 'Geo Paper I', t: 10, color: '#c9a84c', geo: true },
    { name: 'Geo Paper II', t: 10, color: '#d4b85c', geo: true }
  ];
  var total = 0;
  for (var i = 0; i < papers.length; i++) total += papers[i].t;

  var arcs = [];
  var angle = -Math.PI / 2;
  for (var i = 0; i < papers.length; i++) {
    var sweep = (papers[i].t / total) * Math.PI * 2;
    arcs.push({
      name: papers[i].name, t: papers[i].t, color: papers[i].color, geo: papers[i].geo,
      start: angle, end: angle + sweep, sweep: sweep
    });
    angle += sweep;
  }

  var innerR = 80, midR = 140, outerR = 220, gap = 0.012;
  var hoveredArc = null;
  var animProgress = 0;
  var started = false;

  function pointInArc(mx, my, arc, r1, r2) {
    var dx = mx - cx, dy = my - cy;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < r1 || dist > r2) return false;
    var a = Math.atan2(dy, dx);
    if (a < -Math.PI / 2) a += Math.PI * 2;
    return a >= arc.start + gap && a <= arc.end - gap;
  }

  c.addEventListener('mousemove', function (e) {
    var rect = c.getBoundingClientRect();
    var scaleX = W / rect.width;
    var mx = (e.clientX - rect.left) * scaleX;
    var my = (e.clientY - rect.top) * scaleX;

    hoveredArc = null;
    for (var i = 0; i < arcs.length; i++) {
      if (pointInArc(mx, my, arcs[i], innerR, outerR)) { hoveredArc = arcs[i]; break; }
    }

    if (hoveredArc) {
      tip.innerHTML = '<div style="font-family:Space Grotesk;font-weight:600;font-size:13px;color:' + hoveredArc.color + '">' + hoveredArc.name + '</div><div style="color:#6a7068;font-size:11px;margin-top:4px">' + hoveredArc.t + ' topic areas' + (hoveredArc.geo ? ' &middot; Geography Optional' : '') + '</div>';
      tip.classList.add('show');
      tip.style.left = (e.clientX - c.getBoundingClientRect().left + 16) + 'px';
      tip.style.top = (e.clientY - c.getBoundingClientRect().top - 10) + 'px';
      c.style.cursor = 'pointer';
    } else {
      tip.classList.remove('show');
      c.style.cursor = 'default';
    }
  });

  c.addEventListener('mouseleave', function () {
    tip.classList.remove('show');
    hoveredArc = null;
  });

  function drawChart() {
    ctx.clearRect(0, 0, W, H);
    var prog = Math.min(1, animProgress);

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, innerR - 10, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(13,20,17,0.9)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(42,139,110,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 16px "Space Grotesk"';
    ctx.fillStyle = '#e8e2d4';
    ctx.fillText('UPSC CSE', cx, cy - 10);
    ctx.font = '400 11px "DM Sans"';
    ctx.fillStyle = '#6a7068';
    ctx.fillText(total + ' topic areas', cx, cy + 10);

    for (var i = 0; i < arcs.length; i++) {
      var a = arcs[i];
      var drawEnd = a.start + a.sweep * prog;
      var isHov = hoveredArc === a;

      // Inner ring
      ctx.beginPath();
      ctx.arc(cx, cy, innerR, a.start + gap, drawEnd - gap);
      ctx.arc(cx, cy, midR - 4, drawEnd - gap, a.start + gap, true);
      ctx.closePath();
      ctx.fillStyle = isHov ? a.color : a.color + '88';
      ctx.fill();

      // Outer ring
      ctx.beginPath();
      ctx.arc(cx, cy, midR + 4, a.start + gap, drawEnd - gap);
      ctx.arc(cx, cy, outerR, drawEnd - gap, a.start + gap, true);
      ctx.closePath();
      ctx.fillStyle = isHov ? a.color : a.color + '66';
      ctx.fill();

      // Geo glow pulse
      if (a.geo && prog > 0.8) {
        ctx.beginPath();
        ctx.arc(cx, cy, outerR + 6, a.start + gap, drawEnd - gap);
        ctx.arc(cx, cy, outerR + 12, drawEnd - gap, a.start + gap, true);
        ctx.closePath();
        var glowA = 0.15 + Math.sin(Date.now() / 800) * 0.1;
        ctx.fillStyle = 'rgba(201,168,76,' + glowA + ')';
        ctx.fill();
      }

      // Labels
      if (prog > 0.95) {
        var labelR = outerR + 22;
        var midA = (a.start + a.end) / 2;
        var lx = cx + Math.cos(midA) * labelR;
        var ly = cy + Math.sin(midA) * labelR;
        ctx.textAlign = (midA > Math.PI / 2 && midA < Math.PI * 1.5) ? 'right' : 'left';
        ctx.textBaseline = 'middle';
        ctx.font = (isHov ? '600 ' : '400 ') + '10px "Space Grotesk"';
        ctx.fillStyle = isHov ? a.color : '#8a9088';
        var shortName = a.name.length > 14 ? a.name.slice(0, 13) + '\u2026' : a.name;
        ctx.fillText(shortName, lx, ly);
      }
    }

    if (animProgress < 1) {
      animProgress += 0.018;
    }
    requestAnimationFrame(drawChart);
  }

  var obs = new IntersectionObserver(function (entries) {
    if (entries[0].isIntersecting && !started) {
      started = true;
      drawChart();
    }
  }, { threshold: 0.3 });
  obs.observe(c);
})();

/* =============================================
   SCROLL REVEAL
   ============================================= */
(function () {
  var revealObs = new IntersectionObserver(function (entries) {
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].isIntersecting) entries[i].target.classList.add('visible');
    }
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

  var els = document.querySelectorAll('.reveal');
  for (var i = 0; i < els.length; i++) revealObs.observe(els[i]);
})();

/* =============================================
   ACCORDION
   ============================================= */
function toggleAcc(header) {
  var body = header.nextElementSibling;
  var isOpen = body.classList.contains('open');
  var parent = header.closest('section');
  var openBodies = parent.querySelectorAll('.acc-body.open');
  for (var i = 0; i < openBodies.length; i++) {
    openBodies[i].classList.remove('open');
    openBodies[i].previousElementSibling.classList.remove('active');
  }
  if (!isOpen) {
    body.classList.add('open');
    header.classList.add('active');
  }
}

/* =============================================
   NAVBAR
   ============================================= */
(function () {
  var navbar = document.getElementById('navbar');
  var secIds = ['structure', 'syllabus-map', 'prelims', 'mains', 'geography'];
  var navLinks = document.querySelectorAll('.nav-link[data-sec]');

  window.addEventListener('scroll', function () {
    var y = window.scrollY;
    navbar.style.background = y > 50 ? 'rgba(7,11,9,0.88)' : 'transparent';
    navbar.style.backdropFilter = y > 50 ? 'blur(14px)' : 'none';
    navbar.style.borderBottom = y > 50 ? '1px solid rgba(26,40,32,0.5)' : 'none';

    var btt = document.getElementById('backToTop');
    btt.style.opacity = y > 600 ? '1' : '0';
    btt.style.pointerEvents = y > 600 ? 'all' : 'none';
  });

  var secObs = new IntersectionObserver(function (entries) {
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].isIntersecting) {
        var id = entries[i].target.id;
        for (var j = 0; j < navLinks.length; j++) {
          navLinks[j].classList.toggle('active', navLinks[j].dataset.sec === id);
        }
      }
    }
  }, { threshold: 0.2 });

  for (var i = 0; i < secIds.length; i++) {
    var el = document.getElementById(secIds[i]);
    if (el) secObs.observe(el);
  }
})();

function scrollTo(sel) {
  var el = document.querySelector(sel);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

/* =============================================
   MOBILE MENU
   ============================================= */
var menuToggle = document.getElementById('menuToggle');
var mobileMenu = document.getElementById('mobileMenu');
var menuOpen = false;

menuToggle.addEventListener('click', function () {
  menuOpen = !menuOpen;
  mobileMenu.style.opacity = menuOpen ? '1' : '0';
  mobileMenu.style.pointerEvents = menuOpen ? 'all' : 'none';
  menuToggle.innerHTML = menuOpen ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>';
});

function closeMobile() {
  menuOpen = false;
  mobileMenu.style.opacity = '0';
  mobileMenu.style.pointerEvents = 'none';
  menuToggle.innerHTML = '<i class="fa-solid fa-bars"></i>';
}

/* =============================================
   SEARCH
   ============================================= */
var searchBtn = document.getElementById('searchBtn');
var searchInput = document.getElementById('searchInput');
var searchOpen = false;

searchBtn.addEventListener('click', function () {
  searchOpen = !searchOpen;
  if (searchOpen) {
    searchInput.classList.remove('collapsed');
    searchInput.classList.add('expanded');
    searchInput.focus();
  } else {
    searchInput.classList.add('collapsed');
    searchInput.classList.remove('expanded');
    searchInput.value = '';
    filterTopics('');
  }
});

searchInput.addEventListener('input', function (e) {
  filterTopics(e.target.value.toLowerCase());
});

function filterTopics(q) {
  var cards = document.querySelectorAll('[data-search]');
  for (var i = 0; i < cards.length; i++) {
    if (!q) { cards[i].style.display = ''; continue; }
    var match = cards[i].dataset.search.indexOf(q) !== -1;
    cards[i].style.display = match ? '' : 'none';
    if (match) {
      var body = cards[i].querySelector('.acc-body');
      var header = cards[i].querySelector('.acc-header');
      if (body && !body.classList.contains('open')) {
        body.classList.add('open');
        if (header) header.classList.add('active');
      }
    }
  }
  var items = document.querySelectorAll('.topic-item, .geo-topic');
  for (var i = 0; i < items.length; i++) {
    if (!q) { items[i].style.display = ''; continue; }
    items[i].style.display = items[i].textContent.toLowerCase().indexOf(q) !== -1 ? '' : 'none';
  }
}

/* =============================================
   PROGRESS RINGS
   ============================================= */
(function () {
  var grid = document.getElementById('progressGrid');
  if (!grid) return;
  var papers = [
    { name: 'Prelims I', color: '#8a7a4c' },
    { name: 'Prelims II', color: '#7a6a3c' },
    { name: 'Essay', color: '#5aaa8a' },
    { name: 'GS-I', color: '#2a8b6e' },
    { name: 'GS-II', color: '#30a07a' },
    { name: 'GS-III', color: '#36b586' },
    { name: 'GS-IV', color: '#3cc992' },
    { name: 'Geo I', color: '#c9a84c' },
    { name: 'Geo II', color: '#d4b85c' },
    { name: 'Interview', color: '#6a7068' }
  ];

  var saved = {};
  try { saved = JSON.parse(localStorage.getItem('upsc-progress') || '{}'); } catch (e) {}

  for (var i = 0; i < papers.length; i++) {
    (function (idx) {
      var p = papers[idx];
      var pct = saved[p.name] || 0;
      var circ = 2 * Math.PI * 36;
      var offset = circ * (1 - pct / 100);

      var div = document.createElement('div');
      div.className = 'flex flex-col items-center gap-3 cursor-pointer group';
      div.innerHTML =
        '<div class="relative">' +
        '<svg width="90" height="90" viewBox="0 0 90 90" class="transform -rotate-90">' +
        '<circle cx="45" cy="45" r="36" fill="none" class="ring-track" stroke-width="5"/>' +
        '<circle cx="45" cy="45" r="36" fill="none" stroke="' + p.color + '" stroke-width="5" stroke-linecap="round" stroke-dasharray="' + circ + '" stroke-dashoffset="' + offset + '" class="ring-fill" data-idx="' + idx + '"/>' +
        '</svg>' +
        '<span class="absolute inset-0 flex items-center justify-center font-display font-bold text-sm" id="pct-' + idx + '">' + pct + '%</span>' +
        '</div>' +
        '<span class="font-display text-xs font-medium text-muted group-hover:text-fg transition-colors text-center">' + p.name + '</span>';

      div.addEventListener('click', function () {
        var cur = saved[p.name] || 0;
        var next = cur >= 100 ? 0 : cur + 10;
        saved[p.name] = next;
        try { localStorage.setItem('upsc-progress', JSON.stringify(saved)); } catch (e) {}
        var newOffset = circ * (1 - next / 100);
        div.querySelector('.ring-fill').style.strokeDashoffset = newOffset;
        document.getElementById('pct-' + idx).textContent = next + '%';
        if (next === 100) showToast('"' + p.name + '" marked as complete!');
      });
      grid.appendChild(div);
    })(i);
  }
})();

/* =============================================
   TOAST
   ============================================= */
function showToast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function () { t.classList.remove('show'); }, 3500);
}

/* =============================================
   HERO BLOB MOUSE
   ============================================= */
(function () {
  var hero = document.getElementById('hero');
  var b1 = document.getElementById('blob1');
  var b2 = document.getElementById('blob2');
  if (!hero || !b1 || !b2) return;
  hero.addEventListener('mousemove', function (e) {
    var r = hero.getBoundingClientRect();
    var x = (e.clientX - r.left) / r.width;
    var y = (e.clientY - r.top) / r.height;
    b1.style.transform = 'translate(' + (x * 35) + 'px,' + (y * 35) + 'px)';
    b2.style.transform = 'translate(' + (-x * 25) + 'px,' + (-y * 25) + 'px)';
  });
})();

/* =============================================
   CARD GLOW FOLLOW
   ============================================= */
(function () {
  var cards = document.querySelectorAll('.card-glow');
  for (var i = 0; i < cards.length; i++) {
    cards[i].addEventListener('mousemove', function (e) {
      var r = this.getBoundingClientRect();
      this.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      this.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  }
})();

/* =============================================
   BACK TO TOP
   ============================================= */
document.getElementById('backToTop').addEventListener('click', function () {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* =============================================
   KEYBOARD: Escape
   ============================================= */
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    if (searchOpen) {
      searchOpen = false;
      searchInput.classList.add('collapsed');
      searchInput.classList.remove('expanded');
      searchInput.value = '';
      filterTopics('');
    }
    if (menuOpen) closeMobile();
  }
});