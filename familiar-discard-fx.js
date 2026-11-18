(function (root) {
  "use strict";

  const fxRegistry = root.CWFamiliarScoreFX;
  // Silhouettes use their own high-contrast outlines so the same marks read on
  // a dark familiar portrait, a white playing card, or the occupied purse.
  const jar = '<g stroke="#392235" stroke-width="1.6" stroke-linejoin="round"><path fill="#cb7846" d="M13 14C7 5 4 8 1 6c0 6 2 10 5 14 0-3 3-3 5 0l3-2zm6 0C25 5 28 8 31 6c0 6-2 10-5 14 0-3-3-3-5 0l-3-2z"/><path fill="#ffdd95" d="M10 9h12v4l2 4v9q-8 5-16 0v-9l2-4z"/><path fill="#ee862e" d="M9 18q4-3 8-1t6-1v9q-7 4-14 0z"/><path fill="#af5b40" d="M10 8h12v4H10z"/></g><path d="M11 16v5m2 3 3 1" fill="none" stroke="#fff0af" stroke-width="1.8" stroke-linecap="round"/>';
  const goldDrop = '<path d="M17 2c2 7 11 12 10 19-.5 6-5 9-11 9S4 26 5 20C5 14 12 11 17 2Z" fill="#eea43a" stroke="#5e3532" stroke-width="2"/><path d="M14 12c-4 4-6 8-5 10" fill="none" stroke="#fff2ae" stroke-width="3" stroke-linecap="round"/><path d="m18 16 4 5-5 4-3-5z" fill="#ffe58a"/>';
  const firebox = '<path d="M2 28v-9C2 10 7 5 16 3c9 2 14 7 14 16v9z" fill="#b35d43" stroke="#422938" stroke-width="2"/><path d="M7 25v-7c0-4 4-8 9-10 5 2 9 6 9 10v7z" fill="#522a3b" stroke="#f3b478" stroke-width="1.5"/><path d="M10 23q-1-6 4-9 0 3 2 3l3-7q6 10 1 13Z" fill="#ff9144"/><path d="m14 23 3-6 2 6z" fill="#fff6a5"/><path d="M5 26h22" stroke="#f6c28a" stroke-width="2"/><path d="m4 15 3 1m3-10 2 3m10-3-2 3m6 7 3-1" stroke="#713f37" stroke-width="1.5"/>';
  const clay = '<path d="m8 6 13-1 7 7-3 13-13 4-9-8Z" fill="#db7c51" stroke="#673a39" stroke-width="2"/><path d="m8 9 12-1-7 6-7 2z" fill="#ffd59a"/><path d="m15 18 4-6m1 9 4-6" stroke="#97503f" stroke-width="1.7"/>';
  const firedChip = '<path d="m9 4 16 3 5 6-5 14-7 3-14-6-2-5z" fill="#9e573e" stroke="#452c3a" stroke-width="1.7"/><path d="m10 5 15 3 2 4-5 11-15-4-2-2z" fill="#81def1" stroke="#ffe5a4" stroke-width="1.5"/><path d="m17 9 4 6-7 3-2-5z" fill="#3187ac"/>';
  const spade = '<path d="m18 5 3-3 6 4-1 5-4 2-6 10-6-3 8-10z" fill="#daa97c" stroke="#322a3e" stroke-width="1.8"/><path d="m20 6 1 3 2 1 2-3-3-2z" fill="#453442"/><path d="m7 15 10 5-1 5-8 5-3-8z" fill="#83829c" stroke="#322a3e" stroke-width="1.8"/><path d="m7 18 2 8 3-4" fill="none" stroke="#decee8" stroke-width="1.5"/>';
  const burial = '<path d="m1 25 5-5 10 2 9-4 6 5v5H1Z" fill="#4d3948" stroke="#251e34" stroke-width="1.5"/><path d="M6 21v-7c0-6 4-10 10-10s10 4 10 10v5l-4 1v-6q0-6-6-6t-6 6v7Z" fill="#77718b" stroke="#302a40" stroke-width="1.3"/><path d="M12 25q-2-4 3-9l1 3 3-6q5 10-2 12Z" fill="#ed9786"/><path d="m15 24 3-5 1 4z" fill="#fff1b0"/>';
  const cinder = '<path d="M16 2q-1 8 4 7l2-4q8 16 0 23-8 5-14-2-5-8 3-17l1 6z" fill="#ba6b88" stroke="#493345" stroke-width="1.8"/><path d="m15 26-3-9 5 2 3-7 1 10-3 5z" fill="#ffd79e"/>';
  const duskWave = '<path d="M3 24C3 8 16 2 29 8c-10-1-10 8-6 12-4-2-9 1-9 8-2-3-8-7-11-4Z" fill="#846e9b" stroke="#37253e" stroke-width="1.5"/><path d="M5 20C10 10 19 8 25 9c-11 3-13 9-13 13z" fill="#f1a4ab"/><path d="m16 15 2-3 4 1-4 3z" fill="#ffe5bd"/>';

  function badge(mark, value) {
    return '<g transform="translate(3,-2) scale(.82)">' + mark + '</g>' +
      '<rect x="1" y="20" width="30" height="11" rx="4" fill="#2f243b" stroke="#e8cdb0" stroke-width="1"/>' +
      '<text x="16" y="28.5" text-anchor="middle" fill="#fff2d2" font-family="Arial,sans-serif" font-weight="bold" font-size="8.6">' +
      value + '</text>';
  }

  function discardAnchors(fx) {
    if (fx.cards?.length) return fx.cards;
    return fx.card ? [fx.card] : [];
  }

  function bat(fx, facts) {
    if (facts.event !== "discard" || !(facts.money > 0) || !fx.money) return;
    const drops = Math.min(2, facts.money);
    if (fx.still) {
      fx.sprite(badge(jar, "+$" + drops), "bat-purse-stamp", fx.source, fx.source, {size:38});
      return;
    }
    const cards = discardAnchors(fx);
    if (cards.length) fx.trail(cards[0], fx.source, {color:"#e9a651", arc:14, width:2, duration:135});
    const lip = fx.point(fx.source, 0, 9);
    fx.sprite(jar, "bat-jam-jar", fx.source, lip, {size:42, rotation:12, duration:245});
    for (let i = 0; i < drops; i++) {
      const start = fx.point(lip, drops === 1 ? 0 : i ? 5 : -5, 0);
      const delay = 105 + i * 72;
      const arc = 24 + i * 12;
      fx.trail(start, fx.money, {color:"#ffc66a", width:3, arc, delay, duration:325});
      fx.sprite(goldDrop, "bat-marmalade-drop", start, fx.money, {size:20, arc, delay, duration:335});
    }
    fx.burst(fx.money, {color:"#ffdc82", count:4, reach:12, delay:360 + (drops - 1) * 72, duration:140});
  }

  function feed(fx, count, mark, name, color, arc) {
    const cards = discardAnchors(fx);
    // One particle per contributing card. Discards in this game contain at most five.
    for (let i = 0; i < Math.min(5, count, cards.length); i++) {
      const delay = i * 24;
      fx.trail(cards[i], fx.source, {color, width:2, arc, delay, duration:210});
      fx.sprite(mark, name, cards[i], fx.source, {size:16, arc, delay, duration:215});
    }
  }

  function kiln(fx, facts) {
    if (facts.event === "discard") {
      const charge = facts.charge;
      if (charge?.stat !== "chips" || !(charge.after > charge.before)) return;
      if (fx.still) {
        fx.sprite(badge(firebox, "+" + charge.after), "kiln-bank-stamp", fx.source, fx.source, {size:39});
        return;
      }
      feed(fx, (charge.after - charge.before) / 10, clay, "kiln-clay-pellet", "#ef9060", 16);
      fx.sprite(firebox, "kiln-fired-grate", fx.source, fx.source, {size:43, duration:355});
      return;
    }
    if (facts.event !== "hand" || !(facts.chips > 0) || !fx.chips) return;
    if (fx.still) {
      fx.sprite(badge(firedChip, "+" + facts.chips), "kiln-pay-stamp", fx.chips, fx.chips, {size:39});
      return;
    }
    const hot = facts.chips > 20;
    fx.sprite(firebox, "kiln-grate-kick", fx.source, fx.point(fx.source, -3, 2), {size:42, rotation:-11, duration:180});
    fx.trail(fx.source, fx.chips, {color:hot ? "#ffc580" : "#c2dbec", width:hot ? 4 : 2, arc:20, delay:65, duration:310});
    // A hotter grate ejects a larger spray; the score readout supplies the exact Chips.
    const tiles = hot ? 3 : 1;
    for (let i = 0; i < tiles; i++) {
      fx.sprite(firedChip, "kiln-fired-chip", fx.source, fx.chips,
        {size:hot ? 21 : 17, arc:10 + 11 * i, rotation:15 * (i - 1), delay:65 + 32 * i, duration:315});
    }
  }

  function undertaker(fx, facts) {
    if (facts.event === "discard") {
      const charge = facts.charge;
      if (charge?.stat !== "xmult" || !(charge.after > charge.before)) return;
      const shown = "×" + Number(charge.after.toFixed(2));
      if (fx.still) {
        fx.sprite(badge(burial, shown), "dusk-bank-stamp", fx.source, fx.source, {size:39});
        return;
      }
      // When nearly full, only bury cards that added a real charge.
      const buried = Math.round((charge.after - charge.before) / 0.15);
      feed(fx, buried, cinder, "dusk-buried-cinder", "#c98da2", -12);
      fx.sprite(burial, "dusk-slate-arch", fx.source, fx.source, {size:42, duration:340});
      if (charge.after >= 2.5) fx.sprite(badge(burial, shown), "dusk-full-arch", fx.source, fx.source, {size:39, delay:215, duration:195});
      return;
    }
    if (facts.event !== "hand" || !(facts.xmult > 1) || !fx.mult) return;
    if (fx.still) {
      fx.sprite(badge(spade, "×" + Number(facts.xmult.toFixed(2))), "dusk-pay-stamp", fx.mult, fx.mult, {size:39});
      return;
    }
    fx.sprite(spade, "dusk-turn-spade", fx.point(fx.source, 4, 7), fx.point(fx.source, -5, -6),
      {size:40, arc:-5, rotation:-38, duration:225});
    fx.trail(fx.source, fx.mult, {color:"#c78aa5", arc:31, width:5, delay:100, duration:310});
    fx.sprite(duskWave, "dusk-mult-wave", fx.source, fx.mult, {size:35, arc:31, delay:100, duration:310});
  }

  fxRegistry.register("marmalade_bat", bat);
  fxRegistry.register("kiln_crawler", kiln);
  fxRegistry.register("dusk_undertaker", undertaker);
})(window);
