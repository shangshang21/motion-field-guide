// Recorded CC0 sounds are the body. Only the continuous charge is synthesized.
const variants = (prefix, zero = false) => (prefix === 'pluck' ? [0, 1] : [0, 1, 2]).map(i => `${prefix}_${String(i + (zero ? 0 : 1)).padStart(3, '0')}.ogg`);
const groups = {
 tick: ['tick_001.ogg','tick_002.ogg','tick_004.ogg'], push: variants('impactMetal_light', true), up: variants('click'),
 ripple: variants('pluck'), wipe: variants('maximize'), roll: variants('tick'),
 done: variants('confirmation'), start: ['powerUp1.ogg','powerUp2.ogg','powerUp3.ogg'],
 burst: variants('impactSoft_heavy', true), glass: variants('impactGlass_heavy', true),
 glitch: variants('glitch'), jelly: variants('drop'), error: variants('error'),
 magnetic: variants('pluck'), trail: variants('open'), spotlight: variants('maximize'),
 tilt: variants('pluck'), toggle: variants('click'), submit: variants('confirmation'),
 custom: variants('click'), ink: variants('drop'), wave: variants('pluck'), mask: variants('maximize'), typewriter: variants('tick'),
 parallax: variants('open'), pinned: variants('click'), horizontal: variants('maximize'), reveal: variants('open'), velocity: variants('minimize'),
 flip: variants('click'), shared: variants('maximize'), curtain: variants('minimize'), native: variants('open'),
 distortion: variants('pluck'), dissolve: variants('glitch'), gradient: variants('open'), particles: variants('drop'),
};
let ctx, enabled = true, hold, lastTick = 0;
const buffers = new Map(), previous = new Map(), live = new Set();
function context() {
 ctx ||= new (window.AudioContext || window.webkitAudioContext)();
 if (ctx.state === 'suspended') ctx.resume().catch(() => {});
 return ctx;
}
async function load(file) {
 if (!buffers.has(file)) buffers.set(file, fetch(new URL('../../assets/sfx/' + file, import.meta.url)).then(r => { if (!r.ok) throw Error(r.status); return r.arrayBuffer(); }).then(b => context().decodeAudioData(b)).catch(() => { buffers.delete(file); return null; }));
 return buffers.get(file);
}
function unlock() { if (!enabled) return; context(); ['tick','up','push'].forEach(k => groups[k].forEach(load)); }
addEventListener('pointerdown', unlock, { once: true }); addEventListener('keydown', unlock, { once: true });
async function sample(key, delay = 0, volume = 1) {
 if (!enabled || !groups[key]) return;
 const now = performance.now(); if (key === 'tick' && now - lastTick < 75) return; if (key === 'tick') lastTick = now;
 const files = groups[key], choices = files.filter(f => f !== previous.get(key));
 const file = choices[Math.floor(Math.random() * choices.length)]; previous.set(key, file);
 const started = performance.now(), a = context(), buffer = await load(file);
 // A delayed decode should never leave stale sounds queued behind an interaction.
 if (!enabled || !buffer || performance.now() - started > 700) return;
 const source = a.createBufferSource(), gain = a.createGain(); source.buffer = buffer;
 source.playbackRate.value = .95 + Math.random() * .1;
 gain.gain.value = (key === 'tick' ? .10 : .38) * (.85 + Math.random() * .3) * volume;
 source.connect(gain).connect(a.destination); live.add(source); source.onended = () => live.delete(source);
 source.start(a.currentTime + delay);
 files.forEach(load);
}
function holdStop() { if (!hold) return; const {o,g,a} = hold; g.gain.setTargetAtTime(.0001,a.currentTime,.025); o.stop(a.currentTime+.12); hold=null; }
export const SFX = {
 play(key) { sample(key); if (key === 'burst') sample('glass', .028, .65); },
 holdStart() { if (!enabled) return; holdStop(); sample('push'); const a=context(),o=a.createOscillator(),g=a.createGain(); o.type='sine';o.frequency.value=160;g.gain.value=.025;o.connect(g).connect(a.destination);o.start();hold={a,o,g}; },
 holdSet(p) { if (hold) hold.o.frequency.setTargetAtTime(160+p*760,hold.a.currentTime,.02); },
 holdStop,
 toggle() { enabled=!enabled; if (!enabled) { holdStop(); live.forEach(s => { try { s.stop(); } catch {} }); live.clear(); } return enabled; }
};
