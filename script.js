const ocean = document.getElementById('ocean');
const hint = document.getElementById('hint');
const heartEl = document.getElementById('heart');
const heartMsgEl = heartEl.querySelector('.heart-message');

// EDIT THIS: the day you two got together — new Date(year, monthIndex, day)
// monthIndex is 0-based (0 = January, 6 = July, 11 = December)
const TOGETHER_SINCE = new Date(2026, 5, 18);

// EDIT THESE: the lines shown when Eva & Ted meet. The first one is always shown
// on the first meeting; the rest rotate in a shuffled order. "{days}" is
// replaced with the number of days together.
const MESSAGES = [
  'In the deepest dark, this is what still glows.',
  'Two lights, one ocean.',
  'Of all the currents, mine always drifts back to you.',
  'You make the abyss feel like home.',
  'Glowing a little brighter because you\'re here.',
  'Every tide brings me back to you.',
  '{days} days, and I\'d still cross any ocean to find you.',
];

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let trails = null;
let daysTogether = 0;
const pointer = { x: -999, y: -999, active: false, lastMove: 0 };

// Element sizes only change on resize, so cache them per "size epoch" instead of
// reading offsetWidth/offsetHeight (a forced layout) every animation frame.
let sizeEpoch = 0;
function cachedSize(obj) {
  if (obj._epoch !== sizeEpoch) {
    obj._w = obj.el.offsetWidth;
    obj._h = obj.el.offsetHeight;
    obj._epoch = sizeEpoch;
  }
}

const bounds = { width: 0, height: 0 };
function updateBounds() {
  bounds.width = ocean.clientWidth;
  bounds.height = ocean.clientHeight;
  sizeEpoch++;
}
window.addEventListener('resize', updateBounds);
updateBounds();

function rand(min, max) {
  return min + Math.random() * (max - min);
}
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let msgOrder = [];
let firstUnion = true;
function nextMessage() {
  let msg;
  if (firstUnion) {
    firstUnion = false;
    msg = MESSAGES[0];
  } else {
    if (!msgOrder.length) msgOrder = MESSAGES.slice(1).sort(() => Math.random() - 0.5);
    msg = msgOrder.pop() || MESSAGES[0];
  }
  return msg.replace('{days}', daysTogether.toLocaleString());
}

function createParticles(count) {
  const container = document.getElementById('particles');
  const colors = ['#7dd3fc', '#f9a8d4', '#eafcff', '#a5f3fc'];
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = rand(2, 5);
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.left = `${rand(0, 100)}%`;
    p.style.setProperty('--pcolor', colors[Math.floor(rand(0, colors.length))]);
    p.style.setProperty('--dur', `${rand(9, 20)}s`);
    p.style.setProperty('--delay', `${rand(-20, 0)}s`);
    p.style.setProperty('--drift', `${rand(-40, 40)}px`);
    p.style.setProperty('--op', rand(0.4, 0.9));
    container.appendChild(p);
  }
}

function createGlowBlobs(count) {
  const container = document.getElementById('glowBlobs');
  const colors = ['#7dd3fc', '#f9a8d4', '#38bdf8', '#2dd4bf', '#5eead4'];
  for (let i = 0; i < count; i++) {
    const b = document.createElement('div');
    b.className = 'blob';
    const size = rand(140, 300);
    b.style.width = `${size}px`;
    b.style.height = `${size}px`;
    b.style.left = `${rand(0, 90)}%`;
    b.style.top = `${rand(0, 90)}%`;
    b.style.background = colors[Math.floor(rand(0, colors.length))];
    b.style.setProperty('--bx', `${rand(-70, 70)}px`);
    b.style.setProperty('--by', `${rand(-50, 50)}px`);
    b.style.setProperty('--op-lo', rand(0.12, 0.2));
    b.style.setProperty('--op-hi', rand(0.32, 0.48));
    b.style.animationDuration = `${rand(22, 42)}s, ${rand(6, 12)}s`;
    container.appendChild(b);
  }
}

