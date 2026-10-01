// 动效词典 · 原型共享引擎
// 展品是数据驱动的：内容（名字/原理/代码/参数）写在 EXHIBITS 里，三套展厅只负责皮肤。

const IMAGES = Array.from({ length: 8 }, (_, i) => `../assets/web/motion-0${i + 1}.jpg`);

const speedWord = v => (v < 0.07 ? '很慢' : v < 0.13 ? '慢' : v < 0.22 ? '适中' : v < 0.32 ? '快' : '很快');
const forceWord = v => (v < 0.25 ? '轻' : v < 0.6 ? '中' : '强');

const EXHIBITS = {
  magnetic: {
    no: '07',
    hall: '光标展厅',
    name: '磁吸',
    en: 'Magnetic Button',
    seen: '作品集网站的导航按钮、Awwwards 获奖站的 CTA',
    principle: [
      '每一帧量出鼠标到按钮中心的距离，进入“磁场范围”就开始吸。',
      '按钮的目标位置 = 鼠标偏移 × 强度；离得越近，拉力越大。',
      '按钮不直接跳过去，而是每帧走剩下路程的一小段（插值），所以有“追过去”的弹性。',
    ],
    code: `const dx = mouse.x - center.x, dy = mouse.y - center.y;
const dist = Math.hypot(dx, dy);
const pull = dist < radius ? strength : 0;

target.x = dx * pull;  target.y = dy * pull;

// 每帧只追剩下距离的一部分 → 弹性
cur.x += (target.x - cur.x) * ease;
cur.y += (target.y - cur.y) * ease;
btn.style.transform = \`translate(\${cur.x}px, \${cur.y}px)\`;`,
    params: {
      strength: { label: '强度', min: 0, max: 1, step: 0.05, val: 0.45, word: forceWord },
      radius: { label: '磁场范围', min: 60, max: 320, step: 10, val: 180, unit: 'px' },
      ease: { label: '跟手速度', min: 0.03, max: 0.4, step: 0.01, val: 0.12, word: speedWord },
    },
  },
  trail: {
    no: '06',
    hall: '光标展厅',
    name: '图片拖尾',
    en: 'Image Trail',
    seen: '摄影师、时装品牌、设计工作室的首页',
    principle: [
      '监听鼠标移动，累计走过的距离；每走满一个“间距”就在鼠标位置放下一张图。',
      '图片按顺序轮换，放下时从小放大，停留一会儿再缩小淡出。',
      '间距决定密度，停留决定尾巴有多长，两个数一调，气质完全不同。',
    ],
    code: `let last = { x: 0, y: 0 }, i = 0;
stage.addEventListener('pointermove', e => {
  if (Math.hypot(e.x - last.x, e.y - last.y) < gap) return;
  last = { x: e.x, y: e.y };

  const img = pool[i++ % pool.length];  // 轮换图片
  place(img, e.x, e.y);
  img.animate([{ scale: .6, opacity: 0 }, { scale: 1, opacity: 1 }], 300);
  setTimeout(() => fadeOut(img), life);  // 停留后淡出
});`,
    params: {
      gap: { label: '间距', min: 20, max: 220, step: 5, val: 90, unit: 'px' },
      life: { label: '停留', min: 200, max: 2000, step: 50, val: 900, unit: 'ms' },
      size: { label: '尺寸', min: 80, max: 280, step: 10, val: 170, unit: 'px' },
    },
  },
};

// ---------- 通用：参数面板 + 口令 + 原理 + 代码 ----------

function fmt(p, v) {
  const n = p.step < 1 ? v.toFixed(2) : String(Math.round(v));
  return n + (p.unit || '');
}

function phraseOf(ex, state) {
  const parts = Object.entries(ex.params).map(([k, p]) => {
    const w = p.word ? `（${p.word(state[k])}）` : '';
    return `${p.label} ${fmt(p, state[k])}${w}`;
  });
  return `${ex.name} ${ex.en}｜${parts.join(' · ')}`;
}

