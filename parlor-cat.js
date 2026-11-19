(function (root) {
  "use strict";

  // Rigged multi-part canvas animation for the parlor witch cat behind the velvet table.
  // Coordinates match the 420x320 crop (x:960..1380, y:340..660) of midnight-parlor.webp (1672x941).
  const W = 420, H = 320;
  const RIM_Y = 245; // Center of the gold-trimmed back rim of the round velvet table
  const SCALE = 0.84;

  // Sprite atlas rectangles in assets/parlor-cat.png (512x420)
  const SPRITES = {
    head:  { x: 0,   y: 0,   w: 294, h: 180 },
    tail:  { x: 300, y: 0,   w: 118, h: 130 },
    moon:  { x: 424, y: 0,   w: 38,  h: 46  },
    pawL:  { x: 424, y: 52,  w: 60,  h: 48  },
    pawR:  { x: 424, y: 106, w: 60,  h: 48  },
    body:  { x: 0,   y: 188, w: 310, h: 224 }
  };

  let atlas = null, loading = false, canvas = null, ctx = null;
  let rafId = 0, startTime = 0, lastFrame = 0;
  let moonAngle = 0, moonVel = 0, prevHeadX = 0, prevHeadRot = 0;
  let trickTime = -Infinity, cycleOffset = 2.6; // Start perched with paws on the table

  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => { t = clamp01(t); return t * t * (3 - 2 * t); };
  const easeOutBack = t => {
    t = clamp01(t);
    const c1 = 1.55, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };
  const still = () =>
    document.body.classList.contains("still") ||
    root.matchMedia("(prefers-reduced-motion:reduce)").matches;

  function rimY(x) {
    const dx = (x - W / 2) / (W / 2);
    return RIM_Y + dx * dx * 7;
  }

  function clipBehindRim() {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W, rimY(W));
    for (let x = W - 20; x >= 0; x -= 20) ctx.lineTo(x, rimY(x));
    ctx.closePath();
    ctx.clip();
  }

  function drawSprite(s, x, y, sc = SCALE) {
    ctx.drawImage(atlas, s.x, s.y, s.w, s.h, x, y, s.w * sc, s.h * sc);
  }

  function drawEyelid(cx, cy, rx, ry, rot, close, happy) {
    if (close <= 0.01) return;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    // Clip to eye shape
    ctx.beginPath();
    ctx.ellipse(0, 0, rx + 2, ry + 2, 0, 0, Math.PI * 2);
    ctx.clip();

    if (happy) {
      // Fill eye with soft lavender fur, then draw happy upward-curved ^ lash line
      ctx.globalAlpha = clamp01(close * 1.4);
      ctx.fillStyle = "#8e50b8";
      ctx.fillRect(-rx - 4, -ry - 4, (rx + 4) * 2, (ry + 4) * 2);
      ctx.beginPath();
      ctx.moveTo(-rx * 0.92, ry * 0.25);
      ctx.quadraticCurveTo(0, -ry * 0.72, rx * 0.92, ry * 0.25);
      ctx.strokeStyle = "#291036";
      ctx.lineWidth = 3.2;
      ctx.lineCap = "round";
      ctx.stroke();
    } else {
      // Smooth top-down blink eyelid
      const lidY = lerp(-ry - 2, ry + 1, close);
      ctx.fillStyle = "#8e50b8";
      ctx.fillRect(-rx - 4, -ry - 5, (rx + 4) * 2, lidY + ry + 5);
      ctx.beginPath();
      ctx.moveTo(-rx - 1, lidY);
      ctx.quadraticCurveTo(0, lidY + 4.5, rx + 1, lidY);
      ctx.strokeStyle = "#2c123a";
      ctx.lineWidth = 2.6;
      ctx.lineCap = "round";
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawEyeHighlight(cx, cy, gazeX, gazeY, blink) {
    if (blink > 0.45) return;
    ctx.save();
    ctx.globalAlpha = (1 - blink / 0.45) * 0.78;
    ctx.fillStyle = "#fff8dc";
    ctx.beginPath();
    ctx.arc(cx + gazeX, cy + gazeY, 2.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawTrickSparkles(progress) {
    const reach = Math.min(1, progress * 3.5);
    const fade = Math.min(1, (1 - progress) * 2.1);
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.shadowColor = "#ffb84d";
    ctx.shadowBlur = 5;
    ctx.strokeStyle = "#ffebb3";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    for (let i = 0; i < 3; i++) {
      const x = 132 - i * 4, y = 216 + i * 3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x - 28 * reach, y - 14 * reach, x - (52 + i * 3) * reach, y - (38 - i * 3) * reach);
      ctx.stroke();
    }
    ctx.fillStyle = "#fff2c2";
    for (let i = 0; i < 6; i++) {
      const a = i * 1.15;
      const x = 86 - i * 6 + Math.sin(a * 3) * 10;
      const y = 186 - i * 4 - progress * (18 + i * 2);
      const r = 2.2 + Math.sin(i + progress * 8) * 1.4;
      ctx.beginPath();
      ctx.moveTo(x, y - r * 1.9); ctx.lineTo(x + r * 0.4, y - r * 0.4);
      ctx.lineTo(x + r * 1.1, y); ctx.lineTo(x + r * 0.35, y + r * 0.4);
      ctx.lineTo(x, y + r * 1.9); ctx.lineTo(x - r * 0.4, y + r * 0.35);
      ctx.lineTo(x - r * 1.1, y); ctx.lineTo(x - r * 0.35, y - r * 0.4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function computePose(now, dt) {
    const reduced = still();
    if (reduced) {
      return {
        bodyY: 0, bodyX: 0, bodyScaleX: 1, bodyScaleY: 1,
        headY: 0, headX: 0, headRot: -0.02,
        tailRot: 0, moonRot: 0,
        pawL: { up: 1, lift: 0, swipe: 0 },
        pawR: { up: 1, lift: 0, tap: 0 },
        blink: 0, happyBlink: false, gazeX: 0, gazeY: -2,
        trickProgress: -1
      };
    }

    const elapsed = (now - startTime) / 1000;
    const trickElapsed = (now - trickTime) / 1000;
    const inTrick = trickElapsed >= 0 && trickElapsed < 1.15;
    const trickProgress = inTrick ? trickElapsed / 1.15 : -1;

    // 18-second expressive cycle:
    //  0.0..1.35  Peeking low behind table (hat, ears, curious golden eyes)
    //  1.35..2.55 Putting paws UP on the velvet table one-two & hoisting up
    //  2.55..13.8 Perched comfortably on the table looking up at you (breathe, blink, tilt, paw tap, tail wag)
    // 13.8..15.2  Playfully ducking back behind the table
    // 15.2..18.0  Brief peek-a-boo pause (hat tip & moon bobbing behind rim)
    const PERIOD = 18.0;
    const cyc = (elapsed + cycleOffset) % PERIOD;

    let rise = 1;       // 0 = ducked/peeking low, 1 = full perched on table
    let pawLUp = 1;     // 0 = behind table, 1 = resting ON TOP of table rim
    let pawRUp = 1;

    if (cyc < 1.35) {
      // Peeking up cautiously with curious bob
      const p = cyc / 1.35;
      rise = 0.20 + 0.14 * smooth(p) + Math.sin(p * Math.PI * 2) * 0.025;
      pawLUp = 0;
      pawRUp = 0;
    } else if (cyc < 2.55) {
      // Paws hop up one-two onto the table rim, then she hoists up!
      pawLUp = easeOutBack((cyc - 1.35) / 0.48);
      pawRUp = easeOutBack((cyc - 1.58) / 0.48);
      rise = lerp(0.34, 1.0, easeOutBack((cyc - 1.62) / 0.85));
    } else if (cyc < 13.8) {
      rise = 1.0;
      pawLUp = 1.0;
      pawRUp = 1.0;
    } else if (cyc < 15.2) {
      // Duck smoothly behind the table, paws tuck back in
      const d = (cyc - 13.8) / 1.4;
      rise = lerp(1.0, 0.18, smooth(d));
      pawLUp = 1 - smooth((cyc - 13.95) / 0.45);
      pawRUp = 1 - smooth((cyc - 14.12) / 0.45);
    } else {
      // Brief hidden peek-a-boo pause with gentle curious hat wiggle
      const w = (cyc - 15.2) / 2.8;
      rise = 0.18 + Math.sin(w * Math.PI) * 0.05;
      pawLUp = 0;
      pawRUp = 0;
    }

    // If clicked to deal a poker hand, immediately pop up onto the table!
    let trickBounce = 0, pawSwipe = 0;
    if (inTrick) {
      const pop = smooth(Math.min(1, trickElapsed / 0.16));
      rise = Math.max(rise, lerp(rise, 1.0, pop));
      pawLUp = Math.max(pawLUp, pop);
      pawRUp = Math.max(pawRUp, pop);
      trickBounce = Math.sin(Math.min(1, trickElapsed / 0.42) * Math.PI) * 10;
      pawSwipe = trickElapsed < 0.26
        ? smooth(trickElapsed / 0.26)
        : trickElapsed < 0.85
          ? 1 - smooth((trickElapsed - 0.26) / 0.59)
          : 0;
    }

    // Breathing & gentle body sway while perched
    const breathe = Math.sin(elapsed * 2.15);
    const sway = Math.sin(elapsed * 0.92);
    const perched = clamp01((rise - 0.5) / 0.5);

    const bodyY = lerp(112, 0, rise) + breathe * 2.6 * perched - trickBounce;
    const bodyX = sway * 2.8 * perched;
    const bodyScaleX = 1 - breathe * 0.014 * perched + (trickBounce * 0.004);
    const bodyScaleY = 1 + breathe * 0.018 * perched + (trickBounce * 0.005);

    // Curious head tilts & looking-up nod
    let headRot = Math.sin(elapsed * 0.78) * 0.068 * perched + Math.sin(elapsed * 1.9) * 0.016;
    let headY = bodyY + Math.sin(elapsed * 2.15 - 0.4) * 2.2 * perched - trickBounce * 0.35;
    let headX = bodyX * 1.15;

    // Extra cute curious tilt while peeking low
    if (rise < 0.45) {
      headRot += Math.sin(elapsed * 1.6) * 0.07;
    }
    // Slight playful lean-in around t=9.5..12.0s
    const leanIn = cyc > 9.4 && cyc < 12.2 ? Math.sin(((cyc - 9.4) / 2.8) * Math.PI) : 0;
    headY -= leanIn * 4;
    headRot += leanIn * 0.055;

    // Playful right-paw double tap on the felt around t=7.0..8.1s
    let pawRTap = 0;
    if (cyc > 7.0 && cyc < 8.1 && !inTrick) {
      const tp = (cyc - 7.0) / 1.1;
      pawRTap = Math.abs(Math.sin(tp * Math.PI * 2)) * Math.sin(tp * Math.PI);
    }

    // Tail graceful wagging (speeds up excitedly on trick deal!)
    const tailSpeed = inTrick ? 8.5 : 2.3;
    const tailAmp = inTrick ? 0.22 : 0.13;
    const tailRot = Math.sin(elapsed * tailSpeed) * tailAmp + Math.sin(elapsed * 1.1) * 0.05;

    // Secondary pendulum physics for the golden crescent moon charm on her hat tip
    const safeDt = Math.min(0.05, Math.max(0.008, dt));
    const headVelX = (headX - prevHeadX) / safeDt;
    const headVelRot = (headRot - prevHeadRot) / safeDt;
    prevHeadX = headX;
    prevHeadRot = headRot;
    const targetTorque = -headVelX * 0.004 - headVelRot * 0.45 - moonAngle * 18.0 - moonVel * 3.8;
    moonVel += targetTorque * safeDt;
    moonAngle = Math.max(-0.55, Math.min(0.55, moonAngle + moonVel * safeDt));

    // Natural blinking + periodic happy curved ^ ^ purr-blink
    let blink = 0, happyBlink = false;
    if (inTrick && trickElapsed < 0.55) {
      blink = Math.sin((trickElapsed / 0.55) * Math.PI);
      happyBlink = true;
    } else {
      const blinkCycle = 3.7;
      const bIndex = Math.floor(elapsed / blinkCycle);
      const bPhase = elapsed % blinkCycle;
      const isHappy = (bIndex % 3 === 1) && perched > 0.8;
      const dur = isHappy ? 0.46 : 0.20;
      if (bPhase > blinkCycle - dur) {
        const u = (bPhase - (blinkCycle - dur)) / dur;
        blink = Math.sin(u * Math.PI);
        happyBlink = isHappy;
      }
    }

    // Subtle upward eye gaze toward the player, with occasional glance toward the cards
    const glanceLeft = (cyc > 5.2 && cyc < 6.5) ? Math.sin(((cyc - 5.2) / 1.3) * Math.PI) : 0;
    const gazeX = -glanceLeft * 3.2;
    const gazeY = -2.2 - (1 - perched) * 1.2;

    return {
      bodyY, bodyX, bodyScaleX, bodyScaleY,
      headY, headX, headRot,
      tailRot, moonRot: moonAngle,
      pawL: { up: pawLUp, lift: pawSwipe * 16, swipe: pawSwipe },
      pawR: { up: pawRUp, lift: pawRTap * 11, tap: pawRTap },
      blink, happyBlink, gazeX, gazeY,
      trickProgress
    };
  }

  function render(now) {
    if (!atlas || !ctx) return;
    const dt = lastFrame ? (now - lastFrame) / 1000 : 0.016;
    lastFrame = now;

    const p = computePose(now, dt);
    ctx.clearRect(0, 0, W, H);

    // =========================================================================
    // LAYER 1: BEHIND THE VELVET TABLE RIM (clipped cleanly along the rim arch)
    // =========================================================================
    ctx.save();
    clipBehindRim();

    // 1a. Fluffy purple tail (pivots from its base behind her right shoulder)
    ctx.save();
    const tailPivotX = 278 + p.bodyX;
    const tailPivotY = 228 + p.bodyY * 0.92;
    ctx.translate(tailPivotX, tailPivotY);
    ctx.rotate(p.tailRot);
    drawSprite(SPRITES.tail, -14, -100);
    ctx.restore();

    // 1b. Full extended starry cloak / torso (NEVER chopped at the bottom!)
    ctx.save();
    const bodyCenterX = 198 + p.bodyX;
    const bodyBaseY = 248 + p.bodyY;
    ctx.translate(bodyCenterX, bodyBaseY);
    ctx.scale(p.bodyScaleX, p.bodyScaleY);
    drawSprite(SPRITES.body, -130, -110);
    ctx.restore();

    // 1c. Head + starry witch hat + animated eyelids + swinging moon charm
    ctx.save();
    const neckX = 194 + p.headX;
    const neckY = 166 + p.headY;
    ctx.translate(neckX, neckY);
    ctx.rotate(p.headRot);
    drawSprite(SPRITES.head, -128, -140);

    // Eye highlights (subtle upward gaze toward the player) & blinking eyelids
    // Eye centers relative to head sprite origin (-128, -140):
    // Left eye in head_img (294x180) is at (104, 102) -> scaled * 0.84 = (87, 86) -> local (-41, -54)
    // Right eye in head_img is at (160, 111) -> scaled * 0.84 = (134, 93) -> local (6, -47)
    drawEyeHighlight(-42, -55, p.gazeX, p.gazeY, p.blink);
    drawEyeHighlight(5, -48, p.gazeX, p.gazeY, p.blink);
    drawEyelid(-41, -54, 13.5, 11.5, -0.18, p.blink, p.happyBlink);
    drawEyelid(6, -47, 15.0, 12.0, 0.22, p.blink, p.happyBlink);

    // Golden crescent moon charm dangling from hat tip with pendulum physics
    ctx.save();
    ctx.translate(106, -77);
    ctx.rotate(p.moonRot);
    drawSprite(SPRITES.moon, -16, -2);
    ctx.restore();

    ctx.restore(); // end head
    ctx.restore(); // end behind-table clip

    // =========================================================================
    // LAYER 2: ON TOP OF THE VELVET TABLE (her paws resting on the table rim!)
    // =========================================================================
    function drawPaw(sprite, restX, restY, state, isLeft) {
      if (state.up <= 0.02) return;
      const u = state.up;
      // Arc smoothly up from behind the rim onto the tabletop
      const hopArc = Math.sin(clamp01(u) * Math.PI) * 18;
      const px = restX + p.bodyX * 0.45 - (isLeft ? state.swipe * 26 : 0);
      const py = lerp(restY + 26, restY, clamp01(u)) - hopArc - state.lift;
      const pawRot = isLeft
        ? (-state.swipe * 0.55 - (1 - clamp01(u)) * 0.3)
        : ((1 - clamp01(u)) * 0.3 + (state.tap || 0) * 0.14);

      // Soft dark-magenta contact shadow on the velvet tabletop beneath her paw
      const shadowVis = clamp01((u - 0.35) / 0.65) * clamp01(1 - (state.lift + hopArc) / 34);
      if (shadowVis > 0.02) {
        ctx.save();
        ctx.globalAlpha = 0.52 * shadowVis;
        ctx.fillStyle = "#18041e";
        ctx.beginPath();
        ctx.ellipse(px + 25, restY + 34, 24 * (0.75 + 0.25 * shadowVis), 7.5 * shadowVis, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw the paw (clipped cleanly behind rim only while still rising below the rim!)
      ctx.save();
      if (u < 0.42) clipBehindRim();
      ctx.translate(px + 25, py + 20);
      ctx.rotate(pawRot);
      // Slight landing squish as paw plants on the table
      const squish = u > 0.85 && u < 1.05 ? 1 + (1 - Math.abs(u - 0.95) / 0.1) * 0.06 : 1;
      ctx.scale(squish, 1 / squish);
      drawSprite(sprite, -25, -20);
      ctx.restore();
    }

    drawPaw(SPRITES.pawL, 130, 220, p.pawL, true);
    drawPaw(SPRITES.pawR, 216, 220, p.pawR, false);

    // Sparkle glints when she swipes to deal a poker hand
    if (p.trickProgress >= 0.12 && p.trickProgress < 0.95) {
      drawTrickSparkles((p.trickProgress - 0.12) / 0.83);
    }
  }

  function tick(now) {
    rafId = 0;
    if (!canvas || !canvas.isConnected) return;
    if (!startTime) startTime = now;
    render(now);
    if (!still()) rafId = root.requestAnimationFrame(tick);
  }

  function schedule() {
    if (!rafId && atlas && canvas?.isConnected) {
      rafId = root.requestAnimationFrame(tick);
    }
  }

  function loadAtlas(el) {
    if (atlas || loading) return;
    const raw = root.getComputedStyle(el).getPropertyValue("--art-parlor-cat").trim();
    const url = raw.match(/url\(["']?(.*?)["']?\)/)?.[1] || "assets/parlor-cat.png";
    loading = true;
    const img = new Image();
    img.onload = () => {
      atlas = img;
      loading = false;
      schedule();
    };
    img.onerror = () => { loading = false; };
    img.src = url;
  }

  function mount(container) {
    const target = container?.querySelector(".dealer-cat-canvas");
    if (!target) return;
    canvas = target;
    canvas.width = W;
    canvas.height = H;
    ctx = canvas.getContext("2d");
    lastFrame = 0;
    if (!atlas) loadAtlas(container);
    schedule();
  }

  function react() {
    trickTime = root.performance.now();
    schedule();
  }

  root.matchMedia("(prefers-reduced-motion:reduce)").addEventListener("change", schedule);
  root.CWParlorCat = { mount, react, syncMotion: schedule };
})(window);
