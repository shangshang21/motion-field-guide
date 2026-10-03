
import { impact } from './impact.js';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
let SPD = 1;
let curKey = null, typing = 0; // 对话框当前讲的展品、打字机的任务编号
const ms = v => v / SPD;
const reduction = matchMedia('(prefers-reduced-motion: reduce)');
export const motion = { get speed() { return SPD; }, get reduced() { return reduction.matches; }, ms };
const replays = new Map();
export function registerExhibit(key, data, replay) { EX[key] = data; replays.set(key, replay); }
export function refreshPhrase() { if (curKey && EX[curKey]) $('#dCode').textContent = phrase(curKey); }

/* ================= 音效：全部用 Web Audio 现场合成，不需要音频文件 ================= */
const SFX = (() => {
  let ctx = null, on = true;
  const ac = () => {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  function tone({ f = 440, f2 = 0, type = 'square', dur = .08, vol = .06, at = 0 }) {
    if (!on) return;
    dur /= SPD; at /= SPD;
    const a = ac(), t = a.currentTime + at, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .03);
  }
  function noise({ dur = .08, vol = .05, freq = 2000, at = 0 }) {
    if (!on) return;
    dur /= SPD; at /= SPD;
    const a = ac(), t = a.currentTime + at, len = Math.ceil(a.sampleRate * dur);
    const buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    f.type = 'bandpass'; f.frequency.value = freq; s.buffer = buf;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f).connect(g).connect(a.destination); s.start(t);
  }
  // 长按充能：一个持续的振荡器，音高随进度升高
  let hold = null;
  function holdStart() {
    if (!on) return;
    holdStop();
    const a = ac(), o = a.createOscillator(), g = a.createGain();
    o.type = 'sawtooth'; o.frequency.value = 160; g.gain.value = .035;
    const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
    o.connect(lp).connect(g).connect(a.destination); o.start(); hold = { o, g, a };
  }
  function holdSet(p) { if (hold) hold.o.frequency.setTargetAtTime(160 + p * 760, hold.a.currentTime, .02); }
  function holdStop() { if (!hold) return; const { o, g, a } = hold; g.gain.setTargetAtTime(.0001, a.currentTime, .03); o.stop(a.currentTime + .15); hold = null; }

  const lib = {
    tick: () => tone({ f: 1900, dur: .012, vol: .018 }),
    start: () => { [523, 659, 784, 1046].forEach((f, i) => tone({ f, dur: .12, vol: .05, at: i * .06 })); noise({ dur: .35, vol: .05, freq: 900, at: .05 }); },
    push: () => { tone({ f: 150, f2: 60, type: 'sine', dur: .14, vol: .3 }); noise({ dur: .03, vol: .06, freq: 3000 }); },
    up: () => tone({ f: 420, f2: 620, type: 'triangle', dur: .05, vol: .04 }),
    ripple: () => tone({ f: 520, f2: 1040, type: 'sine', dur: .16, vol: .09 }),
    wipe: () => noise({ dur: .14, vol: .05, freq: 2600 }),
    roll: () => { tone({ f: 900, dur: .03, vol: .03 }); tone({ f: 1300, dur: .03, vol: .03, at: .05 }); },
    done: () => [784, 988, 1175, 1568].forEach((f, i) => tone({ f, dur: .1, vol: .05, at: i * .05 })),
    burst: () => {
      tone({ f: 145, f2: 42, type: 'sine', dur: .27, vol: .35 });
      noise({ dur: .065, vol: .16, freq: 5400 });
      noise({ dur: .11, vol: .075, freq: 7600, at: .032 });
      tone({ f: 1800, f2: 330, type: 'triangle', dur: .12, vol: .045, at: .012 });
      noise({ dur: .45, vol: .055, freq: 680, at: .06 });
      tone({ f: 68, f2: 32, type: 'sine', dur: .45, vol: .11, at: .045 });
    },
    glitch: () => { for (let i = 0; i < 3; i++) { noise({ dur: .03, vol: .06, freq: 4000 + i * 900, at: i * .045 }); tone({ f: 70 + i * 30, dur: .03, vol: .05, at: i * .045 }); } },
    jelly: () => { tone({ f: 260, f2: 110, type: 'triangle', dur: .12, vol: .12 }); tone({ f: 110, f2: 300, type: 'triangle', dur: .18, vol: .1, at: .1 }); },
    error: () => { tone({ f: 155, dur: .09, vol: .07 }); tone({ f: 155, dur: .12, vol: .07, at: .13 }); },
  };
  return { play: k => lib[k] && lib[k](), holdStart, holdSet, holdStop, toggle() { on = !on; if (!on) holdStop(); return on; } };
})();