function mountChrome(root, ex, state, onChange) {
  const q = s => root.querySelector(s);
  const set = (s, v) => { const el = q(s); if (el) el.textContent = v; };
  set('.ex-no', ex.no);
  set('.ex-hall', ex.hall);
  set('.ex-name', ex.name);
  set('.ex-en', ex.en);
  set('.ex-seen', ex.seen);
  const pr = q('.ex-principle');
  if (pr) pr.innerHTML = ex.principle.map((t, i) => `<li><span>${i + 1}</span>${t}</li>`).join('');
  const code = q('.ex-code');
  if (code) code.textContent = ex.code;

  const controls = q('.ex-controls');
  const phrase = q('.ex-phrase-text');
  const refresh = () => { if (phrase) phrase.textContent = phraseOf(ex, state); };

  Object.entries(ex.params).forEach(([k, p]) => {
    const row = document.createElement('label');
    row.className = 'ex-ctl';
    row.innerHTML = `<span class="ex-ctl-label">${p.label}</span>
      <input type="range" min="${p.min}" max="${p.max}" step="${p.step || 1}" value="${state[k]}">
      <span class="ex-ctl-val"></span>`;
    const input = row.querySelector('input');
    const val = row.querySelector('.ex-ctl-val');
    const show = () => {
      val.textContent = fmt(p, state[k]) + (p.word ? ` ${p.word(state[k])}` : '');
      input.style.setProperty('--fill', ((state[k] - p.min) / (p.max - p.min)) * 100 + '%');
    };
    input.addEventListener('input', () => { state[k] = +input.value; show(); refresh(); onChange && onChange(k); });
    show();
    controls.appendChild(row);
  });
  refresh();

  const copyBtn = q('.ex-copy');
  if (copyBtn) copyBtn.addEventListener('click', async () => {
    const text = phraseOf(ex, state);
    try { await navigator.clipboard.writeText(text); } catch {
      const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t);
      t.select(); document.execCommand('copy'); t.remove();
    }
    const old = copyBtn.textContent; copyBtn.textContent = '已复制 ✓';
    setTimeout(() => (copyBtn.textContent = old), 1600);
  });

  const xBtn = q('.ex-xray');
  const xray = { on: false };
  if (xBtn) xBtn.addEventListener('click', () => {
    xray.on = !xray.on;
    root.classList.toggle('is-xray', xray.on);
    xBtn.setAttribute('aria-pressed', xray.on);
  });
  return xray;
}

function fitCanvas(cv) {
  const r = cv.getBoundingClientRect(), d = devicePixelRatio || 1;
  if (cv.width !== Math.round(r.width * d)) { cv.width = r.width * d; cv.height = r.height * d; }
  const ctx = cv.getContext('2d'); ctx.setTransform(d, 0, 0, d, 0, 0);
  return ctx;
}

// 透视层的配色由皮肤用 CSS 变量 --xray 决定
const xrayColor = el => getComputedStyle(el).getPropertyValue('--xray').trim() || '#ff6a1a';

// ---------- 展品：磁吸 ----------