function createCreatures(fishCount) {
  const container = document.getElementById('creatures');

  function spawn(rtl) {
    const wrap = document.createElement('div');
    wrap.className = 'creature';
    const dur = rand(16, 30);
    const delay = rand(-dur, 0);
    wrap.style.top = `${rand(8, 78)}%`;
    if (rtl) {
      wrap.style.right = '-10%';
      wrap.style.setProperty('--travel', '-125vw');
    } else {
      wrap.style.left = '-10%';
      wrap.style.setProperty('--travel', '125vw');
    }
    wrap.style.animationDuration = `${dur}s`;
    wrap.style.animationDelay = `${delay}s`;

    const body = document.createElement('div');
    body.className = 'fish';
    body.style.setProperty('--flip', rtl ? '-1' : '1');
    body.style.animationDuration = `${rand(2.2, 3.4)}s`;
    body.style.animationDelay = `${rand(0, 2)}s`;
    wrap.appendChild(body);
    container.appendChild(wrap);
  }

  for (let i = 0; i < fishCount; i++) spawn(Math.random() < 0.5);
}

// All update(k) methods take k = elapsed time in 60fps frames, so motion runs at
// the same speed on 60Hz and 120Hz screens.

// One anglerfish that slowly wanders the background (non-interactive).
class Angler {
  constructor(el) {
    this.el = el;
    this.body = el.querySelector('.angler-body');
    this.x = bounds.width * 0.6;
    this.y = bounds.height * 0.4;
    this.vx = -0.3;
    this.vy = 0;
    this.wobble = rand(0, Math.PI * 2);
    this.nextTargetAt = 0;
    this.target = { x: this.x, y: this.y };
    this.facing = 1; // SVG is drawn facing left; 1 = left, -1 = right
    this.pickTarget();
  }

  pickTarget() {
    const m = 90;
    this.target.x = rand(m, bounds.width - m);
    this.target.y = rand(bounds.height * 0.12, bounds.height * 0.72);
    this.nextTargetAt = performance.now() + rand(7000, 13000);
  }

  update(k) {
    if (performance.now() > this.nextTargetAt) this.pickTarget();
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < 45) this.pickTarget();

    this.vx += (dx / dist) * 0.006 * k;
    this.vy += (dy / dist) * 0.006 * k;
    this.wobble += 0.01 * k;
    this.vy += Math.sin(this.wobble) * 0.004 * k;
    const damp = Math.pow(0.98, k);
    this.vx *= damp;
    this.vy *= damp;

    const sp = Math.hypot(this.vx, this.vy);
    const max = 0.42;
    if (sp > max) {
      this.vx = (this.vx / sp) * max;
      this.vy = (this.vy / sp) * max;
    }

    this.x += this.vx * k;
    this.y += this.vy * k;

    if (this.vx > 0.03) this.facing = -1;
    else if (this.vx < -0.03) this.facing = 1;

    this.render();
  }

  render() {
    cachedSize(this);
    const tilt = clamp(this.vy * 5, -8, 8) * -this.facing;
    this.el.style.transform = `translate(${this.x - this._w / 2}px, ${this.y - this._h / 2}px) rotate(${tilt}deg)`;
    this.body.style.setProperty('--flip', this.facing);
  }
}

// A little octopus that swims by jet propulsion: it darts in a burst (mantle
// first, arms trailing) then coasts to a near stop before the next jet.
class Octopus {
  constructor(el) {
    this.el = el;
    this.body = el.querySelector('.octopus-body');
    this.x = bounds.width * 0.3;
    this.y = bounds.height * 0.6;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;      // display rotation (deg); 0 = arms hanging down
    this.nextJetAt = 0;
  }

  jet() {
    // aim at a fresh point, biased inward so it doesn't hug the edges
    const mx = 110;
    const tx = rand(mx, bounds.width - mx);
    const ty = rand(bounds.height * 0.18, bounds.height * 0.82);
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy) || 1;
    const power = REDUCED ? rand(1.2, 1.8) : rand(4.5, 6.5);
    this.vx += (dx / d) * power;
    this.vy += (dy / d) * power;
    this.nextJetAt = performance.now() + rand(1700, 3800);

