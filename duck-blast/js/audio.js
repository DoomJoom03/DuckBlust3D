const Sfx = (() => {
  let ctx = null;
  let noiseBuffer = null;
  function init() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  function noise(duration, freq, gain) {
    if (!ctx) return;
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const amp = ctx.createGain();
    src.buffer = noiseBuffer;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(freq, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + duration);
    amp.gain.setValueAtTime(gain, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    src.connect(filter).connect(amp).connect(ctx.destination);
    src.start();
    src.stop(ctx.currentTime + duration);
  }
  function tone(type, from, to, duration, gain) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(to, ctx.currentTime + duration);
    amp.gain.setValueAtTime(gain, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(amp).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }
  return {
    init,
    shot() { noise(0.35, 3200, 0.9); tone("square", 140, 40, 0.2, 0.35); },
    click() { tone("square", 900, 600, 0.04, 0.15); },
    pump() { tone("square", 220, 110, 0.07, 0.2); setTimeout(() => tone("square", 160, 260, 0.07, 0.2), 140); },
    hit() { tone("sawtooth", 520, 110, 0.25, 0.25); },
    quack() { tone("sawtooth", 420, 260, 0.12, 0.08); },
    lose() { tone("triangle", 330, 70, 0.7, 0.35); }
  };
})();
