(function (root) {
  "use strict";

  const registry = root.CWFamiliarScoreFX;
  // Authored 32px glyphs for the market's three distinct casting materials.
  const lamp = '<path fill="#352634" d="M12 3q0-5 4-5t4 5h2v3l5 5-2 15 3 3H4l3-3-2-15 5-5V3z"/><path fill="none" stroke="#e4ae60" stroke-width="2" d="M13 4V2q3-5 6 0v2"/><path fill="#c79252" d="M10 5h12v2l4 4H6zM7 26h18l2 2H5z"/><path fill="#ffe6a6" d="M11 5h9v1h-9zm-4 6h17v2H7z"/><path fill="#72543d" d="m7 13 2 12h14l2-12z"/><path fill="#254d4d" d="M11 14h10l-1 9h-8z"/><path fill="#ffbd6d" d="M13 22q-2-3 1-5t2-5q5 5 3 8l-2 3z"/><path fill="#fff2a9" d="M15 22q-1-3 2-5l1 4-2 2z"/>';
  const tray = '<path fill="#5b3b39" d="M1 10h30l-4 10-5 3H9l-5-4z"/><path fill="#bd834c" d="M4 12h24l-3 6-4 2H10l-4-3z"/><path fill="#f9cf78" d="M2 10h28v3H2zm6 7 3 2h10l3-2v2l-3 2H11l-3-2z"/>';
  const wickScroll = '<path fill="#6d443d" d="m6 7 19-2 3 4-3 4 2 11-3 3-18 1-3-4 3-4-2-9z"/><path fill="#fae6ac" d="m8 9 16-1-1 5 2 10-16 2 1-5z"/><path fill="none" stroke="#a87048" stroke-width="1.5" d="m11 13 9-1m-8 5 9-1m-8 5 7-1"/><path fill="#ffac4d" d="M12 9q-4-4 1-7 0 2 2 2l2-4q5 8-1 10z"/><path fill="#fff5be" d="m14 9-1-3 3-2 1 3z"/>';
  const jewelCase = '<path fill="#3c2639" d="m3 12 4-8h18l4 8v13l-4 3H7l-4-3z"/><path fill="#944765" d="m5 12 4-6h14l4 6z"/><path fill="#e8afaf" d="m8 12 3-4h10l4 4-7-1z"/><path fill="#563449" d="M5 15h22v9l-3 2H8l-3-2z"/><path fill="#c79455" d="M5 14h22v2H5z"/><path fill="#f6d79a" d="m14 13 4-1 2 3-2 4h-4l-2-3z"/>';
  const bow = '<path fill="#632e4f" d="m2 4 12 5 3 4 10-8 4 2-3 14-9-3 5 11-7-3-2-8-5 10-1-6-6 1 8-9-9 2z"/><path fill="#db82a4" d="m4 7 9 5-1 3-8 1zm13 7 10-6-1 9-8-1zm-2 2 3 1 1 6z"/><path fill="#ffc5c2" d="m5 8 6 4-6-1zm16 4 5-3-1 2z"/><path fill="#f2cc80" d="m13 12 4-1 2 4-3 4-4-3z"/>';
  const lintel = '<path fill="#3b2939" d="M1 4h30v5H1zm3 6h3v17H4zm21 0h3v17h-3z"/><path fill="#b18b66" d="M2 5h28v2H2zm2 5h2v14H4zm22 0h2v14h-2z"/><path fill="none" stroke="#ebd099" stroke-width="1.5" d="m15 8 3 1-4 2 4 1-3 2"/>';
  const brassBell = '<path fill="#604139" d="M13 4h6v3l4 2 2 4v6l4 4v3H3v-3l4-4v-6l2-4 4-2z"/><path fill="#c89b53" d="m10 12 5-4h3l4 4 1 8 3 3H6l3-3z"/><path fill="#fff0ac" d="m12 12 3-2 1 2-3 3v4h-3zm-6 11h20v2H6z"/><path fill="#e0ad64" d="M13 26h6l-2 4h-2z"/>';
  const gold = '<path fill="#8a5935" stroke="#513940" stroke-width="1" d="m5 9 6-5h11l6 6v12l-7 7h-9l-7-5z"/><path fill="#edb557" d="m6 10 6-4h9l5 5v9l-6 6h-8l-6-4z"/><path fill="none" stroke="#fff3b5" stroke-width="1.5" d="m10 12 4-3h5l4 4v6l-5 4h-5l-3-3z"/><path fill="#fff3bd" d="m16 12 3 4-3 4-3-4z"/>';
  const chime = '<path fill="none" stroke="#ffe2a0" stroke-width="2" stroke-linecap="round" d="m4 12 4 3-4 2m24-5-4 3 4 2"/>';

  function staticReceipt(fx, emblem, amount, created = false) {
    // Only one glyph is shown in reduced motion; include both outcomes on it.
    const text = "+$" + amount + (created ? " + Spell" : "");
    const width = created ? 45 : 27;
    const markup = '<g transform="translate(5 -1) scale(.7)">'+emblem+'</g><rect x="'+(16-width/2)+'" y="21" width="'+width+'" height="10" rx="3" fill="#2c2133" stroke="#d9a86f"/><text x="16" y="28.6" text-anchor="middle" font-family="system-ui,sans-serif" font-size="6.3" font-weight="800" fill="#ffe4a0">'+text+'</text>';
    fx.sprite(markup,"market-still-receipt",fx.source,fx.source,{size:48});
  }
  function tossCoin(fx, from, index, delay, arc, trailColor = "#ebbc67") {
    if (!fx.money) return;
    const side = index%2 ? 1 : -1;
    const start = fx.point(from,side*4,0);
    fx.trail(start,fx.money,{color:trailColor,width:2,arc,delay,duration:310});
    fx.sprite(gold,"market-paid-coin",start,fx.money,{size:20,arc,delay,duration:310,rotation:side*45});
  }
  function brassLantern(fx, facts) {
    if (facts.event !== "shop" || facts.money !== 2) return;
    const created = facts.created?.some(entry => entry.category === "consumables");
    if (fx.still) return staticReceipt(fx,lamp,facts.money,created);
    const dish = fx.point(fx.source,2,13);
    fx.sprite(lamp,"market-brass-door",fx.source,fx.source,{size:40,duration:430});
    fx.sprite(tray,"market-brass-tray",dish,fx.point(dish,4,1),{size:34,rotation:10,delay:65,duration:260});
    for (let i=0;i<facts.money;i++) tossCoin(fx,dish,i,145+i*82,28+i*13);
    if (created && fx.consumable) {
      const wick = fx.point(fx.source,0,-5);
      fx.trail(wick,fx.consumable,{color:"#ffcc7b",arc:30,width:4,delay:208,duration:360});
      fx.sprite(wickScroll,"market-parchment-wick",wick,fx.consumable,{size:29,arc:30,rotation:8,delay:208,duration:360});
      fx.burst(fx.consumable,{color:"#fcddb0",count:4,reach:13,delay:505,duration:165});
    }
  }
  function silkenBroker(fx, facts) {
    const booster = facts.event === "packOpen" && facts.money === 2;
    const cast = facts.event === "cast" && facts.money === 1;
    if (!booster && !cast) return;
    if (fx.still) return staticReceipt(fx,jewelCase,facts.money);
    const item = fx.card || fx.source;
    fx.sprite(jewelCase,"market-silk-case",fx.source,fx.source,{size:35,duration:360});
    if (fx.card) fx.trail(fx.source,item,{color:"#e5a9b3",arc:12,width:2,duration:165});
    fx.sprite(bow,"market-satin-clasp",item,item,{size:26,delay:50,duration:200});
    if (fx.money) {
      // Twin highlights follow the same arc as the actual coin on the silk.
      fx.trail(item,fx.money,{color:"#a3517e",width:7,arc:25,delay:119,duration:386});
      fx.trail(fx.point(item,0,-1),fx.point(fx.money,0,-1),{color:"#ffd4bc",width:2,arc:25,delay:125,duration:380});
    }
    for (let i=0;i<facts.money;i++) tossCoin(fx,item,i,145+i*100,25,"#f2bcad");
  }
  function shopbellSprite(fx, facts) {
    const entry = facts.event === "shop" && facts.money === 1;
    const reroll = facts.event === "reroll" && facts.money === 2;
    if (!entry && !reroll) return;
    if (fx.still) return staticReceipt(fx,brassBell,facts.money);
    const bellAt = fx.point(fx.source,0,4);
    if (reroll && fx.card) fx.trail(fx.card,fx.source,{color:"#dbb57e",width:2,arc:16,duration:154});
    fx.sprite(lintel,"market-spring-lintel",fx.source,fx.source,{size:47,duration:entry ? 390 : 535});
    for (let i=0;i<facts.money;i++) {
      const delay = (reroll ? 105 : 15)+i*150;
      const side = i%2 ? -1 : 1;
      fx.sprite(brassBell,"market-door-swing",bellAt,fx.point(bellAt,side*6,-3),{size:30,rotation:side*25,delay,duration:215});
      fx.sprite(chime,"market-clapper-ring",bellAt,bellAt,{size:37,delay:delay+55,duration:180});
      tossCoin(fx,bellAt,i,delay+90,21+i*8);
    }
  }
  registry.register("brass_lantern",brassLantern);
  registry.register("silken_broker",silkenBroker);
  registry.register("shopbell_sprite",shopbellSprite);
})(window);