    // fire the streamline squash animation (retrigger by reflow)
    if (this.body && !REDUCED) {
      this.body.classList.remove('jet');
      void this.body.offsetWidth;
      this.body.classList.add('jet');
    }
  }

  update(k) {
    if (performance.now() > this.nextJetAt) this.jet();

    // glide: firm drag so each burst darts, then coasts to a rest before the next jet
    const damp = Math.pow(0.94, k);
    this.vx *= damp;
    this.vy *= damp;
    this.x += this.vx * k;
    this.y += this.vy * k;

    // soft walls: bounce gently off the edges
    const m = 30;
    if (this.x < m) { this.x = m; this.vx = Math.abs(this.vx) * 0.5; }
    else if (this.x > bounds.width - m) { this.x = bounds.width - m; this.vx = -Math.abs(this.vx) * 0.5; }
    if (this.y < m) { this.y = m; this.vy = Math.abs(this.vy) * 0.5; }
    else if (this.y > bounds.height - m) { this.y = bounds.height - m; this.vy = -Math.abs(this.vy) * 0.5; }

    // orient mantle-first while moving (arms trail); right itself when resting
    const sp = Math.hypot(this.vx, this.vy);
    let desired = 0;
    if (sp > 0.35) desired = (Math.atan2(this.vy, this.vx) * 180) / Math.PI + 90;
    const diff = ((desired - this.angle + 540) % 360) - 180;
    this.angle += diff * (1 - Math.pow(1 - 0.12, k));

    this.render();
  }

  render() {
    cachedSize(this);
    this.el.style.transform =
      `translate(${(this.x - this._w / 2).toFixed(1)}px, ${(this.y - this._h / 2).toFixed(1)}px) rotate(${this.angle.toFixed(1)}deg)`;
  }
}

function createBgJellies(count) {
  const container = document.getElementById('bgJellies');
  const colors = ['#7dd3fc', '#f9a8d4', '#5eead4'];
  for (let i = 0; i < count; i++) {
    const j = document.createElement('div');
    j.className = 'bg-jelly';
    const size = rand(30, 70);
    j.style.width = `${size}px`;
    j.style.height = `${size * 0.85}px`;
    j.style.left = `${rand(0, 95)}%`;
    j.style.top = `${rand(5, 85)}%`;
    j.style.background = `radial-gradient(circle at 40% 30%, #fff, ${colors[Math.floor(rand(0, colors.length))]} 55%, transparent 80%)`;
    j.style.setProperty('--bx', `${rand(-90, 90)}px`);
    j.style.setProperty('--by', `${rand(-40, 40)}px`);
    j.style.setProperty('--op-lo', rand(0.08, 0.14));
    j.style.setProperty('--op-hi', rand(0.2, 0.32));
    j.style.animationDuration = `${rand(30, 60)}s, ${rand(4, 8)}s`;
    container.appendChild(j);
  }
}

function spawnBurst(x, y, color, count, distance, size, duration) {
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + rand(-0.3, 0.3);
    const dist = distance * rand(0.6, 1.2);
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    const spark = document.createElement('div');
    spark.className = 'spark';
    spark.style.left = `${x}px`;
    spark.style.top = `${y}px`;
    spark.style.width = `${size}px`;
    spark.style.height = `${size}px`;
    spark.style.color = color;
    spark.style.setProperty('--dx', `${dx}px`);
    spark.style.setProperty('--dy', `${dy}px`);
    spark.style.animationDuration = `${duration}ms`;
    ocean.appendChild(spark);
    setTimeout(() => spark.remove(), duration + 50);
  }
}

// Build one tentacle as a chain of nested segments. Each segment rotates a
// little around its own top, and because segments are nested, those rotations
// compound down the chain into a soft, wobbly, whip-like curve that stays
// attached at the base point (x, y).
function buildStrand(container, opts) {
  const { x, y, segs, segH, baseW, dur, amp, arm } = opts;
  const strand = document.createElement('div');
  strand.className = 'strand' + (arm ? ' strand--arm' : '');
  strand.style.left = `${x.toFixed(2)}px`;
  strand.style.top = `${y.toFixed(2)}px`;

  let parent = strand;
  for (let s = 0; s < segs; s++) {
    const t = segs > 1 ? s / (segs - 1) : 0;         // 0 at base .. 1 at tip
    const seg = document.createElement('div');
    seg.className = 'tseg';
    const width = baseW * (1 - 0.72 * t);            // taper toward the tip
    seg.style.width = `${width.toFixed(2)}px`;
    seg.style.height = `${segH.toFixed(2)}px`;
    seg.style.marginLeft = `${(-width / 2).toFixed(2)}px`;
    // tip segments sway more than base segments so the whole strand flows
    seg.style.setProperty('--amp', `${(amp * (0.4 + 1.15 * t)).toFixed(1)}deg`);
    seg.style.animationDuration = `${dur.toFixed(2)}s`;
    // negative, increasing delay per segment -> a wave travels down the strand
    seg.style.animationDelay = `${(-dur * 0.13 * s).toFixed(2)}s`;
    parent.appendChild(seg);
    parent = seg;
  }
  container.appendChild(strand);
}

