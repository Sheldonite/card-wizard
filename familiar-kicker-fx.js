(function (root) {
  "use strict";

  const registry = root.CWFamiliarScoreFX;
  const finch = '<path fill="#493f55" d="m3 8 10 5 5-1 2-7 6-2 3 4 3 2-5 3-1 6-5 5h-3l1 3h5v3H9v-3h5l-1-4-7-5z"/><path fill="#dad4c6" d="m5 10 9 6 5-3 2-6 4-2 2 3-2 3-1 7-4 3-7-1-4-4z"/><path fill="#fff9e3" d="m19 12 3-6 3-1 2 3-4 1-1 7-4 3-5-1z"/><path fill="#a6a3a3" d="m10 14 8 1-4 4-4-2zm0 13h12v1H10z"/><path fill="none" stroke="#aaa0b0" stroke-width=".8" d="m21 10-2 5-3 1 1 2m-3 1 3 1"/><path fill="#523548" d="M24 7h2v2h-2z"/>';
  const ruby = '<path fill="#f34968" stroke="#5a2941" d="m21 6 4-2 4 3-2 4-4 1-3-3z"/><path fill="#fff0ba" d="m24 6 2-1 1 2-2 1z"/>';
  const pedestal = '<path fill="#716774" d="M3 12h26v5h-3v5h3v3H3v-3h3v-5H3z"/><path fill="#f4eada" d="M3 12h26v3H3zm4 5h18v4H7z"/><path fill="#c6bfba" d="M4 22h24v2H4z"/><path fill="none" stroke="#a294a4" d="m11 13 4 1m4 4-3 1 2 2"/>';
  const fragments = '<path fill="#f4eedc" stroke="#706b7c" d="m4 11 7-5 5 7-8 4zm12 6 7-7 5 8-8 4z"/><path fill="#a6d9ed" stroke="#53617b" d="m8 21 6-3 3 5-5 4z"/>';
  const scoop = '<path fill="#254760" d="m2 17 11-1L25 3l4-1-1 8-9 11-6 7-7-2z"/><path fill="#569fb3" d="m4 18 9-1L25 6l-4 8-9 11-5-1z"/><path fill="#99dbdd" d="m4 18 10-1 8-7-7 10-8 3z"/><path fill="none" stroke="#d8f6d8" stroke-width="1.2" d="m6 20 7-1m-4 3 6-2m1-3 5-5"/>';
  const shellDust = '<path fill="#1c5e80" stroke="#b6f2fa" d="m5 19 5-8 4 2 3-6 5 2 1 4 4 2-4 7-9 4z"/><path fill="none" stroke="#d4fff0" stroke-width="1.5" d="m9 19 2-5m3 7 3-10m0 11 5-7"/><path fill="#bbe0e8" d="M4 22h3v2H4zm20-17h2v2h-2z"/>';
  const orca = '<path fill="#272136" stroke="#b5c8df" stroke-width=".9" d="m1 14 6 1 4 3 3-8 1-8 4 4 1 8 5 1 6 4-1 4-5 3-8-1-6-4-5 5-2-2 2-6z"/><path fill="#ddece4" d="m11 20 6 2 6 1 6-3-2 4-6 2-7-2z"/><path fill="#f6f0db" d="m21 17 5-1 2 2-4 2-3-1z"/><path fill="#776a8a" d="M8 17l6 1 3-8v6l-2 4-4-1z"/><path fill="#d798b5" d="m18 21 3 1-2 3-3 2z"/>';
  const wake = '<path fill="#605674" stroke="#c5d2e9" stroke-width="1" d="M1 21q5 0 8-6t9-7q-4 2-3 7 5-5 11-4-4 2-3 7l7 1-4 4H8z"/><path fill="none" stroke="#e0c2e0" stroke-width="1.3" d="M3 21q5 0 9-6m4 5 4-4m4 3h5"/>';

  // A single readable tally fits inside the compositor's one static reduced-motion sprite.
  function stillTally(fx, glyph, stat, extra = "") {
    const line = '<text x="16" y="29" text-anchor="middle" font-family="system-ui,sans-serif" font-size="6" font-weight="800" fill="'+
      (extra ? '#ffe6d6' : stat.endsWith("Mult") ? '#ffc2c3' : '#bdeaff')+'">'+stat+extra+'</text>';
    const width = extra ? 67 : 39;
    const badge = '<g transform="translate(5 -1) scale(.7)">'+glyph+'</g><rect x="'+(16-width/2)+'" y="21" width="'+width+'" height="10" rx="3" fill="#251e32" stroke="#c8a998" stroke-width=".8"/>'+line;
    fx.sprite(badge,"kicker-still-tally",fx.source,fx.source,{size:47});
  }
  function alabasterFinch(fx, facts) {
    if (facts.event !== "scoredCard" || !Number.isFinite(facts.chips) || facts.chips <= 0) return;
    const hasRuby = Number.isFinite(facts.mult) && facts.mult > 0;
    const bird = hasRuby ? finch + ruby : finch;
    if (fx.still) return stillTally(fx,bird,"+"+facts.chips+" Chips",hasRuby ? " +"+facts.mult+" Mult" : "");
    const card = fx.card || fx.cards?.[0] || fx.source;
    const perch = fx.point(card,0,-12);
    const slab = fx.point(perch,0,12);
    fx.sprite(bird,"alabaster-flight",fx.source,perch,{size:38,arc:21,duration:210});
    fx.sprite(pedestal,"alabaster-footing",slab,fx.point(slab,3,0),{size:39,rotation:5,delay:155,duration:210});
    fx.sprite(bird,"alabaster-alight",perch,fx.point(perch,-3,1),{size:38,rotation:-9,delay:148,duration:240});
    if (fx.chips) {
      fx.trail(slab,fx.chips,{color:"#b7dfea",width:3,arc:17,delay:218,duration:265});
      fx.sprite(fragments,"alabaster-chip-flakes",slab,fx.chips,{size:22,arc:17,rotation:26,delay:218,duration:265});
    }
    if (hasRuby && fx.mult) {
      const eye = fx.point(perch,9,-9);
      fx.trail(eye,fx.mult,{color:"#e34267",width:6,delay:263,duration:240});
      fx.trail(eye,fx.mult,{color:"#ffe3bd",width:1.5,delay:276,duration:222});
      fx.burst(fx.mult,{color:"#ffc4c9",count:4,reach:13,delay:451,duration:160});
    }
  }

  function dustfin(fx, facts) {
    if (!facts.returnCard || !fx.card) return;
    const slot = fx.handSlot || fx.card;
    fx.sprite(scoop,"dustfin-shell-scoop",fx.card,slot,{size:33,arc:14,duration:370});
    fx.trail(fx.card,slot,{color:"#8fd6d8",arc:14,duration:370});
    fx.sprite(shellDust,"dustfin-return",slot,slot,{size:24,delay:280,duration:220});
  }

  function glimmerOrca(fx, facts) {
    if (facts.event !== "hand" || !Number.isFinite(facts.mult) || facts.mult <= 0) return;
    if (fx.still) return stillTally(fx,orca,"+"+facts.mult+" Mult");
    const cards = fx.cards || [];
    let previous = fx.source;
    for (const [i,card] of cards.entries()) {
      if (!card) continue;
      const delay = 104*i;
      const below = fx.point(card,0,Math.min(18,(card.h || 45)/3));
      fx.trail(previous,below,{color:"#aea0ce",width:2+i,arc:-14-i*2,delay,duration:170});
      fx.sprite(orca,"orca-dive",previous,below,{size:30+i*2,arc:-14-i*2,delay,duration:170});
      fx.sprite(wake,"orca-wake",below,fx.point(below,-5,0),{size:17+i*5,delay:delay+101,duration:200});
      previous = below;
    }
    const mult = fx.mult || fx.source;
    const delay = cards.length*104;
    fx.sprite(orca,"orca-breach",previous,mult,{size:32+cards.length*2,arc:30,rotation:-14,delay,duration:295});
    fx.sprite(wake,"orca-breaking-crest",previous,mult,{size:21+cards.length*4,arc:20,rotation:9,delay:delay+39,duration:292});
    fx.burst(mult,{color:"#edcee9",count:3+cards.length,reach:16+cards.length*2,delay:delay+285,duration:155});
  }
  registry.register("alabaster_finch",alabasterFinch);
  registry.register("dustfin",dustfin);
  registry.register("glimmer_orca",glimmerOrca);
})(window);
