import { loop } from './frame.js';
import { motion, registerExhibit, say, refreshPhrase, SFX, quoteText } from './core.js';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const definitions = {
  split: {
    no: '13', name: '逐字错落', en: 'Split Text Stagger',
    say: '把一句话拆成单独的字，每个字都藏在自己的遮罩下面。播放时依次往上升，后一个比前一个晚一点出发；这个时间差就是错落。间隔短更利落，间隔长更像逐字说话。',
    controls: {
      stagger: { label: '逐字间隔', min: 20, max: 160, step: 5, value: 70, unit: 'ms' },
      duration: { label: '升起时长', min: 300, max: 1000, step: 25, value: 600, unit: 'ms' },
    },
  },
  scramble: {
    no: '14', name: '乱码解码', en: 'Scramble',
    say: '字母先从一组符号里随机取值，看起来像信号还没接通。随后从左到右逐个锁定，已经锁定的字母不再变化。刷新间隔决定跳动有多密，总时长决定解码有多快。',
    controls: {
      duration: { label: '解码时长', min: 600, max: 2400, step: 50, value: 1350, unit: 'ms' },
      interval: { label: '刷新间隔', min: 20, max: 100, step: 5, value: 40, unit: 'ms' },
    },
  },
};

function mountType(key,override) {
  const root = override||document.querySelector(`[data-k="${key}"]`), data = {...definitions[key]};
  const input = root.querySelector('.type-edit input'), stage = root.querySelector('.type-stage');
  const lines = root.querySelector(`.${key === 'split' ? 'split' : 'scramble'}-lines`);
  const bars = root.querySelector('.progress-bars'), counter = root.querySelector('.type-timeline output');
  const status = root.querySelector('.type-status'), play = root.querySelector('.type-play');
  const state = {}, chars = []; let draw = () => false, run = 0, running = false, elapsed = 0, previous = 0, nextRefresh = 0;
  Object.entries(data.controls).forEach(([name, p]) => {
    state[name] = p.value;
    const label = document.createElement('label'); label.className = 'lab-ctl';
    label.innerHTML = `<span>${p.label}</span><output>${p.value}${p.unit}</output><input type="range" min="${p.min}" max="${p.max}" step="${p.step}" value="${p.value}" aria-label="${data.name} ${p.label}">`;
    const range = label.querySelector('input'); range.dataset.param = name;
    const update = () => {
      label.querySelector('output').value = `${state[name]}${p.unit}`;
      range.style.setProperty('--fill', `${(state[name] - p.min) / (p.max - p.min) * 100}%`);
      range.setAttribute('aria-valuetext', `${state[name]}${p.unit}`); refreshPhrase();
    };
    range.addEventListener('input', () => { state[name] = Number(range.value); update(); }); update();
    root.querySelector('.lab-controls').append(label);
  });
  const wording = () => input.value.trim() || (key === 'split' ? '每个瞬间 都有名字' : 'MOTION LEXICON');
  data.params = () => quoteText(wording()) + ' · ' + Object.entries(data.controls).map(([k, p]) => `${p.label} ${state[k]}${p.unit}`).join(' · ');
  root._replay=replay; if(!override)registerExhibit(key, data, replay);
  root.querySelector('.q').addEventListener('click', () => say(key));
  play.addEventListener('click', () => { say(key); replay(); });
  input.addEventListener('input', () => {
    if (key === 'scramble') input.value = input.value.toUpperCase().replace(/[^A-Z0-9 ./#&+_-]/g, '');
    prepare(); refreshPhrase();
  });
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { say(key); replay(); } });

  function fit() {
    const words = [...lines.children].map(el => el.dataset.word);
    const longest = Math.max(1, ...words.map(word => [...word].reduce((n, c) => n + (key === 'scramble' ? .56 : /[\u3000-\uffef]/.test(c) ? 1 : .65), 0)));
    const width = stage.clientWidth - (innerWidth <= 760 ? 58 : 78);
    lines.style.fontSize = `${Math.min(key === 'split' ? 80 : 100, width / longest)}px`;
  }
  function prepare() {
    run++; running = false; chars.length = 0; lines.replaceChildren(); bars.replaceChildren();
    const value = wording();
    let words = value.split(/\s+/).filter(Boolean);
    if (words.length === 1 && [...words[0]].length > 8) {
      const letters = [...words[0]], mid = Math.ceil(letters.length / 2); words = [letters.slice(0, mid).join(''), letters.slice(mid).join('')];
    }
    // 固定最多两行；输入里多余的空格仍可作为单词间距。
    if (words.length > 2) words = [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')];
    words.forEach(word => {
      const line = document.createElement('div'); line.className = key === 'split' ? 'split-line' : 'scramble-line'; line.dataset.word = word;
      [...word].forEach(char => {
        const el = document.createElement('span'); el.textContent = char;
        if (key === 'split') {
          const mask = document.createElement('span'); mask.className = 'char-mask'; el.className = 'split-char'; mask.append(el); line.append(mask);
        } else { el.className = 'scramble-char locked'; line.append(el); }
        chars.push({ el, char, lockedAt: 0 });
      });
      lines.append(line);
    });
    lines.setAttribute('aria-label', value); lines.setAttribute('role', 'img');
    chars.forEach(() => bars.append(document.createElement('i')));
    status.textContent = `Ready / ${String(chars.length).padStart(2, '0')} characters`;
    progress(chars.length); fit();
  }
  function progress(n) {
    [...bars.children].forEach((bar, i) => bar.classList.toggle('on', i < n));
    counter.value = `${String(n).padStart(2, '0')} / ${String(chars.length).padStart(2, '0')}`;
  }
  function finish() {
    running = false;
    chars.forEach(p => {
      p.el.textContent = p.char;
      if (key === 'split') { p.el.style.transform = 'none'; p.el.style.opacity = '1'; }
      else p.el.className = 'scramble-char locked';
    });
    progress(chars.length); status.textContent = key === 'split' ? 'Sequence complete' : 'Signal locked / 100%';
    if (key === 'scramble') root.querySelector('.stage-label').innerHTML = '<i>●</i> Signal locked';
  }
  function replay() {
    prepare(); SFX.play(key === 'split' ? 'wipe' : 'glitch');
    if (motion.reduced) { finish(); return; }
    running = true; elapsed = 0; nextRefresh = 0; previous = performance.now(); const id = ++run;
    progress(0); status.textContent = key === 'split' ? 'Sequence playing…' : 'Decoding signal…';
    if (key === 'scramble') root.querySelector('.stage-label').innerHTML = '<i>●</i> Decoding signal';
    draw = (now, dt) => {
      if (id !== run || !running) return false;
      elapsed += dt * 1000 * motion.speed; previous = now;
      if (motion.reduced) { finish(); return; }
      if (key === 'split') {
        let complete = 0;
        chars.forEach((p, i) => {
          const t = clamp((elapsed - i * state.stagger) / state.duration, 0, 1);
          const ease = 1 - Math.pow(1 - t, 4);
          p.el.style.transform = `translateY(${(1 - ease) * 114}%) rotate(${(1 - ease) * 7}deg)`;
          p.el.style.opacity = String(clamp(t * 6, 0, 1));
          if (t >= 1) complete++;
        });
        progress(complete);
        if (elapsed >= state.duration + (chars.length - 1) * state.stagger) { finish(); return; }
      } else {
        const lock = clamp(Math.floor((elapsed / state.duration - .18) / .82 * (chars.length + 1)), 0, chars.length);
        const refresh = elapsed >= nextRefresh;
        if (refresh) nextRefresh = elapsed + state.interval;
        const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/';
        chars.forEach((p, i) => {
          if (i < lock) {
            if (!p.lockedAt) p.lockedAt = elapsed;
            p.el.textContent = p.char; p.el.className = `scramble-char locked${elapsed - p.lockedAt < 150 ? ' just-locked' : ''}`;
          } else if (refresh) { p.el.textContent = p.char === ' ' ? ' ' : glyphs[Math.floor(Math.random() * glyphs.length)]; p.el.className = 'scramble-char'; }
        });
        progress(lock);
        if (elapsed >= state.duration) { finish(); return; }
      }
    };
    wake();
  }
  const wake = loop(stage, (now, dt) => draw(now, dt));
  new ResizeObserver(fit).observe(stage); prepare();
  // 首次进展柜时播放一次；之后全部由用户重播，不循环抢注意力。
  const observer = new IntersectionObserver(es => {
    if (es[0].isIntersecting) { if (!motion.reduced) replay(); observer.disconnect(); }
  }, { threshold: .55 }); observer.observe(stage);
}
mountType('split'); mountType('scramble');

export const createTypeComparison=mountType;
