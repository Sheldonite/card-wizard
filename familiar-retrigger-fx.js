(function (root) {
  "use strict";

  // Sprite paths use the compositor's 32-by-32 viewBox. Every scene follows
  // facts emitted by the engine; a highlighted card is the actual card scored.
  const registry = root.CWFamiliarScoreFX;
  const kettle = '<path fill="#35283b" d="M3 10h26v4h-2l2 6-1 5-5 3v3h-4v-2h-8v2H7v-4l-4-4v-5l3-4H3z"/><path fill="#a55f43" d="M7 13h18l-1 3 2 6-5 4H11l-5-4 2-7z"/><path fill="#e9a467" d="M4 11h24v3H4zm3 7h3v4l3 2h-3l-3-3z"/><path fill="#6b3a48" d="M20 17h4l1 5-4 3h-6z"/><path fill="#9ce4bd" d="M7 10l4-2 5 1 5-2 4 3z"/>';
  const lid = '<path fill="#3b2e3e" d="M3 16h3l3-4 4-2V7h6v3l4 2 3 4h3v3H3z"/><path fill="#ad7049" d="m7 16 5-4h8l5 4z"/><path fill="#ffe2a3" d="M5 16h22v1H5zm9-8h4v3h-4z"/>';
  const bubble = '<path fill="#85e2c5" stroke="#325357" stroke-width="2" d="m7 11 5-5h9l5 5v9l-5 6H12l-5-6z"/><path fill="#f1ffdf" d="M12 10h7v2h-5v4h-3z"/>';
  const steamCardBody = '<path fill="#315957" opacity=".83" d="m7 4 15-2 4 24-15 3z"/><path stroke="#c7ffe6" stroke-width="2" fill="none" d="m7 5 15-2 4 23-15 3z"/><path stroke="#8be3cd" stroke-width="1.5" fill="none" d="M5 11C0 15 7 19 3 24m24-11c4 4-1 6 2 10"/>';
  const steamRanks = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
  const steamSuits = {S:"♠",H:"♥",C:"♣",D:"♦"};
  function steamCardFace(face) {
    if (face?.stone) return steamCardBody + '<path fill="#a8c2b7" stroke="#243a47" stroke-width="1.2" d="m11 19 2-8 6-2 4 9-4 4z"/><path fill="none" stroke="#ebffdb" d="m13 14 2-3 3-1"/>';
    if (!Number.isInteger(face?.rank) || face.rank < 2 || face.rank > 14 || !Object.hasOwn(steamSuits,face.suit))
      return steamCardBody + '<path fill="#ebffdb" d="m14 15 2-6 3 5-2 5zM10 7h3v2h-3zm11 16h2v2h-2z"/>';
    const suitInk = face.suit === "H" || face.suit === "D" ? "#ffb5a8" : "#c2f4f6";
    return steamCardBody + '<g transform="rotate(-8 16 16)" text-anchor="middle" font-family="Georgia,serif" font-weight="bold"><text x="16" y="15" font-size="10" fill="#f0ffe3">'+steamRanks[face.rank-2]+'</text><text x="16" y="24" font-size="9" fill="'+suitInk+'">'+steamSuits[face.suit]+'</text></g>';
  }
  const stitchNeedle = '<path stroke="#37243f" stroke-width="1.4" fill="#e9dcdf" d="M3 29 22 4q4-5 7-1t-2 7z"/><path stroke="#765368" stroke-width="2" stroke-linecap="round" d="m24 7 2-2"/><path fill="none" stroke="#ff8494" stroke-width="2" d="M25 6q8-5 9 1"/>';
  const stitch = '<path stroke="#472036" stroke-width="6" stroke-linecap="round" d="m7 7 18 18M7 25 25 7"/><path stroke="#e35776" stroke-width="3.4" stroke-linecap="round" d="m7 7 18 18M7 25 25 7"/><path stroke="#ffd0bd" stroke-width="1.1" d="m8 6 5 5m4 9 6-6"/>';
  const beak = '<path fill="#332638" d="m1 9 9-4 10 5 11 6-12 2-8 7-9-1 3-7z"/><path fill="#725037" d="m3 10 7-3 8 4-9 8-5 4 2-8z"/><path fill="#d59a46" d="m12 12 7-1 11 5-15 1-5 4z"/><path fill="#ffe4a0" d="m13 12 5-1 8 3-12 1z"/><path fill="#fff5d4" d="M9 10h2v2H9z"/>';
  const amber = '<path fill="#5c3542" d="m12 1 11 1 8 13-6 13-13 3-10-9 1-14z"/><path fill="#d4782f" d="m12 4 8-1 8 12-5 11-11 2-7-8V10z"/><path fill="#ffbd51" d="m13 5 7-1-5 12-9 3 1-9z"/><path fill="#fce3a3" d="m12 6 6-2-3 6-5 2z"/><path fill="#a65330" d="m15 17 11-2-4 10-9 2z"/>';
  const shard = '<path fill="#396f86" d="m7 7 15-4 7 6-6 17-12 4-7-11z"/><path fill="#91d7ed" d="m9 9 12-3 4 4-5 13-9 3-4-9z"/><path fill="#ebffdd" d="m10 10 9-2-5 7H9z"/>';
  const coin = '<path fill="#995825" d="m4 10 6-6h12l6 6v12l-6 6H10l-6-6z"/><path fill="#f7b54c" d="m6 11 5-5h10l5 5v9l-5 5H11l-5-5z"/><path fill="none" stroke="#ffe79e" stroke-width="2" d="m10 12 3-3h6l4 4v5l-5 4h-5l-3-4z"/><path fill="#fff0b5" d="m16 10 3 5-3 4-3-4z"/>';

  function kettleHag(fx, facts) {
    const source = fx.source;
    const card = fx.card;
    const rim = fx.point(source,0,-9);
    const charging = facts.event === "discard" && facts.charge?.stat === "retriggers" &&
      facts.charge.before === 0 && facts.charge.after === 1;
    if (charging) {
      fx.sprite(kettle,"kettle-boil",source,source,{size:40,duration:520});
      if (card) fx.trail(card,rim,{color:"#b1e8b0",arc:24,duration:210});
      fx.sprite(lid,"kettle-lid",rim,fx.point(rim,4,-9),{size:37,delay:100,duration:250,rotation:12});
      for (let i=0;i<3;i++) {
        const side = (i-1)*9;
        fx.sprite(bubble,"kettle-bubble",fx.point(rim,side/2,0),fx.point(rim,side,-24-i*3),
          {size:9+i*2,arc:4,delay:135+i*58,duration:260});
      }
      return;
    }
    if (facts.event !== "scoredCard" || !facts.retriggers || !card) return;
    const edge = fx.point(card,-Math.min(26,(card.w || 50)*.34),-9);
    const steamCard = steamCardFace(fx.cardFace);
    fx.sprite(kettle,"kettle-release",source,source,{size:36,duration:260});
    fx.sprite(lid,"kettle-lid",rim,fx.point(rim,-14,-20),{size:38,duration:230,rotation:-36});
    fx.trail(rim,edge,{color:"#9de7c8",arc:30,width:4,duration:300});
    fx.sprite(steamCard,"kettle-steam-double",rim,edge,{size:36,arc:30,rotation:-14,duration:300});
    fx.sprite(steamCard,"kettle-steam-tap",edge,card,{size:36,arc:6,rotation:12,delay:230,duration:180});
    fx.burst(card,{color:"#c4f5d8",count:5,reach:17,delay:335});
  }

  function needleCrow(fx, facts) {
    if (facts.event !== "scoredCard" || !facts.pass || !facts.mult || !fx.card || !fx.mult) return;
    const card = fx.card, mult = fx.mult;
    const offset = Math.min(17,(card.w || 48)*.26);
    const eye = fx.point(card,-offset,2), exit = fx.point(card,offset,-2);
    fx.sprite(stitchNeedle,"crow-silver-needle",fx.source,eye,{size:32,arc:19,rotation:24,duration:195});
    fx.trail(fx.source,eye,{color:"#c75270",arc:19,width:3,duration:195});
    fx.trail(eye,exit,{color:"#ffd3c4",arc:-12,width:3,delay:152,duration:160});
    fx.sprite(stitchNeedle,"crow-thread-pull",exit,mult,{size:27,arc:25,rotation:32,delay:232,duration:270});
    fx.trail(exit,mult,{color:"#ed607f",arc:25,width:4,delay:232,duration:270});
    fx.sprite(stitch,"crow-cross-stitch",mult,mult,{size:26,delay:434,duration:225});
  }

  function amberMagpie(fx, facts) {
    if (facts.event !== "scoredCard" || (!facts.chips && !facts.money) || !fx.card) return;
    const card = fx.card;
    const clasp = fx.point(card,0,-12);
    fx.sprite(beak,"magpie-gold-beak",fx.source,card,{size:34,arc:16,duration:215});
    fx.sprite(amber,"magpie-amber-bead",card,clasp,{size:25,delay:142,duration:180,rotation:20});
    fx.burst(clasp,{color:"#ffc06a",count:4,reach:13,delay:266,duration:170});
    if (facts.chips && fx.chips) {
      fx.trail(clasp,fx.chips,{color:"#a5dfe7",arc:24,width:3,delay:275,duration:295});
      fx.sprite(shard,"magpie-blue-shard",clasp,fx.chips,{size:20,arc:24,rotation:-60,delay:275,duration:295});
    }
    if (facts.money && fx.money) {
      fx.trail(clasp,fx.money,{color:"#efb35d",arc:-17,width:3,delay:275,duration:330});
      fx.sprite(coin,"magpie-gilded-coin",clasp,fx.money,{size:22,arc:-17,rotation:60,delay:275,duration:330});
    }
  }
  registry.register("kettle_hag",kettleHag);
  registry.register("needle_crow",needleCrow);
  registry.register("amber_magpie",amberMagpie);
})(window);