$('#sfx').addEventListener('click', () => {
  const on = SFX.toggle();
  $('#sfx').classList.toggle('off', !on); $('#sfx').setAttribute('aria-pressed', on);
  $('#sfxLbl').textContent = on ? 'SFX ON' : 'SFX OFF';
  SFX.play('up');
});

/* ================= 时钟 ================= */
setInterval(() => ($('#clock').textContent = new Date().toTimeString().slice(0, 8)), 1000);

/* ================= 首屏：鼠标视差 ================= */
const pxEls = $$('[data-px]'); let mx = 0, my = 0, sx = 0, sy = 0;
addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && !motion.reduced) { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; } });

/* ================= 交叉警戒带：对向滚动，滚得越快走得越快 ================= */
const TAPE = ['<span>Press<i>✳</i><small>按下去</small><i>✳</i>Hover<i>✳</i><small>悬停</small><i>✳</i>Hold<i>✳</i><small>长按</small><i>✳</i>Click<i>✳</i><small>点击</small><i>✳</i></span>',
              '<span>Motion Field Guide<i>✳</i><small>动效图鉴</small><i>✳</i>Vol.01<i>✳</i><small>每个瞬间都有名字</small><i>✳</i></span>'];
const tracks = $$('.track').map((t, k) => { t.innerHTML = TAPE[k].repeat(4); return { el: t, dir: +t.dataset.dir, x: k ? -400 : 0 }; });
let lastY = scrollY, vel = 0;

(function frame() {
  sx = motion.reduced ? 0 : lerp(sx, mx, .07); sy = motion.reduced ? 0 : lerp(sy, my, .07);
  pxEls.forEach(el => { const d = +el.dataset.px; el.style.translate = `${-sx * d * 50}px ${-sy * d * 30}px`; });
  const dy = scrollY - lastY; lastY = scrollY; vel = lerp(vel, dy, .1);
  tracks.forEach(t => {
    const w = t.el.scrollWidth / 4;
    if (!motion.reduced) t.x += t.dir * (1.1 + Math.abs(vel) * .8) * SPD;
    if (t.x < -w) t.x += w; if (t.x > 0) t.x -= w;
    t.el.style.transform = `translateX(${t.x}px)`;
  });
  requestAnimationFrame(frame);
})();

/* ================= PRESS START：音效 + 闪白 + 震屏 + 跳转 ================= */
$('#start').addEventListener('click', () => {
  SFX.play('start');
  if (!motion.reduced) {
    $('#flash').animate([{ opacity: .85 }, { opacity: 0 }], { duration: ms(450), easing: 'ease-out' });
    const app = $('#app'); app.classList.remove('shake-screen'); void app.offsetWidth; app.classList.add('shake-screen');
  }
  setTimeout(() => $('#hall').scrollIntoView({ behavior: motion.reduced ? 'instant' : 'smooth' }), ms(260));
  setTimeout(() => say('welcome'), ms(900));
});