function mountMagnetic(root) {
  const ex = EXHIBITS.magnetic;
  const state = Object.fromEntries(Object.entries(ex.params).map(([k, p]) => [k, p.val]));
  const xray = mountChrome(root, ex, state);
  const stage = root.querySelector('.ex-stage');
  const btn = root.querySelector('.ex-target');
  const inner = root.querySelector('.ex-target-inner');
  const cv = root.querySelector('.ex-xray-canvas');
  const mouse = { x: -9999, y: -9999, in: false };
  const cur = { x: 0, y: 0, ix: 0, iy: 0 };

  stage.addEventListener('pointermove', e => {
    const r = stage.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.in = true;
  });
  stage.addEventListener('pointerleave', () => (mouse.in = false));

  (function tick() {
    const sr = stage.getBoundingClientRect();
    // 按钮的“静止中心” = 舞台中心（不受自身位移影响）
    const cx = sr.width / 2, cy = sr.height / 2;
    const dx = mouse.x - cx, dy = mouse.y - cy, dist = Math.hypot(dx, dy);
    const inField = mouse.in && dist < state.radius;
    const tx = inField ? dx * state.strength : 0, ty = inField ? dy * state.strength : 0;
    cur.x += (tx - cur.x) * state.ease; cur.y += (ty - cur.y) * state.ease;
    cur.ix += (tx * 0.5 - cur.ix) * state.ease; cur.iy += (ty * 0.5 - cur.iy) * state.ease;
    btn.style.transform = `translate(-50%,-50%) translate(${cur.x}px, ${cur.y}px)`;
    if (inner) inner.style.transform = `translate(${cur.ix}px, ${cur.iy}px)`;
    btn.classList.toggle('is-pulled', inField);

    if (cv) {
      const ctx = fitCanvas(cv); ctx.clearRect(0, 0, sr.width, sr.height);
      if (xray.on) {
        const c = xrayColor(root);
        ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = 1;
        ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
        // 磁场范围
        ctx.setLineDash([4, 5]); ctx.globalAlpha = inField ? 0.9 : 0.45;
        ctx.beginPath(); ctx.arc(cx, cy, state.radius, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1;
        ctx.fillText(`磁场范围 r=${state.radius}px`, cx + state.radius * 0.72, cy - state.radius * 0.72);
        // 静止中心
        ctx.beginPath(); ctx.moveTo(cx - 6, cy); ctx.lineTo(cx + 6, cy); ctx.moveTo(cx, cy - 6); ctx.lineTo(cx, cy + 6); ctx.stroke();
        if (mouse.in) {
          // 鼠标连线
          ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(mouse.x, mouse.y); ctx.stroke(); ctx.globalAlpha = 1;
          ctx.fillText(`距离 ${Math.round(dist)}px`, mouse.x + 14, mouse.y - 10);
          // 目标点 vs 当前点：两者之间的差，就是“还没追上的路”
          ctx.beginPath(); ctx.arc(cx + tx, cy + ty, 5, 0, Math.PI * 2); ctx.stroke();
          
          ctx.beginPath(); ctx.arc(cx + cur.x, cy + cur.y, 3, 0, Math.PI * 2); ctx.fill();
          ctx.fillText(`○ 目标  ● 当前 · 还差 ${Math.round(Math.hypot(tx - cur.x, ty - cur.y))}px`, mouse.x + 14, mouse.y + 8);
        }
      }
    }
    requestAnimationFrame(tick);
  })();
}

// ---------- 展品：图片拖尾 ----------

function mountTrail(root) {
  const ex = EXHIBITS.trail;
  const state = Object.fromEntries(Object.entries(ex.params).map(([k, p]) => [k, p.val]));
  const xray = mountChrome(root, ex, state);
  const stage = root.querySelector('.ex-stage');
  const layer = root.querySelector('.ex-trail-layer');
  const cv = root.querySelector('.ex-xray-canvas');
  let last = null, i = 0, n = 0;
  const marks = []; // 透视用：每次放图的位置
  let mouse = null;

  const imgs = IMAGES.map((src, k) => {
    const im = new Image(); im.src = src; im.dataset.k = k;
    im.onerror = () => { im.dataset.fail = 1; };
    return im;
  });

  function spawn(x, y) {
    const src = imgs[i % imgs.length]; i++; n++;
    const el = document.createElement('div');
    el.className = 'ex-trail-item';
    const w = state.size, h = state.size * 1.25;
    el.style.cssText = `width:${w}px;height:${h}px;left:${x - w / 2}px;top:${y - h / 2}px;z-index:${n}`;
    if (src.dataset.fail || !src.complete || !src.naturalWidth) {
      el.style.background = `hsl(${(i * 37) % 360} 30% 30%)`;
    } else el.style.backgroundImage = `url(${src.src})`;
    el.dataset.n = n;
    layer.appendChild(el);
    el.animate([{ transform: 'scale(.55)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }],
      { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
    marks.push({ x, y, n, t: performance.now() });
    setTimeout(() => {
      el.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.85)', opacity: 0 }],
        { duration: 450, easing: 'ease-in', fill: 'forwards' }).onfinish = () => el.remove();
    }, state.life);
  }

  stage.addEventListener('pointermove', e => {
    const r = stage.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    mouse = { x, y };
    if (!last) { last = { x, y }; return; }
    if (Math.hypot(x - last.x, y - last.y) >= state.gap) { last = { x, y }; spawn(x, y); }
  });
  stage.addEventListener('pointerleave', () => { last = null; mouse = null; });

  if (cv) (function tick() {
    const sr = stage.getBoundingClientRect();
    const ctx = fitCanvas(cv); ctx.clearRect(0, 0, sr.width, sr.height);
    if (xray.on) {
      const c = xrayColor(root), now = performance.now();
      ctx.strokeStyle = c; ctx.fillStyle = c; ctx.font = '11px ui-monospace, Menlo, monospace';
      while (marks.length && now - marks[0].t > state.life + 450) marks.shift();
      marks.forEach((m, k) => {
        const age = (now - m.t) / (state.life + 450);
        ctx.globalAlpha = 1 - age;
        const w = state.size, h = w * 1.25;
        ctx.strokeRect(m.x - w / 2, m.y - h / 2, w, h);
        ctx.fillText(`#${m.n} · 剩 ${Math.max(0, Math.round(state.life - (now - m.t)))}ms`, m.x - w / 2 + 6, m.y - h / 2 + 15);
        if (k) { const p = marks[k - 1]; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(m.x, m.y); ctx.stroke(); }
      });
      ctx.globalAlpha = 1;
      if (last && mouse) {
        ctx.setLineDash([4, 5]);
        ctx.beginPath(); ctx.arc(last.x, last.y, state.gap, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        const d = Math.hypot(mouse.x - last.x, mouse.y - last.y);
        ctx.fillText(`再走 ${Math.max(0, Math.round(state.gap - d))}px 放下一张`, last.x + state.gap * 0.72, last.y - state.gap * 0.72);
      }
    }
    requestAnimationFrame(tick);
  })();
}

document.querySelectorAll('[data-exhibit="magnetic"]').forEach(mountMagnetic);
document.querySelectorAll('[data-exhibit="trail"]').forEach(mountTrail);
