/* Card Wizard's original table music and sound effects. */
(() => {
  'use strict';

  const tracks = { play: 'music/table.mp3', shop: 'music/shop.mp3', boss: 'music/boss.mp3', ...window.CWEmbeddedMusic };
  // Three eight-bar arrangements. Each bass note anchors a close upper voicing.
  const scenes = {
    play: {
      bpm: 86,
      transpose: 0,
      chords: [
        [38, 53, 57, 60, 64], [43, 53, 57, 59, 64],
        [36, 52, 55, 59, 62], [40, 50, 55, 59, 62],
        [41, 52, 55, 57, 60], [35, 50, 53, 57, 60],
        [40, 50, 53, 56, 59], [45, 52, 55, 59, 60]
      ]
    },
    shop: {
      bpm: 76,
      transpose: 0,
      chords: [
        [41, 53, 57, 60, 64], [46, 53, 57, 60, 62],
        [38, 53, 57, 60, 64], [43, 53, 57, 59, 64],
        [36, 52, 55, 59, 62], [45, 52, 55, 59, 60],
        [38, 53, 57, 60, 64], [36, 52, 55, 58, 62]
      ]
    },
    boss: {
      bpm: 101,
      transpose: -2,
      chords: [
        [40, 52, 55, 59, 62], [41, 53, 57, 60, 64],
        [40, 52, 55, 59, 62], [35, 51, 57, 59, 62],
        [36, 52, 55, 59, 62], [38, 53, 57, 60, 64],
        [35, 51, 54, 57, 60], [35, 51, 57, 59, 62]
      ]
    }
  };

  // Positions on the eighth-note grid and indexes within the upper voicing.
  const phrases = [
    [[3, 4], [5, 3], [7, 2]], [[2, 1], [6, 4]],
    [[0, 3], [3, 2], [5, 1]], [[4, 2]],
    [[1, 4], [4, 3], [7, 1]], [[2, 2], [5, 3]],
    [[0, 4], [3, 2], [6, 1]], [[1, 2], [4, 3]]
  ];

  let context = null;
  let master, musicBus, effectsBus, space, noiseBuffer;
  let muted = false;
  let musicEnabled = true;
  let musicVolume = 1;
  let effectVolume = 1;
  let scene = 'play';
  let timer = null;
  let tick = 0;
  let nextTime = 0;
  let voices = 0;
  let lastRapidEffect = -1;
  let unlocked = false;
  let player = null;
  let playerScene = null;
  let recordedPlaying = false;
  let playbackBlocked = false;
  let playRequest = null;
  const unavailable = new Set();
  const positions = {};
  const frequency = midi => 440 * 2 ** ((midi - 69) / 12);

  function routeVolume(node, volume) {
    if (!node) return;
    const now = context.currentTime;
    node.gain.cancelScheduledValues(now);
    node.gain.setTargetAtTime(volume, now, .018);
  }

  function tone(bus, midi, time, length, level, wave = 'sine', glide = 0) {
    if (voices >= 56) return;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency(midi), time);
    if (glide) oscillator.frequency.exponentialRampToValueAtTime(frequency(midi + glide), time + length);
    envelope.gain.setValueAtTime(.0001, time);
    envelope.gain.exponentialRampToValueAtTime(level, time + Math.min(.014, length / 4));
    envelope.gain.exponentialRampToValueAtTime(.0001, time + length);
    oscillator.connect(envelope);
    envelope.connect(bus);
    voices++;
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
      voices--;
    };
    oscillator.start(time);
    oscillator.stop(time + length + .015);
  }

  function brush(bus, time, length, level, cutoff, q = .7) {
    if (voices >= 56) return;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    source.buffer = noiseBuffer;
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(cutoff, time);
    filter.Q.value = q;
    envelope.gain.setValueAtTime(.0001, time);
    envelope.gain.exponentialRampToValueAtTime(level, time + .005);
    envelope.gain.exponentialRampToValueAtTime(.0001, time + length);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(bus);
    voices++;
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      envelope.disconnect();
      voices--;
    };
    source.start(time, Math.random() * .3);
    source.stop(time + length + .01);
  }

  function bell(bus, midi, time, length, level) {
    tone(bus, midi, time, length, level);
    tone(bus, midi + 19, time, length * .26, level * .18);
  }

  function playTick(index, time) {
    const config = scenes[scene];
    const bar = Math.floor(index / 8) % 8;
    const step = index % 8;
    const chord = config.chords[bar];
    const beat = 60 / config.bpm;
    const at = time + (step % 2 ? .055 * beat : 0);
    const shift = config.transpose;
    if (step === 0 || step === 4) {
      const note = step === 0 ? chord[0] : chord[0] + 7;
      tone(musicBus, note + shift, at, beat * 1.4, .19, 'triangle');
    }
    if (step === 2 || step === 7 && bar % 2 === 0) {
      chord.slice(1).forEach((note, i) => {
        tone(musicBus, note + shift, at + i * .011, beat * 1.7, .047, 'triangle');
      });
    }
    const phrase = phrases[bar].find(([position]) => position === step);
    if (phrase) {
      const register = Math.floor(index / 64) % 2 && bar === 4 ? 0 : 12;
      bell(musicBus, chord[phrase[1]] + shift + register, at + .016, beat * 1.8, .093);
    }
    if (step === 2 || step === 6) brush(musicBus, at, .09, .044, 1950);
    if (step % 2 && scene !== 'shop') brush(musicBus, at, .042, .025, 6350);
    if (scene === 'boss' && (step === 0 || step === 5)) {
      tone(musicBus, 39, at, .14, .17, 'sine', -13);
    }
  }

  function stopClock() {
    if (timer !== null) clearInterval(timer);
    timer = null;
  }

  function schedule() {
    if (!context || context.state !== 'running' || document.hidden || muted || !musicEnabled || !musicVolume || recordedPlaying) return;
    const now = context.currentTime;
    if (nextTime < now - .025) nextTime = now + .045;
    while (nextTime < now + .16) {
      playTick(tick++, nextTime);
      nextTime += 30 / scenes[scene].bpm;
    }
  }

  function syncClock() {
    if (!context) return;
    const useSynth = context.state === 'running' && !document.hidden && !muted && musicEnabled && musicVolume && !recordedPlaying;
    routeVolume(musicBus, useSynth ? .43 * musicVolume : 0);
    if (!useSynth) {
      stopClock();
    } else if (timer === null) {
      nextTime = context.currentTime + .09;
      schedule();
      timer = setInterval(schedule, 85);
    }
  }

  function setRecordedPlaying(value) {
    if (recordedPlaying === value) return;
    recordedPlaying = value;
    syncClock();
  }

  function pauseTrack() {
    const pending = Boolean(playRequest);
    playRequest = null;
    if (player && (pending || !player.paused)) player.pause();
    setRecordedPlaying(false);
  }

  function createPlayer() {
    // Native media loading works for sibling files opened from disk as well as over HTTP.
    player = new window.Audio();
    player.preload = 'auto';
    player.loop = true;
    player.volume = .23 * musicVolume;
    player.onloadedmetadata = () => {
      const resumeAt = positions[playerScene];
      if (resumeAt > 0 && resumeAt < player.duration) player.currentTime = resumeAt;
    };
    player.onplaying = () => {
      if (muted || !musicEnabled || !musicVolume || document.hidden || playerScene !== scene) pauseTrack();
      else if (!player.paused) setRecordedPlaying(true);
    };
    player.onwaiting = () => setRecordedPlaying(false);
    player.onpause = () => { if (player.paused) setRecordedPlaying(false); };
    player.onerror = () => {
      if (!player.error || !playerScene) return;
      unavailable.add(playerScene);
      pauseTrack();
    };
  }

  function syncMusic() {
    if (!unlocked || document.hidden || muted || !musicEnabled || !musicVolume || unavailable.has(scene) || !window.Audio) {
      pauseTrack();
      syncClock();
      return;
    }
    if (!player) createPlayer();
    if (playerScene !== scene) {
      if (playerScene && Number.isFinite(player.currentTime)) positions[playerScene] = player.currentTime;
      pauseTrack();
      playerScene = scene;
      playbackBlocked = false;
      player.src = tracks[scene];
    }
    if (player.paused && !playRequest && !playbackBlocked) {
      const request = {};
      playRequest = request;
      const failed = error => {
        if (playRequest !== request) return;
        if (error?.name === 'NotSupportedError') unavailable.add(scene);
        else playbackBlocked = true;
        pauseTrack();
      };
      try {
        Promise.resolve(player.play()).then(() => {
          if (playRequest === request) playRequest = null;
        }, failed);
      } catch (error) { failed(error); }
    }
    syncClock();
  }

  function unlock() {
    if (document.hidden) return;
    unlocked = true;
    playbackBlocked = false;
    syncMusic();
    if (!context) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      try {
        context = new Audio();
      } catch {
        return;
      }
      master = context.createGain();
      musicBus = context.createGain();
      effectsBus = context.createGain();
      space = context.createDelay(1);
      const echo = context.createGain();
      master.gain.value = muted ? 0 : .8;
      musicBus.gain.value = musicEnabled ? .43 * musicVolume : 0;
      effectsBus.gain.value = .76 * effectVolume;
      space.delayTime.value = .208;
      echo.gain.value = .15;
      musicBus.connect(space);
      space.connect(echo);
      echo.connect(master);
      musicBus.connect(master);
      effectsBus.connect(master);
      master.connect(context.destination);
      noiseBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * .65), context.sampleRate);
      const samples = noiseBuffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      context.onstatechange = syncClock;
    }
    if (context.state !== 'running') context.resume().then(syncClock).catch(() => {});
    else syncClock();
  }

  function setScene(name) {
    if (!Object.hasOwn(scenes, name) || name === scene) return;
    scene = name;
    tick = 0;
    syncMusic();
  }

  function setMuted(value) {
    if (Boolean(value) === muted) return;
    muted = Boolean(value);
    routeVolume(master, muted ? 0 : .8);
    syncMusic();
  }

  function setMusic(value) {
    musicEnabled = Boolean(value);
    syncMusic();
  }

  function setVolumes(music, effects) {
    const nextMusic = Math.min(1, Math.max(0, Number(music) || 0));
    const nextEffects = Math.min(1, Math.max(0, Number(effects) || 0));
    if (nextMusic !== musicVolume) {
      musicVolume = nextMusic;
      if (player) player.volume = .23 * musicVolume;
      syncMusic();
    }
    if (nextEffects !== effectVolume) {
      effectVolume = nextEffects;
      routeVolume(effectsBus, .76 * effectVolume);
    }
  }

  function event(name, step = 0) {
    if (!context || muted || !effectVolume || document.hidden || context.state === 'closed') return;
    const now = context.currentTime + .006;
    const fx = effectsBus;
    if (name === 'select' || name === 'deselect' || name === 'deal') {
      if (now - lastRapidEffect < .028) return;
      lastRapidEffect = now;
    }
    switch (name) {
      case 'select':
      case 'deselect':
        brush(fx, now, .047, .14, name === 'select' ? 3300 : 2200);
        tone(fx, name === 'select' ? 78 : 72, now, .065, .055, 'triangle', -3);
        break;
      case 'deal':
      case 'discard':
        for (let i = 0; i < (name === 'discard' ? 3 : 1); i++) {
          brush(fx, now + i * .049, .10, .19, 2600 - i * 260);
          tone(fx, 52 - i, now + i * .049 + .045, .055, .066, 'triangle', -6);
        }
        break;
      case 'play':
        brush(fx, now, .13, .18, 1750);
        [50, 57, 64].forEach((note, i) => bell(fx, note, now + i * .042, .31, .10));
        break;
      case 'score': {
        const scale = [67, 69, 72, 74, 76, 79, 81, 84, 86];
        const note = scale[Math.max(0, Math.min(scale.length - 1, Math.floor(step) || 0))];
        bell(fx, note, now, .24, .13);
        break;
      }
      case 'coin':
        bell(fx, 82+step*2, now, .16, .11);
        bell(fx, 94+step*2, now+.028, .12, .055);
        break;
      case 'win':
        [62, 67, 71, 74, 79].forEach((note, i) => bell(fx, note, now + i * .084, .77, .15));
        break;
      case 'lose':
        [62, 59, 55, 50].forEach((note, i) => tone(fx, note, now + i * .16, .70, .115, 'triangle'));
        break;
      case 'shop':
      case 'buy':
        [name === 'buy' ? 83 : 71, name === 'buy' ? 90 : 78].forEach((note, i) => {
          bell(fx, note, now + i * .082, .40, .115);
        });
        break;
      case 'error':
        tone(fx, 45, now, .14, .11, 'triangle', -4);
        break;
    }
  }

  function retryTrack() {
    if (playbackBlocked) {
      playbackBlocked = false;
      syncMusic();
    }
  }
  document.addEventListener('pointerdown', retryTrack, { capture: true });
  document.addEventListener('keydown', retryTrack, { capture: true });
  document.addEventListener('visibilitychange', () => {
    if (!unlocked) return;
    if (document.hidden) {
      pauseTrack();
      stopClock();
      if (context) context.suspend().catch(() => {});
    } else {
      unlock();
    }
  });

  window.CWSound = { unlock, setMuted, setMusic, setVolumes, setScene, event };
})();
