// 每次起爆都独立积分：速度拉伸火花，阻力削弱碎片速度，重力留下下坠的尾巴。
const TAU = Math.PI * 2;
const ORANGE = '#ff5b00', INK = '#111110', PAPER = '#f2f0eb';
const running = new WeakSet();
const random = (min, max) => min + Math.random() * (max - min);

export async function impact(button, { motion, sound, charged = false }) {
  if (running.has(button)) return;
  running.add(button);
  const pad = button.closest('.pad');
  if (motion.reduced) {
    sound();
    pad.classList.add('impact-rest');
    setTimeout(() => { pad.classList.remove('impact-rest'); running.delete(button); }, 220);
    return;
  }

  // 先收紧，再保留约三帧的压缩姿态。爆点在这段定格里出现。
  const windup = button.animate([
    { transform: 'scale(1)' }, { transform: 'scale(.88,.91)' },
  ], { duration: motion.ms(80), easing: 'cubic-bezier(.65,0,1,1)', fill: 'forwards' });
  await windup.finished;
  sound();
  pad.classList.add('impact-stop');
  if (charged) document.querySelector('#app').animate([
    { transform: 'translate(0,0)' }, { transform: 'translate(-3px,2px)' },
    { transform: 'translate(3px,-2px)' }, { transform: 'translate(-2px,1px)' },
    { transform: 'translate(1px,0)' }, { transform: 'translate(0,0)' },
  ], { duration: motion.ms(240), easing: 'steps(1)' });

  const cv = document.createElement('canvas');
  cv.className = 'impact-canvas'; cv.setAttribute('aria-hidden', 'true'); pad.append(cv);
  const pr = pad.getBoundingClientRect(), br = button.getBoundingClientRect();
  const width = pr.width, height = pr.height, dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = Math.round(width * dpr); cv.height = Math.round(height * dpr);
  const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
  const cx = br.left - pr.left + br.width / 2, cy = br.top - pr.top + br.height / 2;
  const power = charged ? 1.18 : 1;
  const sparks = Array.from({ length: charged ? 34 : 27 }, (_, i) => {
    // 每条射线稍微错开；横向为主的射流让小展柜里的爆点仍然完整。
    const angle = i / 27 * TAU + random(-.17, .17), velocity = random(360, 820) * power;
    return { x: 0, y: 0, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity * .7,
      age: 0, life: random(.17, .43), width: random(.8, 2.1), color: i % 4 ? ORANGE : INK };
  });
  const debris = Array.from({ length: charged ? 17 : 13 }, (_, i) => {
    const angle = random(0, TAU), velocity = random(160, 440) * power;
    const size = random(3, 9);
    return { x: 0, y: 0, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity * .65 - 75,
      rot: random(0, TAU), spin: random(-13, 13), life: random(.65, 1.15), size,
      color: i % 3 ? INK : ORANGE,
      shape: [[-size, -size * .24], [size * .1, -size * .65], [size * .85, size * .15], [-size * .2, size * .57]] };
  });
  const smoke = Array.from({ length: 6 }, (_, i) => ({
    x: random(-20, 20), y: random(-8, 8), vx: random(-35, 35), vy: random(-30, -12),
    radius: random(16, 28), delay: .1 + i * .035,
  }));
  let age = 0, previous = performance.now(), freeze = .045, released = false;
  function render(now) {
    const step = Math.min((now - previous) / 1000, .04) * motion.speed; previous = now;
    freeze -= step;
    const dt = freeze > 0 ? 0 : step;
    if (freeze <= 0 && !released) {
      released = true; pad.classList.remove('impact-stop'); windup.cancel();
      button.animate([{ transform: 'scale(.88,.91)' }, { transform: 'scale(1.05,1.02)', offset: .45 },
        { transform: 'scale(1)' }], { duration: motion.ms(290), easing: 'cubic-bezier(.16,1,.3,1)' });
    }
    age += dt;
    ctx.clearRect(0, 0, width, height);
    ctx.save(); ctx.translate(cx, cy);
    // 烟先画在后面，延迟出现；不会把白色核心糊成一团灰。
    smoke.forEach(p => {
      const t = age - p.delay;
      if (t <= 0) return;
      const r = p.radius + t * 36, x = p.x + p.vx * t, y = p.y + p.vy * t;
      const opacity = Math.min(t * 1.4, .16) * Math.max(0, 1 - t / 1.25);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(100,97,89,${opacity})`); g.addColorStop(1, 'rgba(100,97,89,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    });
    // 核心闪光只存在很短的一瞬；两圈冲击波以不同速度展开并变细。
    if (age < .14) {
      const alpha = Math.max(0, 1 - age / .14), r = 80 + age * 180;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, `rgba(242,240,235,${alpha})`);
      g.addColorStop(.24, `rgba(255,91,0,${alpha * .8})`);
      g.addColorStop(1, 'rgba(255,91,0,0)');
      ctx.fillStyle = g; ctx.fillRect(-r, -r, r * 2, r * 2);
      ctx.fillStyle = PAPER;
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const angle = i / 16 * TAU, radius = (i % 2 ? 10 : 47) * alpha;
        ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      }
      ctx.closePath(); ctx.fill();
    }
    [0, .04].forEach((delay, i) => {
      const t = age - delay;
      if (t < 0 || t > .37) return;
      ctx.globalAlpha = (1 - t / .37) * (i ? .45 : .95);
      ctx.strokeStyle = i ? INK : ORANGE; ctx.lineWidth = Math.max(.35, 5 * (1 - t / .37));
      ctx.beginPath(); ctx.ellipse(0, 0, 18 + t * 560 * power, 12 + t * 390 * power, -.12, 0, TAU); ctx.stroke();
    });
    ctx.globalAlpha = 1;
    sparks.forEach(p => {
      p.age += dt;
      if (p.age > p.life) return;
      const drag = Math.exp(-6.2 * dt); p.vx *= drag; p.vy = p.vy * drag + 130 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const speed = Math.hypot(p.vx, p.vy), length = Math.max(2, speed * .047);
      ctx.globalAlpha = Math.pow(1 - p.age / p.life, .7);
      ctx.strokeStyle = p.color; ctx.lineWidth = p.width; ctx.lineCap = 'round';
      ctx.shadowColor = ORANGE; ctx.shadowBlur = p.color === ORANGE ? 5 : 0;
      ctx.beginPath(); ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx / speed * length, p.y - p.vy / speed * length); ctx.stroke();
    });
    ctx.shadowBlur = 0; ctx.lineCap = 'butt';
    debris.forEach(p => {
      if (age > p.life) return;
      const drag = Math.exp(-2.1 * dt); p.vx *= drag; p.vy = p.vy * drag + 440 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.spin * dt;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.globalAlpha = Math.min(1, (p.life - age) / .25); ctx.fillStyle = p.color;
      ctx.beginPath(); p.shape.forEach(v => ctx.lineTo(...v)); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = PAPER; ctx.lineWidth = .7;
      ctx.beginPath(); ctx.moveTo(...p.shape[0]); ctx.lineTo(...p.shape[1]); ctx.stroke(); ctx.restore();
    });
    ctx.restore();
    if (age < 1.55 && !motion.reduced && cv.isConnected) requestAnimationFrame(render);
    else { cv.remove(); pad.classList.remove('impact-stop'); windup.cancel(); running.delete(button); }
  }
  requestAnimationFrame(render);
}
