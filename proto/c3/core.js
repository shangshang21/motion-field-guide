import { loop as renderLoop, geometry, schedule, frameState, pauseMotion, stepMotion, setClockSpeed, motionTimeout, clearMotionTimeout } from './frame.js';
import { SFX } from './sound.js';

import { impact } from './impact.js';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
let SPD = 1;
let curKey = null, typing = 0; // 对话框当前讲的展品、打字机的任务编号
const ms = v => v / SPD;
const reduction = matchMedia('(prefers-reduced-motion: reduce)');
export const motion = { get speed() { return SPD; }, get paused(){return frameState.paused;}, get reduced() { return reduction.matches; }, ms };
const replays = new Map();
let phraseExtension=()=>'';
export function registerPhraseExtension(fn){phraseExtension=fn;}
export function registerExhibit(key, data, replay) { EX[key] = data; replays.set(key, replay); }
export function refreshPhrase() { if (curKey && EX[curKey]) $('#dCode').textContent = phrase(curKey); }
const hallContents = {
  button: ['push', 'ripple', 'wipe', 'roll', 'hold', 'burst', 'glitch', 'jelly', 'shake', 'tilt', 'toggle', 'submit'],
  cursor: ['magnetic', 'trail', 'spotlight', 'custom', 'ink'], text: ['split', 'scramble', 'wave', 'mask', 'typewriter'],
  scroll: ['parallax','pinned','horizontal','reveal','velocity'], transition: ['flip','shared','curtain','native'], shader: ['distortion','dissolve','gradient','particles'], timing: ['easing','spring','duration','stagger'], gesture: ['inertia','rubber','swipe','pull'],
};
const collectionKey = 'motion-field-guide.phase1.collection';
let discovered = new Set();
try {
  const stored = JSON.parse(localStorage.getItem(collectionKey) || '[]');
  if (Array.isArray(stored)) discovered = new Set(stored.filter(k => Object.values(hallContents).flat().includes(k)));
} catch { /* 浏览器禁用存储时，仍可在当前页面记录。 */ }
function refreshCollection(key) {
  if (key && Object.values(hallContents).flat().includes(key)) {
    discovered.add(key);
    try { localStorage.setItem(collectionKey, JSON.stringify([...discovered])); } catch { }
  }
  $('#discovered').textContent = `已认识 ${discovered.size} / 43 件`;
  $('#discovery-fill').style.width = `${discovered.size / 43 * 100}%`;
  Object.entries(hallContents).forEach(([hall, keys]) => {
    $(`[data-hall="${hall}"]`).textContent = `已认识 ${keys.filter(k => discovered.has(k)).length} / ${keys.length}`;
  });
}
refreshCollection();

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
addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && !motion.reduced) { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; wakeHero(); } }, { passive: true });

/* ================= 交叉警戒带：对向滚动，滚得越快走得越快 ================= */
const TAPE = ['<span>Press<i>✳</i><small>按下去</small><i>✳</i>Hover<i>✳</i><small>悬停</small><i>✳</i>Hold<i>✳</i><small>长按</small><i>✳</i>Click<i>✳</i><small>点击</small><i>✳</i></span>',
              '<span>Motion Field Guide<i>✳</i><small>动效图鉴</small><i>✳</i>Vol.01<i>✳</i><small>每个瞬间都有名字</small><i>✳</i></span>'];
