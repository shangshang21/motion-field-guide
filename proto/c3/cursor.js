import { motion, registerExhibit, say, refreshPhrase, SFX } from './core.js';
const ORANGE = '#ff5b00';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const definitions = {
  magnetic: {
    no: '10', name: '磁吸', en: 'Magnetic',
    say: '鼠标进入磁场范围，按钮就朝它靠近；强度决定能拉多远。它每一帧只走剩下路程的一小段，所以有追赶的手感。打开透视，可以看见范围、目标点和还没追上的距离。',
    controls: {
      strength: { label: '强度', min: .1, max: .85, step: .05, value: .45 },
      radius: { label: '范围', min: 60, max: 220, step: 10, value: 150, unit: 'px' },
      ease: { label: '跟手速度', min: .04, max: .3, step: .01, value: .12 },
    },
  },
  trail: {
    no: '11', name: '图片拖尾', en: 'Image Trail',
    say: '鼠标每走过一段距离，就在经过的位置放下一张图片，依次轮换。间距控制密度，停留时间控制尾巴的长度。透视会把放图的位置连起来，显示到下一张还差多远。',
    controls: {
      gap: { label: '间距', min: 35, max: 150, step: 5, value: 75, unit: 'px' },
      life: { label: '停留', min: 300, max: 1800, step: 50, value: 900, unit: 'ms' },
      size: { label: '尺寸', min: 80, max: 180, step: 5, value: 125, unit: 'px' },
    },
  },
  spotlight: {
    no: '12', name: '聚光灯遮罩', en: 'Spotlight Reveal',
    say: '暗层下的海报一直都在，只用一个圆形遮罩露出光照到的部分。光源稍慢一点追着鼠标，像拿着一支有重量的手电筒。调大光圈，就能一次看见更多内容。',
    controls: {
      radius: { label: '光圈', min: 65, max: 220, step: 5, value: 125, unit: 'px' },
      ease: { label: '跟手速度', min: .04, max: .3, step: .01, value: .09 },
    },
  },
};
const format = (p, v) => (p.step < 1 ? v.toFixed(2) : Math.round(v)) + (p.unit || '');