class Jellyfish {
  constructor(el, name, glowColor, x, y) {
    this.el = el;
    this.name = name;
    this.glowColor = glowColor;
    this.partner = null;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.target = { x, y };
    this.wobble = rand(0, Math.PI * 2);
    this.nextTargetAt = 0;
    this.dragging = false;
    this.locked = false;
    this.px = x;
    this.py = y;
    this.lastBubbleAt = 0;
    this.bubbleGap = rand(420, 820);
    this.bubbleCol = glowColor === '#f9a8d4' ? 'rgba(249, 168, 212, 0.55)' : 'rgba(125, 211, 252, 0.55)';
    this.buildDOM();
    this.render();
  }

  maybeEmitBubble() {
    if (this.locked) return;
    const now = performance.now();
    const moved = Math.hypot(this.x - this.px, this.y - this.py);
    this.px = this.x;
    this.py = this.y;
    if (now - this.lastBubbleAt > this.bubbleGap && (moved > 0.4 || this.dragging)) {
      this.lastBubbleAt = now;
      this.bubbleGap = rand(420, 820);
      this.emitBubble();
    }
  }

  emitBubble() {
    if (!trails) return;
    cachedSize(this);
    const w = this._w;
    const h = this._h;
    const b = document.createElement('div');
    b.className = 'bubble';
    const size = rand(4, 9);
    b.style.width = `${size}px`;
    b.style.height = `${size}px`;
    b.style.left = `${this.x + rand(-w * 0.22, w * 0.22)}px`;
    b.style.top = `${this.y - h * 0.05}px`;
    b.style.setProperty('--brise', `${-rand(60, 115)}px`);
    b.style.setProperty('--bdrift', `${rand(-14, 14)}px`);
    b.style.setProperty('--bdur', `${rand(2.2, 3.4)}s`);
    b.style.setProperty('--bop', rand(0.35, 0.6));
    b.style.setProperty('--bcol', this.bubbleCol);
    trails.appendChild(b);
    b.addEventListener('animationend', () => b.remove());
  }

  buildDOM() {
    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = this.name;

    const head = document.createElement('div');
    head.className = 'head';

    const bell = document.createElement('div');
    bell.className = 'bell';
    const core = document.createElement('div');
    core.className = 'core';
    bell.appendChild(core);

    const frill = document.createElement('div');
    frill.className = 'frill';

    const tentacles = document.createElement('div');
    tentacles.className = 'tentacles';

    // tentacles are built in pixels, so remember the width they were built for
    const w = this.el.offsetWidth || 110;
    this.builtW = w;
    const bellH = w * 0.66;

    // thin outer tentacles emerging from around the bell rim
    const count = 9;
    const spread = w * 0.72;
    const startX = w / 2 - spread / 2;
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);              // 0..1 across the rim
      const edge = Math.abs(t - 0.5) * 2;      // 0 center .. 1 edges
      const x = startX + (i + 0.5) * (spread / count) + rand(-2, 2);
      buildStrand(tentacles, {
        x,
        y: bellH * (0.74 + edge * 0.12),       // edge strands hang from lower on the curved rim
        segs: 6,
        segH: w * (0.18 - edge * 0.035) * rand(0.9, 1.1),
        baseW: w * 0.042 * rand(0.85, 1.05),
        dur: rand(2.8, 4.2),
        amp: rand(5, 9),
      });
    }

    // a few thicker central oral arms
    for (let i = 0; i < 3; i++) {
      buildStrand(tentacles, {
        x: w / 2 + (i - 1) * w * 0.07 + rand(-2, 2),
        y: bellH * 0.6,
        segs: 7,
        segH: w * 0.185,
        baseW: w * 0.072 * rand(0.9, 1.1),
        dur: rand(3.2, 4.6),
        amp: rand(7, 11),
        arm: true,
      });
    }

    head.appendChild(bell);
    head.appendChild(frill);
    head.appendChild(tentacles);

    this.el.appendChild(label);
    this.el.appendChild(head);
  }

  // after a resize/rotation the bell rescales via CSS but the pixel-built
  // tentacles don't, so rebuild them for the new width
  rebuild() {
    if (this.el.offsetWidth === this.builtW) return;
    this.el.textContent = '';
    this.buildDOM();
    this._epoch = -1;
    this.render();
  }

  pickNewTarget() {
    const margin = 60;
    // now and then, drift toward the other one — close enough for a shy notice,
    // not close enough to merge
    if (this.partner && Math.random() < 0.3) {
      const ang = rand(0, Math.PI * 2);
      const r = rand(100, 140);
      this.target.x = clamp(this.partner.x + Math.cos(ang) * r, margin, bounds.width - margin);
      this.target.y = clamp(this.partner.y + Math.sin(ang) * r, margin, bounds.height - margin);
      this.nextTargetAt = performance.now() + rand(4000, 8000);
      return;
    }
    this.target.x = rand(margin, bounds.width - margin);
    this.target.y = rand(margin, bounds.height - margin);
    this.nextTargetAt = performance.now() + rand(4000, 8000);
  }

  update(k) {
    if (!this.dragging && !this.locked) {
      if (this.target.x == null || performance.now() > this.nextTargetAt) {
        this.pickNewTarget();
      }
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < 24) this.pickNewTarget();

      this.vx += (dx / dist) * 0.03 * k;
      this.vy += (dy / dist) * 0.03 * k;

      this.wobble += 0.02 * k;
      this.vx += Math.cos(this.wobble) * 0.015 * k;
      this.vy += Math.sin(this.wobble * 1.3) * 0.012 * k;

      const damp = Math.pow(0.96, k);
      this.vx *= damp;
      this.vy *= damp;

      const speed = Math.hypot(this.vx, this.vy);
      const maxSpeed = REDUCED ? 0.45 : 0.9;
      if (speed > maxSpeed) {
        this.vx = (this.vx / speed) * maxSpeed;
        this.vy = (this.vy / speed) * maxSpeed;
      }

      this.x = clamp(this.x + this.vx * k, 40, bounds.width - 40);
      this.y = clamp(this.y + this.vy * k, 40, bounds.height - 40);
    }
    this.render();
    this.maybeEmitBubble();
  }

  render() {
    cachedSize(this);
    const tilt = clamp(this.vx * 8, -16, 16);
    this.el.style.transform = `translate(${this.x - this._w / 2}px, ${this.y - this._h / 2}px) rotate(${tilt}deg)`;
  }
}