const tracks = $$('.track').map((t, k) => { t.innerHTML = TAPE[k].repeat(4); return { el: t, dir: +t.dataset.dir, x: k ? -400 : 0 }; });
let vel = 0;
const hero = $('.hero'), heroBox = geometry(hero, true);
new IntersectionObserver(entries => hero.classList.toggle('is-offscreen', !entries[0].isIntersecting)).observe(hero);
const wakeHero = renderLoop(hero, (t, dt) => {
  const ease = 1 - Math.exp(-dt * 4.4);
  sx = motion.reduced ? 0 : lerp(sx, mx, ease); sy = motion.reduced ? 0 : lerp(sy, my, ease);
  pxEls.forEach(el => { const d = +el.dataset.px; el.style.translate = `${-sx * d * 50}px ${-sy * d * 30}px`; });
  if (Math.abs(mx-sx)+Math.abs(my-sy)<.0001) return false;
});
let tapeWidth = 1;
const tapeBox = geometry($('.tapes'), true);
const measureTape = () => { tracks.forEach(track => track.width = track.el.scrollWidth / 4); };
new ResizeObserver(measureTape).observe(tracks[0].el); document.fonts.ready.then(measureTape);
renderLoop($('.tapes'), (t, dt) => {
  vel = lerp(vel, frameState.delta, 1-Math.exp(-dt*6));
  tracks.forEach(track => {
    if (!motion.reduced) track.x += track.dir*(1.1+Math.abs(vel)*.8)*SPD*dt*60;
    const width = track.width || 1; track.x = ((track.x % width) - width) % width;
    track.el.style.transform = `translateX(${track.x}px)`;
  });
});

/* ================= PRESS START：音效 + 闪白 + 震屏 + 跳转 ================= */
$('#start').addEventListener('click', () => {
  SFX.play('start');
  if (!motion.reduced) {
    $('#flash').animate([{ opacity: .85 }, { opacity: 0 }], { duration: ms(450), easing: 'ease-out' });
    $('#app').animate([0,-6,5,-4,2,0].map(x => ({ transform: `translateX(${x}px)` })), {duration: ms(380)});
  }
  setTimeout(() => $('#hall').scrollIntoView({ behavior: motion.reduced ? 'instant' : 'smooth' }), ms(260));
  setTimeout(() => say('welcome'), ms(900));
});

/* ================= 展品数据 ================= */
const EX = {
  push:   { no: '01', name: '按压下沉', en: 'Push Down', how: 'Press', label: 'Push', sfx: 'push',
            params: () => '厚度 10px · 按下 70ms',
            say: '按钮底下的阴影就是它的“厚度”。按下时按钮往下走，阴影同时变薄，松手再弹回来。响应大约七十毫秒，才能像实体按键一样干脆。' },
  ripple: { no: '02', name: '涟漪', en: 'Ripple', how: 'Click', label: 'Ripple', sfx: 'ripple',
            params: () => '扩散 700ms · 起点 点击位置',
            say: '在你点下去的位置画一个圆，从零放大到盖满按钮，同时慢慢变透明。这样既能知道点到了，也能知道反馈从哪里开始。' },
  wipe:   { no: '03', name: '填充擦除', en: 'Fill Wipe', how: 'Hover', label: 'Wipe', sfx: 'wipe',
            params: () => '展开 420ms · 斜切 -20°',
            say: '按钮里藏着一块横向缩成零的色块。鼠标进来时从左边展开，离开时从右边收走。两个方向不同，所以像被刷过去一样。' },
  roll:   { no: '04', name: '文字翻滚', en: 'Text Roll', how: 'Hover', label: 'Roll Over', sfx: 'roll',
            params: () => '逐字间隔 22ms · 翻滚 380ms',
            say: '每个字母下面藏着一个一模一样的复制品。悬停时整列往上推一格，原来的字滚出去、复制品滚进来。每个字母晚一点点出发，就形成了波浪。' },
  hold:   { no: '05', name: '长按充能', en: 'Hold to Confirm', how: 'Hold', label: '按住不放', sfx: null,
            params: () => '充能 1200ms · 定格 45ms · 微震 3px',
            say: '按住时进度条和音调一起升高，中途松手就退回去。按满后按钮先收紧，短暂停住，再叠上闪光、冲击波和碎片；一点微震让确认有了重量。' },
  burst:  { no: '06', name: '粒子爆裂', en: 'Particle Burst', how: 'Click', label: 'Burst', sfx: 'burst',
            params: () => '蓄力 80ms · 定格 45ms · 重力 440px/s² · 阻力 2.10',
            say: '按钮先往里收一下，爆点停住两三帧，再放出闪光和冲击波。火花飞得越快就越长，碎片受阻力减速、受重力下坠，最后只留下淡烟。' },
  glitch: { no: '07', name: '故障', en: 'Glitch', how: 'Hover', label: 'Glitch', sfx: 'glitch',
            params: () => '偏移 5px · 切片周期 300ms / 380ms',
            say: '同一行字复制成两份，每份只露出一条横带，再左右错开几像素，快速切换。错位的色层像信号短暂出了问题，移动很少也能看出变化。' },
  jelly:  { no: '08', name: '果冻回弹', en: 'Squash & Stretch', how: 'Click', label: 'Jelly', sfx: 'jelly',
            params: () => '挤压 1.28 × 0.72 · 回弹 750ms',
            say: '动画十二原则里的“挤压与拉伸”：先压扁变宽，再拉高变窄，来回几次、幅度越来越小，最后停住。总体积看起来不变，所以显得有弹性、有重量。' },
  shake:  { no: '09', name: '错误抖动', en: 'Error Shake', how: 'Click', label: '删除存档', sfx: 'error',
            params: () => '振幅 14px · 抖动 480ms',
            say: '按钮左右晃几下，幅度越来越小，同时用颜色提示出错。像有人摇头说“不行”，在输错密码或操作被拒绝时，能给出直观的反馈。' },
};
const LINES = {
  welcome: { ttl: '欢迎来到按钮展厅', say: '嗨，我是这里的导览员 ✳。下面的按钮随便按，按完我就告诉你它叫什么、怎么做出来的。右上角那条可以调整体速度，调到你喜欢的手感，再把口令复制给开发者就行。' },
};