function mountLab(key, replay) {
  const data = definitions[key], root = document.querySelector(`[data-k="${key}"]`);
  const stage = root.querySelector('.lab-stage'), canvas = root.querySelector('canvas');
  const ctx = canvas.getContext('2d'), state = {}, box = { width: 0, height: 0, visible: false };
  Object.entries(data.controls).forEach(([name, p]) => {
    state[name] = p.value;
    const label = document.createElement('label'); label.className = 'lab-ctl';
    label.innerHTML = `<span>${p.label}</span><output></output><input type="range" min="${p.min}" max="${p.max}" step="${p.step}" value="${p.value}" aria-label="${data.name} ${p.label}">`;
    const input = label.querySelector('input'), output = label.querySelector('output');
    const refresh = () => {
      output.value = format(p, state[name]);
      input.style.setProperty('--fill', `${(state[name] - p.min) / (p.max - p.min) * 100}%`);
      input.setAttribute('aria-valuetext', output.value); refreshPhrase();
    };
    input.addEventListener('input', () => { state[name] = Number(input.value); refresh(); });
    refresh(); root.querySelector('.lab-controls').append(label);
  });
  data.params = () => Object.entries(data.controls).map(([name, p]) => `${p.label} ${format(p, state[name])}`).join(' · ');
  registerExhibit(key, data, replay);
  root.querySelector('.q').addEventListener('click', () => say(key));
  root.querySelector('.xray-toggle').addEventListener('click', e => {
    const on = root.classList.toggle('is-xray'); e.currentTarget.setAttribute('aria-pressed', String(on)); SFX.play('tick');
  });
  stage.addEventListener('pointerdown', () => say(key));
  stage.addEventListener('keydown', e => { if (e.target === stage && ['Enter', ' '].includes(e.key)) { e.preventDefault(); say(key); replay(); } });
  new ResizeObserver(() => {
    box.width = stage.clientWidth; box.height = stage.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(box.width * dpr); canvas.height = Math.round(box.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }).observe(stage);
  new IntersectionObserver(es => { box.visible = es[0].isIntersecting; }, { rootMargin: '80px' }).observe(stage);
  function ink() {
    ctx.clearRect(0, 0, box.width, box.height);
    ctx.strokeStyle = ORANGE; ctx.fillStyle = ORANGE; ctx.lineWidth = 1;
    ctx.font = '10px ui-monospace, Menlo, monospace'; ctx.globalAlpha = 1; ctx.setLineDash([]);
  }
  const point = e => { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const cross = (x, y, r = 5) => { ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke(); };
  const text = (str, x, y) => ctx.fillText(str, clamp(x, 12, Math.max(12, box.width - ctx.measureText(str).width - 12)), clamp(y, 38, box.height - 60));
  return { root, stage, canvas, ctx, state, box, point, ink, cross, text, get xray() { return root.classList.contains('is-xray'); } };
}

function magnetic() {
  let demoTimer, pointer = { x: 0, y: 0, inside: false };
  const lab = mountLab('magnetic', () => {
    pointer = { x: lab.box.width / 2 + 90, y: lab.box.height / 2 - 55, inside: true };
    clearTimeout(demoTimer); demoTimer = setTimeout(() => pointer.inside = false, motion.ms(1500));
  });
  const { stage, state, box, ctx, ink, cross, text } = lab, target = lab.root.querySelector('.magnetic-target');
  const current = { x: 0, y: 0 }; let previous = performance.now();
  stage.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; clearTimeout(demoTimer); pointer = { ...lab.point(e), inside: true }; });
  stage.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') pointer.inside = false; });
  stage.addEventListener('pointerdown', e => {
    pointer = { ...lab.point(e), inside: true };
    if (Math.hypot(pointer.x - box.width / 2, pointer.y - box.height / 2) < 15) { pointer.x += 80; pointer.y -= 40; }
    clearTimeout(demoTimer); demoTimer = setTimeout(() => pointer.inside = false, motion.ms(1500));
  });
  function frame(now) {
    const dt = Math.min((now - previous) / 1000, .04); previous = now;
    if (box.visible) {
      const cx = box.width / 2, cy = box.height / 2;
      const dx = pointer.x - cx, dy = pointer.y - cy, distance = Math.hypot(dx, dy);
      const inField = pointer.inside && distance < state.radius;
      const tx = inField ? clamp(dx * state.strength, -cx + 95, cx - 95) : 0;
      const ty = inField ? clamp(dy * state.strength, -cy + 75, cy - 75) : 0;
      const ease = motion.reduced ? 1 : 1 - Math.pow(1 - state.ease, dt * 60 * motion.speed);
      current.x += (tx - current.x) * ease; current.y += (ty - current.y) * ease;
      target.style.transform = `translate(-50%,-50%) translate(${current.x}px,${current.y}px) skewX(-12deg)`;
      target.classList.toggle('is-pulled', inField);
      if (lab.xray) {
        ink(); ctx.setLineDash([4, 5]); ctx.globalAlpha = .7;
        ctx.beginPath(); ctx.arc(cx, cy, state.radius, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1; cross(cx, cy);
        text(`FIELD R=${state.radius}px / F=${state.strength.toFixed(2)}`, 16, 52);
        if (pointer.inside) {
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(pointer.x, pointer.y); ctx.stroke(); cross(pointer.x, pointer.y, 8);
          ctx.beginPath(); ctx.arc(cx + tx, cy + ty, 7, 0, Math.PI * 2); ctx.fillStyle = '#111110'; ctx.fill(); ctx.stroke(); ctx.fillStyle = ORANGE;
          ctx.beginPath(); ctx.arc(cx + current.x, cy + current.y, 3, 0, Math.PI * 2); ctx.fill();
          text(`DIST ${Math.round(distance)}px`, pointer.x + 14, pointer.y - 14);
          text(`TARGET ○ / CURRENT ● / LEFT ${Math.round(Math.hypot(tx - current.x, ty - current.y))}px`, 16, box.height - 64);
        } else text('ENTER FIELD → TARGET ○ / CURRENT ●', 16, box.height - 64);
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function trail() {
  let imageIndex = 0, last = null, pointer = null, serial = 0, previous = performance.now(), demo = 0;
  const photos = [], images = Array.from({ length: 8 }, (_, i) => new URL(`../../assets/web/motion-0${i + 1}.jpg`, import.meta.url).href);
  images.forEach(src => { const img = new Image(); img.src = src; img.decode().catch(() => {}); });
  const lab = mountLab('trail', replay);
  const { stage, state, box, ctx, ink, text, cross } = lab, layer = lab.root.querySelector('.trail-layer');
  function place(x, y) {
    if (photos.length >= (motion.reduced ? 3 : 10)) photos.shift().el.remove();
    const width = Math.min(state.size, box.width * .42), height = width * 1.3;
    x = clamp(x, width / 2 + 12, box.width - width / 2 - 12);
    y = clamp(y, height / 2 + 38, box.height - height / 2 - 54);
    const el = document.createElement('img'); el.className = 'trail-photo'; el.alt = ''; el.src = images[imageIndex++ % images.length];
    el.style.cssText = `width:${width}px;height:${height}px;left:${x - width / 2}px;top:${y - height / 2}px;z-index:${++serial}`;
    layer.append(el); stage.classList.add('playing');
    photos.push({ el, x, y, width, height, age: 0, life: state.life, angle: (serial % 5 - 2) * 4, n: serial });
  }
  function replay() {
    demo++; const id = demo;
    for (let i = 0; i < 5; i++) setTimeout(() => {
      if (id !== demo) return;
      const x = box.width * (.22 + i * .14), y = box.height * (.47 + Math.sin(i * 1.4) * .13);
      place(x, y); last = { x, y }; pointer = { x: x + 20, y: y - 10 };
    }, motion.reduced ? 0 : motion.ms(i * 105));
  }
  function move(e) {
    if (motion.reduced || e.pointerType !== 'mouse') return;
    pointer = lab.point(e);
    if (!last) { last = pointer; place(pointer.x, pointer.y); return; }
    const dx = pointer.x - last.x, dy = pointer.y - last.y, distance = Math.hypot(dx, dy);
    const count = Math.min(4, Math.floor(distance / state.gap));
    for (let i = 0; i < count; i++) { last = { x: last.x + dx / distance * state.gap, y: last.y + dy / distance * state.gap }; place(last.x, last.y); }
  }
  stage.addEventListener('pointermove', move);
  stage.addEventListener('pointerleave', () => { last = null; pointer = null; });
  stage.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || motion.reduced) replay(); else { pointer = lab.point(e); last = pointer; place(pointer.x, pointer.y); } });
  function frame(now) {
    const dt = Math.min(now - previous, 40) * motion.speed; previous = now;
    for (let i = photos.length - 1; i >= 0; i--) {
      const p = photos[i]; p.age += dt;
      if (p.age > p.life + 320) { p.el.remove(); photos.splice(i, 1); continue; }
      const enter = motion.reduced ? 1 : clamp(p.age / 250, 0, 1), exit = clamp((p.age - p.life) / 320, 0, 1);
      const ease = 1 - Math.pow(1 - enter, 3);
      p.el.style.transform = motion.reduced ? 'none' : `scale(${.66 + ease * .34 - exit * .08}) rotate(${p.angle * ease}deg)`;
      p.el.style.opacity = String(enter * (1 - exit));
    }
    if (!photos.length) stage.classList.remove('playing');
    if (box.visible && lab.xray) {
      ink();
      photos.forEach((p, i) => {
        ctx.globalAlpha = Math.max(.2, 1 - p.age / (p.life + 320));
        ctx.strokeRect(p.x - p.width / 2, p.y - p.height / 2, p.width, p.height); cross(p.x, p.y);
        text(`#${p.n} / ${Math.max(0, Math.round(p.life - p.age))}ms`, p.x - p.width / 2 + 6, p.y - p.height / 2 + 14);
        if (i) { ctx.beginPath(); ctx.moveTo(photos[i - 1].x, photos[i - 1].y); ctx.lineTo(p.x, p.y); ctx.stroke(); }
      });
      ctx.globalAlpha = 1;
      if (last && pointer) {
        ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(last.x, last.y, state.gap, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        text(`NEXT IN ${Math.max(0, Math.round(state.gap - Math.hypot(pointer.x - last.x, pointer.y - last.y)))}px / GAP ${state.gap}px`, 16, 52);
      } else text(`GAP ${state.gap}px / LIFE ${state.life}ms`, 16, 52);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function spotlight() {
  let current = null, target = null, previous = performance.now(), demoIndex = 0;
  const lab = mountLab('spotlight', () => {
    const points = [[.73, .45], [.23, .5], [.51, .69]];
    const p = points[demoIndex++ % points.length]; target = { x: lab.box.width * p[0], y: lab.box.height * p[1] };
  });
  const { stage, state, box, ctx, ink, cross, text } = lab, lit = stage.querySelector('.spot-lit');
  stage.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') target = lab.point(e); });
  stage.addEventListener('pointerdown', e => { target = lab.point(e); });
  lab.root.querySelector('[data-replay]').addEventListener('click', () => { say('spotlight'); lab.root.querySelector('.lab-stage').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
  function frame(now) {
    const dt = Math.min((now - previous) / 1000, .04); previous = now;
    if (box.visible) {
      current ||= { x: box.width * .38, y: box.height * .48 }; target ||= { ...current };
      const ease = motion.reduced ? 1 : 1 - Math.pow(1 - state.ease, dt * 60 * motion.speed);
      current.x += (target.x - current.x) * ease; current.y += (target.y - current.y) * ease;
      lit.style.setProperty('--lx', `${current.x}px`); lit.style.setProperty('--ly', `${current.y}px`); lit.style.setProperty('--lr', `${state.radius}px`);
      if (lab.xray) {
        ink(); ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(current.x, current.y, state.radius, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(current.x, current.y); ctx.lineTo(target.x, target.y); ctx.stroke(); cross(target.x, target.y, 8); cross(current.x, current.y, 4);
        text(`MASK R=${state.radius}px / LERP=${state.ease.toFixed(2)}`, 16, 52);
        text(`TARGET ＋ / LIGHT ● / LEFT ${Math.round(Math.hypot(target.x - current.x, target.y - current.y))}px`, 16, box.height - 65);
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
magnetic(); trail(); spotlight();
