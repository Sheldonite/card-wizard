(function (root) {
  "use strict";

  const registry = root.CWFamiliarScoreFX;
  const moss = '<path d="M2 24c2-7 6-10 11-11l2-6 4 5c5 0 8 4 11 11l-5 3-8-1-6 3z" fill="#477958" stroke="#263f3b" stroke-width="1.7"/><path d="m5 22 6-7 3 2-3 4zm13-6 3-2 5 5-5-1z" fill="#bad57c"/><path d="m7 15 2-6m5 4 2-8m3 9 5-7" stroke="#e6d6aa" stroke-width="1.7" stroke-linecap="round"/>';
  const rankStone = '<path d="m3 19 5-10 11-4 10 8-2 11-12 5-10-3z" fill="#326b93" stroke="#243e48" stroke-width="2"/><path d="m8 11 11-4 7 6-12 5-8 1z" fill="#9ce8e3"/><path d="m15 20 10-4-3 7-7 3z" fill="#539fc8"/><path d="m4 19 4-7 5-2-2 4 7-1-4 5-5-1-2 4z" fill="#789944"/>';
  const toad = '<path d="M1 24q1-5 8-4l4-4 14 3 4 5q-12 8-30 0z" fill="#587c51" stroke="#263b35" stroke-width="1.6"/><path d="M7 20q-1-7 3-10 3-4 6 0 5-5 8-1 3 3 1 11-10 6-18 0z" fill="#a1ba57" stroke="#354535" stroke-width="1.8"/><path d="M10 18q5 3 12-1" fill="none" stroke="#52663e" stroke-width="1.6"/><circle cx="12" cy="11" r="1.5" fill="#292d36"/><circle cx="21" cy="10" r="1.5" fill="#292d36"/>';
  const fly = '<g stroke="#40394d" stroke-width="1.5" stroke-linejoin="round"><path d="M16 17Q2 17 3 6q8-1 14 10Q15 3 26 4q4 8-8 15z" fill="#c1e7ea"/><path d="M20 13q6 0 5 5-1 7-8 9-7 1-6-5z" fill="#edd776"/><path d="M10 21q-4 0-4-4 0-5 5-5l6 3-3 7z" fill="#626384"/></g><path d="m16 23 3-5 4 1-3 5z" fill="#fff9b0"/><path d="m7 15-3-3m6 1-1-5" stroke="#d8d3ec" stroke-width="1.6" stroke-linecap="round"/>';
  const reedCord = '<path d="m2 22 7-7 6 4 7-14 2 9 6-2" fill="none" stroke="#623344" stroke-linejoin="round" stroke-width="4"/><path d="m2 21 7-7 6 4 7-14 2 9 6-2" fill="none" stroke="#ff9c91" stroke-linejoin="round" stroke-width="2.3"/>';
  const suits = {
    S: ['M16 7c-3 4-9 7-8 12 1 4 5 5 8 1l-2 5h5l-2-5c4 4 8 2 8-2 0-4-6-8-9-11Z', '#bcccf4'],
    H: ['M16 24 9 17c-6-8 2-13 7-6 6-7 13-1 7 6Z', '#ff9d9e'],
    C: ['M16 7c-4 0-5 4-3 7-6-3-9 3-5 6 2 2 5 1 8-1l-2 6h5l-2-6c4 4 8 3 9-1 1-4-3-6-6-4 2-4 0-7-4-7Z', '#a3dfbd'],
    D: ['m16 6 8 10-8 10-8-10Z', '#ffc192']
  };
  const lanterns = Object.keys(suits);

  function label(mark, amount) {
    return '<g transform="translate(3,-2) scale(.82)">' + mark + '</g><rect x="1" y="21" width="30" height="10" rx="4" fill="#292839" stroke="#ebd5a9"/><text x="16" y="29" text-anchor="middle" fill="#fff5d9" font-family="Arial,sans-serif" font-weight="bold" font-size="9">+' + Number(amount) + '</text>';
  }

  function badger(fx, facts) {
    if (facts.event !== "scoredCard" || !(facts.chips > 0) || !fx.chips) return;
    const scorer = fx.card || fx.source;
    if (fx.still) {
      fx.sprite(label(rankStone, facts.chips), "grove-matched-rank", scorer, scorer, {size:39});
      return;
    }
    const partners = (fx.cards || []).filter(Boolean);
    fx.sprite(moss, "grove-badger-claw", scorer, scorer, {size:33, duration:250});
    if (!fx.card || !partners.length) {
      fx.sprite(rankStone, "grove-badger-payout", scorer, fx.chips, {size:24, arc:22, duration:330});
      return;
    }
    const group = [fx.card, ...partners].sort((a,b) => a.x - b.x || a.y - b.y);
    // Build one bridge for this rank. Later scorers and repeats use it without
    // drawing another set of vines between every possible pair.
    if (fx.newGroup !== false && !facts.pass) {
      const start = group[0];
      const end = group[group.length - 1];
      fx.trail(start, end, {color:"#628e57", width:5, arc:16, duration:370});
      fx.trail(start, end, {color:"#c8dc95", width:1.8, arc:20, delay:25, duration:315});
      fx.sprite(moss, "grove-bridge-foot", end, end, {size:26, delay:100, duration:235});
    }
    const index = group.indexOf(fx.card);
    const next = group[index + 1] || group[index - 1];
    fx.sprite(rankStone, "grove-badger-crossing", scorer, next, {size:22, arc:16, duration:180});
    fx.sprite(rankStone, "grove-badger-payout", next, fx.chips, {size:24, arc:22, delay:145, duration:280});
  }

  function reedWindow(rank) {
    const rankLabel = ({11:"J",12:"Q",13:"K",14:"A"})[rank] || rank;
    return '<path d="M5 26V7l9-4 13 3v20l-10 3z" fill="#677744" stroke="#394738" stroke-width="1.8"/><path d="m9 23-1-14 7-3 9 2-1 15-6 3z" fill="#e1d98b"/><path d="m5 9 5 1m12 12 6-1" stroke="#af514d" stroke-width="2.3"/><text x="16" y="21" font-size="14" font-family="Georgia,serif" font-weight="bold" text-anchor="middle" fill="#3d4b33">' + rankLabel + '</text>';
  }

  function toadProc(fx, facts) {
    if (facts.event !== "hand" || !(facts.mult > 0) || !fx.mult) return;
    if (fx.still) {
      fx.sprite(label(toad, facts.mult), "grove-toad-stamp", fx.source, fx.source, {size:40});
      return;
    }
    const ranks = new Set();
    const limit = Math.min(4, Math.floor(facts.mult / 3));
    fx.sprite(toad, "grove-lattice-toad", fx.source, fx.source, {size:34, duration:390});
    for (const [i, entry] of (facts.contributors || []).entries()) {
      if (ranks.size >= limit) break;
      if (!Number.isInteger(entry.rank) || entry.rank < 2 || entry.rank > 14 || ranks.has(entry.rank)) continue;
      const side = ranks.size;
      ranks.add(entry.rank);
      const slot = fx.point(fx.source, [-17,17,-17,17][side], [-13,-13,12,12][side]);
      const origin = fx.cards?.[i];
      if (origin) fx.trail(origin, slot, {color:"#c5d880", arc:16, delay:side*18, width:2, duration:180});
      fx.sprite(reedWindow(entry.rank), "grove-lit-reed", slot, slot, {size:22, delay:35+side*18, duration:245});
    }
    fx.trail(fx.source, fx.mult, {color:"#fa837e", arc:-18, width:3, delay:175, duration:305});
    fx.sprite(reedCord, "grove-plucked-cord", fx.source, fx.mult, {size:27, arc:-18, delay:175, duration:305});
  }

  function lantern(suit) {
    const [shape, glow] = suits[suit];
    return '<path d="M13 5V3h6v2m-11 2h16l4 12-7 9H11l-7-9z" fill="#34364f" stroke="#ddbf85" stroke-width="1.6" stroke-linejoin="round"/><path d="' + shape + '" fill="' + glow + '"/>';
  }

  function firefly(fx, facts) {
    if (facts.event !== "hand" || !(facts.chips > 0) || !fx.chips) return;
    if (fx.still) {
      fx.sprite(label(fly, facts.chips), "grove-firefly-stamp", fx.source, fx.source, {size:40});
      return;
    }
    fx.sprite(fly, "grove-firefly", fx.source, fx.chips, {size:34, arc:26, delay:125, duration:340});
    fx.trail(fx.source, fx.chips, {color:"#f3e795", arc:26, delay:125, width:3, duration:340});
    const lit = new Set();
    const limit = Math.min(4, Math.floor((facts.chips - 20) / 10));
    for (const [i, entry] of (facts.contributors || []).entries()) {
      const suitIndex = lanterns.indexOf(entry.suit);
      if (lit.size >= limit) break;
      if (suitIndex < 0 || lit.has(entry.suit)) continue;
      lit.add(entry.suit);
      const slot = fx.point(fx.source, (suitIndex - 1.5) * 14, -16 + Math.abs(suitIndex - 1.5) * 3);
      const origin = fx.cards?.[i];
      const color = suits[entry.suit][1];
      const delay = i * 20;
      if (origin) fx.trail(origin, slot, {color, width:2, arc:15, delay, duration:175});
      const mark = lantern(entry.suit);
      fx.sprite(mark, "grove-suit-lantern", slot, slot, {size:19, delay:45+delay, duration:240});
      fx.sprite(mark, "grove-suit-lantern-payout", slot, fx.chips, {size:17, arc:12+3*suitIndex, delay:175+delay, duration:280});
    }
  }

  registry.register("moss_badger", badger);
  registry.register("lattice_toad", toadProc);
  registry.register("veil_firefly", firefly);
})(window);
