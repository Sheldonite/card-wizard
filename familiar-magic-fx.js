(function (root) {
  "use strict";

  const fxRegistry = root.CWFamiliarScoreFX;

  // All illustrations use the compositor's 32 × 32 sprite view box.
  const needle = '<path class="linen-needle-metal" d="M4 27 23 4c3-3 7 1 4 4L4 27Z"/><path class="linen-needle-eye" d="m23 8 2-2"/><path class="linen-needle-tail" d="M25 6q5 2 4 9"/>';
  const spellWeave = '<path class="linen-spell-edge" d="m6 4 17-2 4 23-17 3ZM4 8l3 22 16-2"/><path class="linen-weft" d="m9 9 10-1m-9 5 12-1m-11 5 12-1m-11 5 9-1"/><path class="linen-warp" d="m12 6 2 17m3-18 2 17"/>';
  const nib = '<path class="fox-nib" d="m4 28 4-15L23 2l6 7-13 15-12 4Z"/><path class="fox-quill-cut" d="m6 26 11-13m-3 0 5-2-2 5"/>';
  const inkPaw = '<path class="fox-ink" d="M7 23c1-3 4-4 5-7 2-4 5-4 8 0 2 3 5 4 5 8-1 5-6 2-10 2-4 1-10 2-8-3Z"/><g class="fox-gold"><ellipse cx="6" cy="15" rx="2.2" ry="3.5" transform="rotate(-28 6 15)"/><ellipse cx="12" cy="9" rx="2.2" ry="3.5" transform="rotate(-12 12 9)"/><ellipse cx="20" cy="8" rx="2.3" ry="3.5" transform="rotate(15 20 8)"/><ellipse cx="26" cy="14" rx="2.1" ry="3.2" transform="rotate(25 26 14)"/></g>';
  const inkFlourish = '<path class="fox-flourish-dark" d="M2 24C11 27 27 15 30 4c-4 7-14 15-28 20Z"/><path class="fox-flourish-light" d="M4 22c8-1 18-8 22-14"/><circle class="fox-gold" cx="9" cy="28" r="1.5"/>';
  const shadowMark = '<path class="shadow-offset" d="m9 5 16 2-3 20-16-2Z"/><path class="shadow-plate" d="m5 7 15-3 4 20-15 3Z"/><path class="shadow-wing" d="m9 12 5 2 4-5-1 7 4 3-6-1-3 5-1-7Z"/>';
  const shadowEcho = '<path class="shadow-echo-back" d="M4 9c8 2 9 5 11 7 2-4 6-7 13-10-1 8-4 13-10 14l-3 7-2-6C6 20 4 16 4 9Z"/><path class="shadow-echo-front" d="m9 12 6 5 8-7-5 10-3 3-2-4Z"/>';

  function linenSprite(fx, facts) {
    if (facts.event !== "discard" || !facts.created?.length || !fx.source || !fx.consumable) return;
    const spool = fx.source;
    const slot = fx.consumable;
    if (fx.card) fx.trail(fx.card, spool, {color:"#ca978b", width:2, arc:12, duration:130});
    const inset = Math.min(8, slot.w * 0.14);
    fx.trail(fx.point(spool, -3, 0), fx.point(slot, -inset, 0), {color:"#e5aa90", width:2, arc:20, duration:300});
    fx.trail(fx.point(spool, 3, 1), fx.point(slot, inset, 0), {color:"#9edcc6", width:2, arc:-16, delay:36, duration:280});
    fx.sprite(needle, "linen-spell-needle", spool, slot, {size:27, arc:20, rotation:24, duration:285});
    fx.sprite(spellWeave, "linen-woven-spell", slot, slot, {size:34, delay:205, duration:270});
  }

  function foxInInk(fx, facts) {
    if (!fx.source) return;
    if (facts.event === "cast" && facts.growth?.after > facts.growth?.before) {
      if (fx.card) {
        fx.trail(fx.card, fx.source, {color:"#ba77b7", width:4, arc:20, duration:240});
        fx.sprite(nib, "fox-ink-nib", fx.card, fx.source, {size:25, arc:20, rotation:24, duration:245});
      }
      fx.sprite(inkPaw, "fox-ink-imprint", fx.source, fx.source, {size:37, delay:fx.card ? 130 : 0, duration:315});
      return;
    }
    if (facts.event !== "hand" || !facts.mult || !fx.mult) return;
    fx.trail(fx.source, fx.mult, {color:"#844d98", width:6, arc:-20, duration:290});
    fx.trail(fx.point(fx.source, 1, -1), fx.point(fx.mult, 1, -1), {color:"#ffb2a2", width:1.5, arc:-21, delay:18, duration:250});
    fx.sprite(inkFlourish, "fox-score-brush", fx.source, fx.mult, {size:31, arc:-20, duration:310});
  }

  function secondShadow(fx, facts) {
    if (facts.event !== "hand" || !facts.copiedFrom || !fx.source) return;
    const destinations = [
      [facts.chips, fx.chips, "#a7d8ff"],
      [facts.mult || (facts.xmult && facts.xmult !== 1), fx.mult, "#ffc0cb"],
      [facts.money, fx.money, "#f5d384"],
      [facts.retriggers, fx.card, "#d9c8ff"],
      [facts.created?.length, fx.consumable, "#a8e7ce"]
    ].filter(([applied, anchor]) => applied && anchor);
    if (!destinations.length) return;
    if (fx.neighbor) {
      fx.sprite(shadowMark, "shadow-copy-mark", fx.neighbor, fx.neighbor, {size:30, duration:180});
      fx.trail(fx.neighbor, fx.source, {color:"#cdb8ed", width:2, arc:-9, duration:160});
    }
    for (const [, target, color] of destinations) {
      const delay = fx.neighbor ? 95 : 0;
      fx.trail(fx.source, target, {color, width:2, arc:16, delay, duration:270});
      fx.sprite(shadowEcho, "shadow-result-echo", fx.source, target, {size:26, arc:16, delay, duration:290});
    }
  }

  fxRegistry.register("linen_sprite", linenSprite);
  fxRegistry.register("fox_in_ink", foxInInk);
  fxRegistry.register("second_shadow", secondShadow);
})(window);