/* ================= 展品数据 ================= */
const EX = {
  push:   { no: '01', name: '按压下沉', en: 'Push Down', how: 'Press', label: 'Push', sfx: 'push',
            say: '按钮底下藏着一条“厚度”（阴影）。按下时按钮往下走，阴影同时变薄，就像真的被压进去了。松手再弹回来。关键是时间要很短，七十毫秒左右，慢了就不像实体按键。' },
  ripple: { no: '02', name: '涟漪', en: 'Ripple', how: 'Click', label: 'Ripple', sfx: 'ripple',
            say: '在你点下去的那个位置生成一个圆，从零放大到盖满整个按钮，同时慢慢变透明。谷歌 Material Design 的招牌反馈，告诉你“点到了，而且就点在这儿”。' },
  wipe:   { no: '03', name: '填充擦除', en: 'Fill Wipe', how: 'Hover', label: 'Wipe', sfx: 'wipe',
            say: '按钮里藏着一块横向缩成 0 的色块。鼠标进来，它从左边展开；鼠标离开，它从右边收走。进出方向不同，所以像被“刷”过去一样。斜切一下更有速度感。' },
  roll:   { no: '04', name: '文字翻滚', en: 'Text Roll', how: 'Hover', label: 'Roll Over', sfx: 'roll',
            say: '每个字母下面藏着一个一模一样的复制品。悬停时整列往上推一格，原来的字滚出去、复制品滚进来。每个字母晚一点点出发，就形成了波浪。' },
  hold:   { no: '05', name: '长按充能', en: 'Hold to Confirm', how: 'Hold', label: '按住不放', sfx: null,
            params: () => '充能 1200ms · 定格 45ms · 微震 3px',
            say: '按住时进度条和音调一起升高，中途松手就退回去。按满后按钮先收紧，短暂停住，再叠上闪光、冲击波和碎片；一点微震让确认有了重量。' },
  burst:  { no: '06', name: '粒子爆裂', en: 'Particle Burst', how: 'Click', label: 'Burst', sfx: 'burst',
            params: () => '蓄力 80ms · 定格 45ms · 重力 440px/s² · 阻力 2.10',
            say: '按钮先往里收一下，爆点停住两三帧，再放出闪光和冲击波。火花飞得越快就越长，碎片受阻力减速、受重力下坠，最后只留下淡烟。' },
  glitch: { no: '07', name: '故障', en: 'Glitch', how: 'Hover', label: 'Glitch', sfx: 'glitch',
            say: '同一行字复制成两份，染成橙色和青色，每份只露出随机的一条横带，再左右错开几像素，快速切换。模拟信号出错的样子，赛博、街头风很爱用。' },
  jelly:  { no: '08', name: '果冻回弹', en: 'Squash & Stretch', how: 'Click', label: 'Jelly', sfx: 'jelly',
            say: '动画十二原则里的“挤压与拉伸”：先压扁变宽，再拉高变窄，来回几次、幅度越来越小，最后停住。总体积看起来不变，所以显得有弹性、有重量。' },
  shake:  { no: '09', name: '错误抖动', en: 'Error Shake', how: 'Click', label: '删除存档', sfx: 'error',
            say: '左右快速晃几下、幅度越来越小，同时变成红色。就像有人摇头说“不行”。输错密码、操作被拒绝时用它，不用读字也知道出错了。' },
};
const LINES = {
  welcome: { ttl: '欢迎来到按钮展厅', say: '嗨，我是这里的导览员 ✳。下面九个按钮随便按，按完我就告诉你它叫什么、怎么做出来的。右上角那条可以调整体速度，调到你喜欢的手感，再把口令复制给开发者就行。' },
};

/* ================= 速度档位 ================= */
const SPEEDS = [.25, .5, .75, 1, 1.25, 1.5, 1.75, 2];
const segs = $('#segs');
SPEEDS.forEach((v, i) => {
  const b = document.createElement('button'); b.setAttribute('aria-label', v + 'x');
  b.addEventListener('click', () => setSpeed(v)); segs.appendChild(b);
});
function setSpeed(v) {
  SPD = v; document.documentElement.style.setProperty('--spd', v);
  $('#spdVal').textContent = v.toFixed(2) + 'x';
  $$('#segs button').forEach((b, i) => b.classList.toggle('on', SPEEDS[i] <= v));
  SFX.play('tick'); if (curKey && EX[curKey]) $('#dCode').textContent = phrase(curKey);
}
setSpeed(1);