function tweenTo(jelly, x2, y2, duration) {
  return new Promise((resolve) => {
    const x1 = jelly.x;
    const y1 = jelly.y;
    const t0 = performance.now();
    function step() {
      const t = clamp((performance.now() - t0) / duration, 0, 1);
      const e = 1 - Math.pow(1 - t, 3);
      jelly.x = x1 + (x2 - x1) * e;
      jelly.y = y1 + (y2 - y1) * e;
      jelly.render();
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    }
    requestAnimationFrame(step);
  });
}

let hintHidden = false;
function hideHint() {
  if (hintHidden) return;
  hintHidden = true;
  hint.classList.add('hidden');
}

function setupDrag(jelly) {
  let startX = 0;
  let startY = 0;
  let offX = 0;
  let offY = 0;
  let moved = false;
  let activeId = null; // the one pointer that owns this drag (ignores 2nd fingers)

  jelly.el.addEventListener('pointerdown', (e) => {
    if (activeId !== null || e.button > 0) return;
    activeId = e.pointerId;
    jelly.dragging = true;
    jelly.el.classList.add('dragging');
    jelly.el.setPointerCapture(e.pointerId);
    startX = e.clientX;
    startY = e.clientY;
    moved = false;
    // keep the grab point under the finger instead of snapping the centre to it
    const r = ocean.getBoundingClientRect();
    offX = jelly.x - (e.clientX - r.left);
    offY = jelly.y - (e.clientY - r.top);
  });

  jelly.el.addEventListener('pointermove', (e) => {
    if (e.pointerId !== activeId) return;
    if (!jelly.dragging || jelly.locked) return;
    if (!moved) {
      if (Math.hypot(e.clientX - startX, e.clientY - startY) <= 4) return; // still a tap
      moved = true;
      hideHint();
    }
    const rect = ocean.getBoundingClientRect();
    jelly.x = clamp(e.clientX - rect.left + offX, 40, bounds.width - 40);
    jelly.y = clamp(e.clientY - rect.top + offY, 40, bounds.height - 40);
  });

  const endDrag = (e) => {
    if (e.pointerId !== activeId) return;
    activeId = null;
    if (!jelly.dragging) return;
    jelly.dragging = false;
    jelly.el.classList.remove('dragging');
    if (jelly.locked) return;
    jelly.pickNewTarget();
    if (!moved) {
      spawnBurst(jelly.x, jelly.y, jelly.glowColor, 7, 30, 5, 500);
    }
  };
  jelly.el.addEventListener('pointerup', endDrag);
  jelly.el.addEventListener('pointercancel', endDrag);
}