/* ================= 速度档位 ================= */
const SPEEDS = [.1, .25, .5, .75, 1, 1.25, 1.5, 1.75, 2];
$$('#segs, #dock-segs').forEach(segs => {
  SPEEDS.forEach(v => {
    const b = document.createElement('button'); b.setAttribute('aria-label', v + 'x'); b.setAttribute('role', 'radio');
    b.dataset.speed = v; b.addEventListener('click', () => setSpeed(v)); segs.appendChild(b);
  });
  segs.addEventListener('keydown', e => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault(); let i = SPEEDS.indexOf(SPEEDS.reduce((a,n) => Math.abs(n-SPD)<Math.abs(a-SPD)?n:a));
    i = e.key === 'Home' ? 0 : e.key === 'End' ? SPEEDS.length - 1 : clamp(i + (e.key === 'ArrowRight' ? 1 : -1), 0, SPEEDS.length - 1);
    setSpeed(SPEEDS[i]); segs.children[i].focus();
  });
});
export function setSpeed(v, silent = false) {
  SPD = v; setClockSpeed(v); document.documentElement.style.setProperty('--spd', v);
  $('#spdVal').textContent = v.toFixed(2) + 'x';
  $('#hudSpd').textContent = $('#dockSpd').textContent = v.toFixed(2) + 'x';
  $('#speed-toggle').setAttribute('aria-label', `调整全局速度，当前 ${v.toFixed(2)} 倍`);
  $$('.segs button').forEach(b => {
    const nearest = SPEEDS.reduce((a,n) => Math.abs(n-v)<Math.abs(a-v)?n:a);
    const selected = Number(b.dataset.speed) === nearest;
    b.classList.toggle('on', Number(b.dataset.speed) <= v); b.setAttribute('aria-checked', String(selected)); b.tabIndex = selected ? 0 : -1;
  });
  if (!silent) SFX.play('tick'); refreshPhrase();
}
setSpeed(1, true);
const speedToggle = $('#speed-toggle'), speedDock = $('#speed-dock');
function closeSpeed(focus = false) { speedDock.hidden = true; speedToggle.setAttribute('aria-expanded', 'false'); if (focus) speedToggle.focus(); }
speedToggle.addEventListener('click', () => {
  speedDock.hidden = !speedDock.hidden; speedToggle.setAttribute('aria-expanded', String(!speedDock.hidden));
});
document.addEventListener('click', e => { if (!e.target.closest('#speed-toggle, #speed-dock')) closeSpeed(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !speedDock.hidden) closeSpeed(true); });
const pauseButton=$('#play-pause'),stepButton=$('#play-step');
pauseButton.addEventListener('click',()=>pauseMotion());stepButton.addEventListener('click',()=>stepMotion());$('#play-slow').addEventListener('click',()=>setSpeed(.1));
addEventListener('motion-playback',()=>{pauseButton.textContent=frameState.paused?'▶ 继续':'Ⅱ 暂停';pauseButton.setAttribute('aria-pressed',String(frameState.paused));$('#play-state').textContent=frameState.paused?`PAUSED / FRAME ${String(frameState.steps).padStart(3,'0')}`:'PLAYING / ALL HALLS';$('#speed-toggle').classList.toggle('is-paused',frameState.paused);});
addEventListener('keydown',e=>{if(e.target.closest('input,textarea,select,button,a,[role=slider]'))return;if(e.code==='Space'){e.preventDefault();pauseMotion();}if(e.key==='.'&&frameState.paused){e.preventDefault();stepMotion();}});
const navLinks = $$('.hud-nav a').map(a => ({a, box: geometry($(a.hash), true)}));
function updateHud() {
  $('.hud').classList.toggle('is-scrolled', heroBox.y + heroBox.height < 100);
  let current = null;
  navLinks.forEach(({a,box}) => { if (box.y <= 180) current = a; });
  navLinks.forEach(({a}) => { if (a === current) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
  return false;
}
const hudJob = schedule(updateHud,true);
addEventListener('scroll', () => hudJob.wake(), { passive: true });
addEventListener('resize', () => hudJob.wake(), { passive: true });

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
  b.addEventListener('pointercancel', up);
  b.addEventListener('click', e => { if (!e.detail) { b.classList.add('down'); SFX.play('push'); motionTimeout(up, ms(140)); } });
}
function fxRipple(b) {
  const ripple = (e = null) => {
    const r = b.getBoundingClientRect(), d = Math.hypot(r.width, r.height) * 2;
    const s = document.createElement('span'); s.className = 'rip';
    s.style.cssText = `width:${d}px;height:${d}px;left:${(e ? e.clientX - r.left : r.width / 2) - d / 2}px;top:${(e ? e.clientY - r.top : r.height / 2) - d / 2}px`;
    b.appendChild(s); SFX.play('ripple');
    s.animate([{ transform: 'scale(0)', opacity: 1 }, { transform: 'scale(1)', opacity: 0 }], { duration: motion.reduced ? 1 : ms(700), easing: 'cubic-bezier(.2,.8,.2,1)' }).onfinish = () => s.remove();
  };
  b.addEventListener('pointerdown', ripple);
  b.addEventListener('click', e => { if (!e.detail) ripple(); });
}
function fxHover(b, k) {
  b.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { SFX.play(EX[k].sfx); say(k); } });
  b.addEventListener('click', e => { if (e.pointerType === 'touch' || matchMedia('(hover: none)').matches || !e.detail) b.classList.toggle('is-hover'); SFX.play(EX[k].sfx); say(k); });
  b.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') b.classList.remove('is-hover'); });
}
function fxHold(b) {
  let p = 0, holding = false, last = 0, reset = 0;
  const lbl = b.querySelector('.lbl'), TOTAL = () => ms(1200);
  const wakeHold = renderLoop(b.closest('.card'), (t, seconds) => {
    const dt = seconds * 1000;
    p = clamp(p + (holding ? dt / TOTAL() : -dt / ms(300)), 0, 1);
    b.style.setProperty('--p', p); SFX.holdSet(p);
    if (holding && p >= 1) { holding = false; SFX.holdStop(); b.classList.add('done'); lbl.textContent = 'CONFIRMED ✓';
      impact(b, { motion, charged: true, sound: () => { SFX.play('burst'); motionTimeout(() => SFX.play('done'), ms(200)); } });
      reset = motionTimeout(() => { b.classList.remove('done'); lbl.textContent = '按住不放'; p = 0; b.style.setProperty('--p', 0); }, ms(1800)); return false; }
    if (!holding && p <= 0) return false;
  });
  const start = () => { if (b.classList.contains('done') || holding) return; holding = true; last = performance.now(); SFX.holdStart(); wakeHold(); };
  b.addEventListener('pointerdown', e => { if (e.button !== 0) return; b.setPointerCapture(e.pointerId); start(); });
  const rel = () => { if (!holding) return; holding = false; SFX.holdStop(); };
  b.addEventListener('pointerup', rel); b.addEventListener('pointercancel', rel); b.addEventListener('lostpointercapture', rel);
  b.addEventListener('keydown', e => { if ([' ', 'Enter'].includes(e.key)) { e.preventDefault(); say('hold'); start(); } });
  b.addEventListener('keyup', e => { if ([' ', 'Enter'].includes(e.key)) { e.preventDefault(); rel(); } });
  b.addEventListener('blur', rel);
  addEventListener('blur', rel);
  document.addEventListener('visibilitychange', () => { if (document.hidden) rel(); });
  replays.set('hold', () => { clearMotionTimeout(reset); b.classList.remove('done'); lbl.textContent = '按住不放'; p = 0; b.style.setProperty('--p', 0); b.focus({ preventScroll: true }); });
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
      .onfinish = () => motionTimeout(() => b.classList.remove('err'), ms(400));
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
function phrase(k) { const e = EX[k]; return `${e.name} ${e.en}｜速度 ${SPD.toFixed(2)}x${e.params ? '｜' + e.params() : ''}${phraseExtension(k)}`; }
function say(k) {
  const d = EX[k] || LINES[k]; if (!d) return;
  $$('.card').forEach(c => c.classList.toggle('active', c.dataset.k === k));
  if (curKey === k && $('#dialog').classList.contains('show')) return;
  curKey = k;
  if (EX[k]) refreshCollection(k);
  dispatchEvent(new CustomEvent('exhibit-say',{detail:{key:k}}));
  $('#dTtl').innerHTML = EX[k] ? `Nº${d.no} ${d.name}<em>${d.en}</em>` : d.ttl;
  $('#dCode').textContent = EX[k] ? phrase(k) : '';
  $('#dCopy').style.display = $('#dAgain').style.display = EX[k] ? '' : 'none';
  $('#dialog').classList.add('show');
  $('#dialog').inert = false;
  const txt = $('#dTxt'), full = d.say, id = ++typing; let i = 0;
  if (motion.reduced) { txt.textContent = full; return; }
  (function type() {
    if (id !== typing) return;
    i = Math.min(full.length, i + 2);
    txt.innerHTML = full.slice(0, i) + '<span class="cur"></span>';
    if (i % 6 === 0) SFX.play('tick');
    if (i < full.length) motionTimeout(type, ms(22));
  })();
}
function closeDialog() { $('#dialog').classList.remove('show'); $('#dialog').inert = true; typing++; curKey = null; SFX.play('up'); }
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
new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting && !greeted) {
    greeted = true;
    setTimeout(() => {
      const r = $('#hall').getBoundingClientRect();
      if (!curKey && r.bottom > innerHeight * .2 && r.top < innerHeight * .8) say('welcome');
    }, 500);
  }
}), { threshold: .25 }).observe($('#hall'));
export { say, SFX, phrase };

export const getExhibit = key => EX[key];
export function replayExhibit(key) { say(key); replays.get(key)?.(); refreshPhrase(); }

export const quoteText = value => "文字「" + value.replace(/[\\「」]/g, ch => "\\" + ch) + "」";