/* ================= 卡片 ================= */
const cards = $('#cards');
Object.entries(EX).forEach(([k, e]) => {
  const c = document.createElement('article'); c.className = 'card'; c.dataset.k = k;
  const label = k === 'roll' ? '<span class="rw">' + [...e.label].map((ch, i) => `<span class="ch" style="--i:${i}" data-c="${ch === ' ' ? ' ' : ch}">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('') + '</span>' : `<span class="lbl">${e.label}</span>`;
  c.innerHTML = `<header class="mono"><span class="n">Nº${e.no}</span><span class="sp"></span><span class="how">${e.how}</span></header>
    <div class="pad"><button class="b b-${k}" data-text="${e.label}">${k === 'hold' ? '<span class="fill"></span>' : ''}${label}</button></div>
    <footer><b>${e.name}</b><em>${e.en}</em><button class="q mono" aria-label="了解${e.name}">?</button></footer>`;
  cards.appendChild(c);
});

function fxPush(b) {
  b.addEventListener('pointerdown', () => { b.classList.add('down'); SFX.play('push'); });
  const up = () => { if (b.classList.contains('down')) { b.classList.remove('down'); SFX.play('up'); } };
  b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up);
}
function fxRipple(b) {
  b.addEventListener('pointerdown', e => {
    const r = b.getBoundingClientRect(), d = Math.hypot(r.width, r.height) * 2;
    const s = document.createElement('span'); s.className = 'rip';
    s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    b.appendChild(s); SFX.play('ripple');
    s.animate([{ transform: 'scale(0)', opacity: 1 }, { transform: 'scale(1)', opacity: 0 }], { duration: motion.reduced ? 1 : ms(700), easing: 'cubic-bezier(.2,.8,.2,1)' }).onfinish = () => s.remove();
  });
}
function fxHover(b, k) {
  b.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { SFX.play(EX[k].sfx); say(k); } });
  b.addEventListener('click', () => { b.classList.toggle('is-hover'); SFX.play(EX[k].sfx); say(k); });
}
function fxHold(b) {
  let p = 0, holding = false, last = 0, raf = 0, reset = 0;
  const lbl = b.querySelector('.lbl'), TOTAL = () => ms(1200);
  function loop(t) {
    const dt = t - last; last = t;
    p = clamp(p + (holding ? dt / TOTAL() : -dt / ms(300)), 0, 1);
    b.style.setProperty('--p', p); SFX.holdSet(p);
    if (holding && p >= 1) { holding = false; SFX.holdStop(); b.classList.add('done'); lbl.textContent = 'CONFIRMED ✓';
      impact(b, { motion, charged: true, sound: () => { SFX.play('burst'); setTimeout(() => SFX.play('done'), ms(200)); } });
      reset = setTimeout(() => { b.classList.remove('done'); lbl.textContent = '按住不放'; p = 0; b.style.setProperty('--p', 0); }, ms(1800)); return; }
    if (holding || p > 0) raf = requestAnimationFrame(loop);
  }
  const start = () => { if (b.classList.contains('done') || holding) return; holding = true; last = performance.now(); SFX.holdStart(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); };
  b.addEventListener('pointerdown', e => { if (e.button !== 0) return; b.setPointerCapture(e.pointerId); start(); });
  const rel = () => { if (!holding) return; holding = false; SFX.holdStop(); };
  b.addEventListener('pointerup', rel); b.addEventListener('pointercancel', rel); b.addEventListener('lostpointercapture', rel);
  b.addEventListener('keydown', e => { if ([' ', 'Enter'].includes(e.key)) { e.preventDefault(); say('hold'); start(); } });
  b.addEventListener('keyup', e => { if ([' ', 'Enter'].includes(e.key)) { e.preventDefault(); rel(); } });
  b.addEventListener('blur', rel);
  addEventListener('blur', rel);
  document.addEventListener('visibilitychange', () => { if (document.hidden) rel(); });
  replays.set('hold', () => { clearTimeout(reset); b.classList.remove('done'); lbl.textContent = '按住不放'; p = 0; b.style.setProperty('--p', 0); b.focus({ preventScroll: true }); });
}
function fxBurst(b) {
  b.addEventListener('click', () => impact(b, { motion, sound: () => SFX.play('burst') }));
}
function fxJelly(b) {
  b.addEventListener('click', () => {
    SFX.play('jelly');
    b.animate([{ transform: 'scale(1,1)' }, { transform: 'scale(1.28,.72)' }, { transform: 'scale(.82,1.18)' }, { transform: 'scale(1.1,.9)' }, { transform: 'scale(.96,1.04)' }, { transform: 'scale(1,1)' }],
      { duration: motion.reduced ? 1 : ms(750), easing: 'ease-out' });
  });
}
function fxShake(b) {
  b.addEventListener('click', () => {
    SFX.play('error'); b.classList.add('err');
    b.animate([0, -14, 12, -9, 7, -4, 2, 0].map(x => ({ transform: `translateX(${x}px)` })), { duration: motion.reduced ? 1 : ms(480), easing: 'ease-out' })
      .onfinish = () => setTimeout(() => b.classList.remove('err'), ms(400));
  });
}

$$('#cards > .card').forEach(c => {
  const k = c.dataset.k, b = c.querySelector('.b');
  ({ push: fxPush, ripple: fxRipple, hold: fxHold, burst: fxBurst, jelly: fxJelly, shake: fxShake })[k]?.(b);
  if (['wipe', 'roll', 'glitch'].includes(k)) fxHover(b, k);
  else { b.addEventListener('pointerdown', () => say(k)); b.addEventListener('click', () => say(k)); }
  if (!replays.has(k)) replays.set(k, () => b.click());
  c.querySelector('.q').addEventListener('click', () => say(k));
});

/* ================= 导览员对话框：打字机 ================= */
function phrase(k) { const e = EX[k]; return `${e.name} ${e.en}｜速度 ${SPD.toFixed(2)}x${e.params ? '｜' + e.params() : ''}`; }
function say(k) {
  const d = EX[k] || LINES[k]; if (!d) return;
  $$('.card').forEach(c => c.classList.toggle('active', c.dataset.k === k));
  if (curKey === k && $('#dialog').classList.contains('show')) return;
  curKey = k;
  $('#dTtl').innerHTML = EX[k] ? `Nº${d.no} ${d.name}<em>${d.en}</em>` : d.ttl;
  $('#dCode').textContent = EX[k] ? phrase(k) : '';
  $('#dCopy').style.display = $('#dAgain').style.display = EX[k] ? '' : 'none';
  $('#dialog').classList.add('show');
  const txt = $('#dTxt'), full = d.say, id = ++typing; let i = 0;
  if (motion.reduced) { txt.textContent = full; return; }
  (function type() {
    if (id !== typing) return;
    i = Math.min(full.length, i + 2);
    txt.innerHTML = full.slice(0, i) + '<span class="cur"></span>';
    if (i % 6 === 0) SFX.play('tick');
    if (i < full.length) setTimeout(type, ms(22));
  })();
}
function closeDialog() { $('#dialog').classList.remove('show'); typing++; curKey = null; SFX.play('up'); }
$('#dX').addEventListener('click', closeDialog);
addEventListener('keydown', e => { if (e.key === 'Escape') closeDialog(); });
$('#dTxt').addEventListener('click', () => { const d = EX[curKey] || LINES[curKey]; if (d) { typing++; $('#dTxt').textContent = d.say; } });
$('#dCopy').addEventListener('click', async () => {
  if (!EX[curKey]) return;
  const t = phrase(curKey);
  try { await navigator.clipboard.writeText(t); } catch { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); }
  SFX.play('done'); $('#dCopy').textContent = '已复制 ✓'; setTimeout(() => ($('#dCopy').textContent = '复制口令'), 1500);
});
$('#dAgain').addEventListener('click', () => {
  const c = $(`.card[data-k="${curKey}"]`); if (!c) return;
  c.scrollIntoView({ behavior: motion.reduced ? 'instant' : 'smooth', block: 'center' });
  replays.get(curKey)?.();
});

// 第一次滚到按钮展厅，导览员自己打招呼
let greeted = false;
new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && !greeted) { greeted = true; setTimeout(() => { if (!curKey) say('welcome'); }, 400); } }), { threshold: .25 }).observe($('#hall'));
export { say, SFX, phrase };