let uniting = false;
let unionCooldownUntil = 0;
let lastUnionAt = 0;

function checkUnion(a, b) {
  if (uniting || a.locked || b.locked) return;
  const now = performance.now();
  if (now < unionCooldownUntil) return;
  // keep the heart moment special: when nobody is dragging them, they can only
  // merge on their own once every 40s (drifting close otherwise = a shy notice)
  if (!a.dragging && !b.dragging && now - lastUnionAt < 40000) return;
  const dist = Math.hypot(a.x - b.x, a.y - b.y);
  if (dist < 65) {
    triggerUnion(a, b);
  }
}

async function triggerUnion(a, b) {
  uniting = true;
  hideHint();

  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2;
  a.locked = true;
  b.locked = true;

  await Promise.all([tweenTo(a, midX - 12, midY, 500), tweenTo(b, midX + 12, midY, 500)]);

  a.el.style.transition = 'opacity 0.4s ease';
  b.el.style.transition = 'opacity 0.4s ease';
  a.el.style.opacity = '0';
  b.el.style.opacity = '0';

  await wait(350);

  // keep the heart + message fully on screen even when they meet near an edge
  const half = Math.min(bounds.width * 0.3, 140) + 10;
  const hx = clamp(midX, half, bounds.width - half);
  const hy = clamp(midY, 120, bounds.height - 90);
  heartEl.style.left = `${hx}px`;
  heartEl.style.top = `${hy}px`;
  heartMsgEl.textContent = nextMessage();
  heartEl.classList.add('show');
  spawnBurst(hx, hy, '#f9a8d4', 10, 60, 5, 900);
  spawnBurst(hx, hy, '#7dd3fc', 10, 60, 5, 900);

  await wait(5500); // long enough to actually read the message

  heartEl.classList.remove('show');
  await wait(400);

  // fade back in while gliding apart, instead of reappearing pre-shifted
  a.el.style.transition = 'opacity 0.9s ease';
  b.el.style.transition = 'opacity 0.9s ease';
  a.el.style.opacity = '1';
  b.el.style.opacity = '1';
  await Promise.all([
    tweenTo(a, clamp(a.x - 50, 40, bounds.width - 40), a.y, 900),
    tweenTo(b, clamp(b.x + 50, 40, bounds.width - 40), b.y, 900),
  ]);

  a.locked = false;
  b.locked = false;
  a.pickNewTarget();
  b.pickNewTarget();
  unionCooldownUntil = performance.now() + 8000;
  lastUnionAt = performance.now();
  uniting = false;
}

// --- reactive plankton motes that drift toward the cursor ---
const motes = [];
function createMotes(n) {
  const c = document.getElementById('motes');
  for (let i = 0; i < n; i++) {
    const el = document.createElement('div');
    el.className = 'mote';
    const size = rand(2.5, 5);
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.opacity = rand(0.35, 0.8);
    c.appendChild(el);
    motes.push({
      el,
      x: rand(0, bounds.width),
      y: rand(0, bounds.height),
      vx: rand(-0.15, 0.15),
      vy: rand(-0.15, 0.15),
    });
  }
}

function updateMotes(k) {
  const damp = Math.pow(0.95, k);
  for (const m of motes) {
    m.vx += rand(-0.012, 0.012) * k;
    m.vy += rand(-0.012, 0.012) * k;
    if (pointer.active) {
      const dx = pointer.x - m.x;
      const dy = pointer.y - m.y;
      const d = Math.hypot(dx, dy);
      if (d < 210 && d > 1) {
        const pull = 0.05 * (1 - d / 210) * k;
        m.vx += (dx / d) * pull;
        m.vy += (dy / d) * pull;
      }
    }
    m.vx *= damp;
    m.vy *= damp;
    const sp = Math.hypot(m.vx, m.vy);
    const max = 1.3;
    if (sp > max) {
      m.vx = (m.vx / sp) * max;
      m.vy = (m.vy / sp) * max;
    }
    m.x += m.vx * k;
    m.y += m.vy * k;
    if (m.x < -12) m.x = bounds.width + 12;
    else if (m.x > bounds.width + 12) m.x = -12;
    if (m.y < -12) m.y = bounds.height + 12;
    else if (m.y > bounds.height + 12) m.y = -12;
    m.el.style.transform = `translate(${m.x.toFixed(1)}px, ${m.y.toFixed(1)}px)`;
  }
}

