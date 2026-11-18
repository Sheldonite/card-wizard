/* Card Wizard's original table music and sound effects. */
(() => {
  'use strict';

  const tracks = { play: 'music/table.mp3', menu: 'music/rewards.wav', boss: 'music/boss.mp3', ...window.CWEmbeddedMusic };
  // Synth arrangements cover devices that cannot load the recorded tracks.
  const scenes = {
    menu: {
      bpm: 68,
      chords: [
        [50,57,60,64], [43,55,59,64], [48,55,59,62], [45,55,60,64],
        [53,57,60,64], [43,55,59,62], [45,55,59,64], [50,57,60,64]
      ]
    },
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
  const players = new Map();
  let playbackBlocked = false;
  let playRequest = null;
  let curtain = false, curtainLevel = 1, fadeFrame = 0;
  const unavailable = new Set();
  const frequency = midi => 440 * 2 ** ((midi - 69) / 12);

  function routeVolume(node, volume) {
    if (!node) return;
    const now = context.currentTime;
    node.gain.cancelScheduledValues(now);
    node.gain.setTargetAtTime(volume, now, .018);
  }

  function tone(bus, midi, time, length, level, wave = 'sine', glide = 0, attack = .014) {
    if (voices >= 56) return;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency(midi), time);
    if (glide) oscillator.frequency.exponentialRampToValueAtTime(frequency(midi + glide), time + length);
    envelope.gain.setValueAtTime(.0001, time);
    envelope.gain.exponentialRampToValueAtTime(level, time + Math.min(attack, length / 2));
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
    if (scene === 'menu') {
      playMenuTick(index, time);
      return;
    }
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
    if (step % 2) brush(musicBus, at, .042, .025, 6350);
    if (scene === 'boss' && (step === 0 || step === 5)) {
      tone(musicBus, 39, at, .14, .17, 'sine', -13);
    }
  }

  // A lilting three-beat phrase: felt keys ask a question, then a low flute answers.
  const menuMelody = [
    [0,0,0,69,0,72], [71,0,0,67,0,0], [0,0,64,0,67,0], [69,0,0,0,0,0],
    [0,0,69,0,72,74], [71,0,67,0,0,0], [0,0,64,0,67,0], [62,0,0,0,0,0]
  ];
  function playMenuTick(index, time) {
    const step = index % 6;
    const bar = Math.floor(index / 6) % menuMelody.length;
    const [bass, ...harmony] = scenes.menu.chords[bar];
    if (step === 0) {
      tone(musicBus, bass, time, 2.6, .068, 'sine', 0, .38);
      harmony.forEach((pitch,i) => tone(musicBus, pitch, time + .06*i, 2.8, .025, 'sine', 0, .55));
    }
    const note = menuMelody[bar][step];
    if (note) {
      const flute = bar % 2 === 1;
      tone(musicBus, note, time, flute ? 1.42 : .95, flute ? .063 : .075, 'sine', 0, flute ? .17 : .055);
      if (!flute) tone(musicBus, note + 12, time, .48, .012, 'sine', 0, .06);
    }
  }

  function stopClock() {
    if (timer !== null) clearInterval(timer);
    timer = null;
  }

  function needsSynth() {
    return !window.Audio || unavailable.has(scene) || playbackBlocked;
  }

  function schedule() {
    if (!context || context.state !== 'running' || document.hidden || muted || !musicEnabled || !musicVolume || !needsSynth()) return;
    const now = context.currentTime;
    if (nextTime < now - .025) nextTime = now + .045;
    while (nextTime < now + .16) {
      playTick(tick++, nextTime);
      nextTime += 30 / scenes[scene].bpm;
    }
  }

  function syncClock() {
    if (!context) return;
    const useSynth = context.state === 'running' && !document.hidden && !muted && musicEnabled && musicVolume && curtainLevel > 0 && needsSynth();
    routeVolume(musicBus, useSynth ? .43 * musicVolume * curtainLevel : 0);
    if (!useSynth) {
      stopClock();
    } else if (timer === null) {
      nextTime = context.currentTime + .09;
      schedule();
      timer = setInterval(schedule, 85);
    }
  }

  function pauseTrack() {
    const pending = Boolean(playRequest);
    playRequest = null;
    if (player && (pending || !player.paused)) player.pause();
  }

  function playerFor(theme) {
    if (players.has(theme)) return players.get(theme);
    const media = new window.Audio();
    media.preload = 'auto';
    media.loop = true;
    media.onerror = () => {
      if (!media.error) return;
      unavailable.add(theme);
      if (theme === scene) syncMusic();
    };
    media.src = tracks[theme];
    players.set(theme, media);
    return media;
  }

  function syncMusic() {
    if (!unlocked || document.hidden || muted || !musicEnabled || !musicVolume || curtainLevel === 0 || needsSynth()) {
      pauseTrack();
      syncClock();
      return;
    }
    player = playerFor(scene);
    player.volume = .23 * musicVolume * curtainLevel;
    if (player.paused && !playRequest && !playbackBlocked) {
      const request = {};
      playRequest = request;
      const failed = error => {
        if (playRequest !== request) return;
        if (error?.name === 'NotSupportedError') unavailable.add(scene);
        else playbackBlocked = true;
        syncMusic();
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
      musicBus.gain.value = musicEnabled ? .43 * musicVolume * curtainLevel : 0;
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

  function setCurtain(ending) {
    if (ending === curtain) return;
    curtain = ending;
    cancelAnimationFrame(fadeFrame);
    const started = performance.now(), initial = curtainLevel;
    function fade(now) {
      const t = Math.min(1, (now - started) / (ending ? 8500 : 750));
      const ease = t * t * (3 - 2 * t);
      curtainLevel = initial + ((ending ? 0 : 1) - initial) * ease;
      if (player) player.volume = .23 * musicVolume * curtainLevel;
      if (context && needsSynth()) routeVolume(musicBus, musicEnabled && !muted ? .43 * musicVolume * curtainLevel : 0);
      if (t < 1) fadeFrame = requestAnimationFrame(fade);
      else syncMusic();
    }
    // Wake a track that finished fading out even when the destination uses the same theme.
    if (!ending && !curtainLevel) curtainLevel = .0001;
    if (!ending) syncMusic();
    fadeFrame = requestAnimationFrame(fade);
  }
  function setScene(name) {
    if (!Object.hasOwn(scenes, name) || name === scene) return;
    pauseTrack();
    player = null;
    playbackBlocked = false;
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
      case 'proc-daybreak_minnow':
        tone(fx, 67, now, .066, .066, 'sine', 7, .005);
        tone(fx, 79, now + .055, .13, .034, 'sine', -2, .007);
        break;
      case 'proc-tin_echo':
        bell(fx, 71, now, .145, .054);
        bell(fx, 78, now + .081, .15, .037);
        break;
      case 'proc-copper_plover':
        brush(fx, now, .045, .064, 810);
        tone(fx, 48, now, .072, .064, 'triangle', -6, .005);
        bell(fx, 76, now + .037, .11, .03);
        break;
      case 'proc-linen_sprite':
        tone(fx, 74, now, .092, .045, 'triangle', -5, .004);
        brush(fx, now + .044, .085, .034, 2450, 1.5);
        break;
      case 'proc-fox_in_ink':
        brush(fx, now, .12, .052, 1280, .85);
        brush(fx, now + .074, .07, .034, 1830, 1.1);
        tone(fx, 60, now + .11, .082, .028, 'sine', -3);
        break;
      case 'proc-second_shadow':
        tone(fx, 62, now, .13, .044, 'sine', -2, .024);
        tone(fx, 62, now + .12, .145, .024, 'sine', -2, .028);
        break;
      case 'charge-kettle_hag':
        tone(fx, 47, now, .073, .049, 'sine', 10, .006);
        tone(fx, 52, now + .069, .085, .04, 'sine', 12, .006);
        break;
      case 'proc-kettle_hag':
        bell(fx, 75, now, .115, .052);
        brush(fx, now + .023, .15, .05, 2150, .85);
        bell(fx, 75, now + .108, .105, .034);
        break;
      case 'charge-kiln_crawler':
        tone(fx, 48, now, .052, .055, 'triangle', -4, .004);
        brush(fx, now + .033, .11, .042, 1200, 1.1);
        break;
      case 'proc-kiln_crawler':
        tone(fx, 41, now, .155, .074, 'triangle', -5, .006);
        [66, 71, 69].forEach((note, i) => bell(fx, note, now + .036 + i * .037, .075, .031));
        break;
      case 'charge-dusk_undertaker':
        brush(fx, now, .105, .049, 720, .65);
        tone(fx, 52, now + .032, .17, .048, 'sine', -8, .022);
        break;
      case 'proc-dusk_undertaker':
        tone(fx, 41, now, .245, .069, 'sine', 7, .031);
        tone(fx, 53, now + .036, .185, .041, 'triangle', 7, .032);
        bell(fx, 67, now + .141, .143, .031);
        break;
      case 'proc-needle_crow':
        brush(fx, now, .065, .049, 2630, 1.3);
        tone(fx, 81, now + .031, .085, .04, 'triangle', -9, .005);
        break;
      case 'proc-amber_magpie':
        tone(fx, 79, now, .062, .045, 'sine', 5, .005);
        bell(fx, 83, now + .054, .15, .048);
        break;
      case 'proc-marmalade_bat':
        brush(fx, now, .064, .047, 1450, .7);
        tone(fx, 68, now + .03, .095, .051, 'sine', -12, .012);
        bell(fx, 76, now + .102, .095, .036);
        break;
      case 'proc-alabaster_finch':
        tone(fx, 62, now, .053, .061, 'triangle', -5, .003);
        tone(fx, 80, now + .042, .078, .032, 'sine', 6, .008);
        if (step === 1) bell(fx, 84, now + .109, .145, .039);
        break;
      case 'proc-dustfin':
        brush(fx, now, .163, .061, 1620, .95);
        brush(fx, now + .063, .107, .039, 2510, 1.3);
        tone(fx, 72, now + .141, .089, .041, 'sine', -3, .004);
        break;
      case 'proc-glimmer_orca':
        tone(fx, 62, now, .152, .061, 'sine', -18, .018);
        brush(fx, now + .09, .134, .048, 790, .8);
        tone(fx, 48, now + .129, .166, .048, 'sine', 10, .041);
        break;
      case 'proc-moss_badger':
        brush(fx, now, .071, .055, 1020, 1.7);
        [55, 51, 47].forEach((note, i) => tone(fx, note, now + .045 + i * .047, .067, .051 - i * .009, 'triangle', -5, .003));
        break;
      case 'proc-lattice_toad':
        [53, 60, 65].forEach((note, i) => tone(fx, note, now + i * .043, .106, .043, 'triangle', -1, .003));
        break;
      case 'proc-veil_firefly':
        bell(fx, 73, now, .192, .039);
        bell(fx, 85, now + .091, .188, .028);
        break;
      case 'proc-brass_lantern':
        tone(fx, 57, now, .122, .051, 'triangle', 0, .007);
        bell(fx, 76, now + .035, .14, .043);
        if (step === 2) {
          brush(fx, now + .095, .101, .03, 1800);
          tone(fx, 81, now + .115, .15, .035, 'sine', 5);
        }
        break;
      case 'proc-silken_broker':
        brush(fx, now, .113, .048, 2290, 1.4);
        tone(fx, 72, now + .032, .089, .043, 'sine', 5, .019);
        bell(fx, 81, now + .092, .104, .038);
        if (step === 2) bell(fx, 86, now + .15, .099, .029);
        break;
      case 'proc-shopbell_sprite':
        bell(fx, 78, now, .165, .062);
        tone(fx, 70, now + .014, .085, .026, 'triangle', -1, .003);
        if (step === 2) bell(fx, 78, now + .105, .164, .041);
        break;
      case 'proc-mire_printer':
        if (step === 1) brush(fx, now, .095, .048, 1310, 1.2);
        tone(fx, 49, now + .05, .072, .065, 'triangle', -9, .004);
        brush(fx, now + .054, .055, .036, 840);
        if (step === 1) tone(fx, 66, now + .117, .086, .031, 'triangle', 2, .006);
        break;
      case 'proc-granite_tinker':
        tone(fx, 66, now, .086, .05, 'triangle', -2, .003);
        tone(fx, 84, now + .003, .047, .027, 'sine', -1, .003);
        if (step === 1) {
          brush(fx, now + .067, .067, .031, 2880, 2.1);
          bell(fx, 73, now + .116, .138, .04);
        }
        break;
      case 'proc-vault_maggot':
        tone(fx, 44, now, .073, .063, 'sine', 5, .008);
        tone(fx, 54, now + .068, .126, .043, 'triangle', -5, .019);
        if (step === 1) {
          brush(fx, now + .128, .057, .035, 910, 1.6);
          tone(fx, 62, now + .163, .099, .036, 'sine', 7, .008);
        }
        break;
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

  window.CWSound = { unlock, setMuted, setMusic, setVolumes, setScene, setCurtain, event };
})();