// --- rising heart bubbles on tap ---
function spawnPopHeart(x, y) {
  const heart = document.createElement('div');
  heart.className = 'pop-heart';
  heart.style.left = `${x - 10}px`;
  heart.style.top = `${y - 9}px`;
  heart.style.setProperty('--ps', rand(0.7, 1.3).toFixed(2));
  heart.style.setProperty('--pdrift', `${rand(-22, 22).toFixed(0)}px`);
  ocean.appendChild(heart);
  heart.addEventListener('animationend', () => heart.remove());
}

// --- shy "notice" when Eva & Ted drift close (but not merging) ---
let noticeCooldownUntil = 0;
function checkNotice(a, b) {
  if (uniting || a.locked || b.locked) return;
  if (performance.now() < noticeCooldownUntil) return;
  const dist = Math.hypot(a.x - b.x, a.y - b.y);
  if (dist > 74 && dist < 150) {
    noticeCooldownUntil = performance.now() + 7000;
    a.el.classList.add('noticing');
    b.el.classList.add('noticing');
    spawnPopHeart((a.x + b.x) / 2, (a.y + b.y) / 2 - 12);
    setTimeout(() => {
      a.el.classList.remove('noticing');
      b.el.classList.remove('noticing');
    }, 1600);
  }
}

// Whole calendar days since TOGETHER_SINCE, counted in UTC so a daylight-saving
// change never makes it off by one.
function daysSince(since) {
  const startUTC = Date.UTC(since.getFullYear(), since.getMonth(), since.getDate());
  const n = new Date();
  const todayUTC = Date.UTC(n.getFullYear(), n.getMonth(), n.getDate());
  return Math.max(0, Math.round((todayUTC - startUTC) / 86400000));
}

function initDays() {
  const el = document.getElementById('daysCount');
  if (!el) return;
  daysTogether = daysSince(TOGETHER_SINCE);
  const days = daysTogether;

  if (REDUCED) {
    el.textContent = days.toLocaleString();
  } else {
    // count up once the title has faded in
    el.textContent = '0';
    setTimeout(() => {
      const t0 = performance.now();
      const dur = 1600;
      (function tick() {
        const k = Math.min(1, (performance.now() - t0) / dur);
        el.textContent = Math.round(days * (1 - Math.pow(1 - k, 3))).toLocaleString();
        if (k < 1) requestAnimationFrame(tick);
      })();
    }, 1500);
  }

  // keep it right if the page stays open past midnight
  setInterval(() => {
    const d = daysSince(TOGETHER_SINCE);
    if (d !== daysTogether) {
      daysTogether = d;
      el.textContent = d.toLocaleString();
    }
  }, 60000);

  // little celebration line on monthiversaries and every 100 days
  const s = TOGETHER_SINCE;
  const now = new Date();
  let note = null;
  if (days > 0 && days % 100 === 0) {
    note = `${days.toLocaleString()} days today ✨`;
  } else if (now.getDate() === s.getDate()) {
    const months = (now.getFullYear() - s.getFullYear()) * 12 + now.getMonth() - s.getMonth();
    if (months > 0 && months % 12 === 0) {
      const years = months / 12;
      note = `happy ${years} year${years > 1 ? 's' : ''} 💗`;
    } else if (months > 0) {
      note = `happy ${months} month${months > 1 ? 's' : ''} 💗`;
    }
  }
  if (note) {
    const p = document.createElement('p');
    p.className = 'days milestone';
    p.textContent = note;
    el.closest('.title').appendChild(p);
  }
}

// --- background music: a local audio file (works offline & on GitHub Pages) ---
const MUSIC_SRC = 'assets/music.mp3';
const MUSIC_VOLUME = 0.55; // 0..1

const Music = (() => {
  let audio = null;
  let want = false;
  let fadeTimer = null;
  let onChange = () => {};

  function ensure() {
    if (audio) return;
    audio = new Audio(MUSIC_SRC);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0;
    // keep the button honest if the browser/OS pauses or resumes playback
    audio.addEventListener('play', () => { want = true; onChange(true); });
    audio.addEventListener('pause', () => { want = false; onChange(false); });
  }

  function fadeTo(target, ms) {
    if (fadeTimer) clearInterval(fadeTimer);
    const start = audio.volume;
    const t0 = performance.now();
    fadeTimer = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      audio.volume = start + (target - start) * k;
      if (k >= 1) {
        clearInterval(fadeTimer);
        fadeTimer = null;
        if (target === 0) audio.pause();
      }
    }, 40);
  }

  function toggle() {
    ensure();
    want = !want;
    if (want) {
      const p = audio.play();
      if (p && p.catch) p.catch(() => { want = false; onChange(false); });
      fadeTo(MUSIC_VOLUME, 1400);
    } else {
      fadeTo(0, 700);
    }
    return want;
  }

  return {
    toggle,
    isOn: () => want,
    setListener(fn) { onChange = fn; },
  };
})();

function init() {
  createParticles(REDUCED ? 15 : 50);
  createGlowBlobs(5);
  createBgJellies(5);
  createCreatures(4);
  createMotes(REDUCED ? 0 : 16);
  initDays();
  trails = document.getElementById('trails');
  const cursorGlow = document.getElementById('cursorGlow');
  const soundToggle = document.getElementById('soundToggle');

  window.addEventListener('pointermove', (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = true;
    pointer.lastMove = performance.now();
    cursorGlow.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    cursorGlow.classList.add('active');
  });

  ocean.addEventListener('pointerdown', (e) => {
    pointer.lastMove = performance.now(); // touch taps count as activity too
    if (e.target.closest('.jelly') || e.target.closest('.sound-toggle')) return;
    spawnPopHeart(e.clientX, e.clientY);
  });

  // music button reflects the real playback state
  const setBtn = (on) => {
    soundToggle.classList.toggle('on', on);
    soundToggle.setAttribute('aria-pressed', String(on));
    soundToggle.firstElementChild.textContent = on ? '🔊' : '🔇';
  };
  Music.setListener(setBtn);

  // the music starts with the first touch anywhere (browsers need a gesture);
  // after that, or once the button has been used, only the button controls it
  let musicStarted = false;
  ocean.addEventListener('pointerdown', (e) => {
    if (musicStarted || e.target.closest('.sound-toggle')) return;
    musicStarted = true;
    if (!Music.isOn()) setBtn(Music.toggle());
  }, { capture: true });

  soundToggle.addEventListener('click', () => {
    musicStarted = true;
    setBtn(Music.toggle());
  });

  const angler = new Angler(document.getElementById('anglerFish'));
  const octopus = new Octopus(document.getElementById('octopus'));

  const eva = new Jellyfish(document.getElementById('jelly-eva'), 'Eva', '#f9a8d4', bounds.width * 0.35, bounds.height * 0.5);
  const ted = new Jellyfish(document.getElementById('jelly-ted'), 'Ted', '#7dd3fc', bounds.width * 0.65, bounds.height * 0.45);
  eva.partner = ted;
  ted.partner = eva;
  eva.pickNewTarget();
  ted.pickNewTarget();

  setupDrag(eva);
  setupDrag(ted);

  // resize/rotation: (updateBounds was registered first, so bounds are fresh here)
  let resizeTimer;
  window.addEventListener('resize', () => {
    angler.x = clamp(angler.x, 0, bounds.width);
    angler.y = clamp(angler.y, 0, bounds.height);
    angler.pickTarget();
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      eva.rebuild();
      ted.rebuild();
    }, 200);
  });

  setTimeout(hideHint, 15000);

  let last = 0;
  function loop(now) {
    // k = frames elapsed at 60fps (capped so a backgrounded tab doesn't jump)
    const k = last ? Math.min((now - last) / 16.667, 3) : 1;
    last = now;

    if (pointer.active && now - pointer.lastMove > 1600) {
      pointer.active = false;
      cursorGlow.classList.remove('active');
    }

    // left alone for a while, Eva & Ted slowly find their way to each other
    if (!uniting && !eva.dragging && !ted.dragging &&
        now - pointer.lastMove > 25000 && now - lastUnionAt > 40000) {
      const mx = (eva.x + ted.x) / 2;
      const my = (eva.y + ted.y) / 2;
      eva.target.x = ted.target.x = mx;
      eva.target.y = ted.target.y = my;
      eva.nextTargetAt = ted.nextTargetAt = now + 1000;
    }

    updateMotes(k);
    angler.update(k);
    octopus.update(k);
    eva.update(k);
    ted.update(k);
    checkUnion(eva, ted);
    checkNotice(eva, ted);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

document.addEventListener('DOMContentLoaded', init);
