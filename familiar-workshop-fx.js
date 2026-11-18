(function (root) {
  "use strict";

  const registry = root.CWFamiliarScoreFX;
  const roller = '<path d="M2 14h28v5H2z" fill="#a6a69c" stroke="#302a35" stroke-width="1.4"/><path d="m5 13 4-4h14l4 3v8l-4 3H9l-4-3z" fill="#715040" stroke="#322b35" stroke-width="1.8"/><path d="m9 13 3-2m-4 5 6-4m1 6 7-5m-3 7 5-4" fill="none" stroke="#ad9469" stroke-width="1.4" stroke-linecap="round"/><path d="M7 20q9 3 18-1l-2 3H10z" fill="#39464a"/>';
  const hammer = '<path d="m6 27-3-4L19 9l4 4Z" fill="#c78d58" stroke="#413442" stroke-width="1.6"/><path d="m15 10 7-8 8 5-7 9z" fill="#8799a0" stroke="#343341" stroke-width="1.8"/><path d="m19 9 5-5 4 3-5 5z" fill="#e5d9b3"/><path d="M6 23 16 14" stroke="#f4c792" stroke-width="1.4"/>';
  const gear = '<path d="m13 2 6 0 1 4 3 2 4-1 3 5-3 3v3l3 3-3 5-4-1-3 1-1 4h-6l-1-4-3-1-4 1-3-5 3-3v-3l-3-3 3-5 4 1 3-2z" fill="#a58e6c" stroke="#403645" stroke-width="1.6"/><circle cx="16" cy="16" r="7" fill="#574e5a" stroke="#efcd89" stroke-width="1.8"/><circle cx="16" cy="16" r="2.7" fill="#ddc089"/>';
  const looseFlake = '<path d="m4 15 13-8 12 8-7 10-13-3z" fill="#8a9aa9" stroke="#3e3a4a" stroke-width="1.8"/><path d="m7 15 10-5 5 4-8 4z" fill="#c2ced5"/>';
  const maggot = '<path d="M4 21c1-7 7-3 10-8 2-5 8-8 13-4 4 3 2 9-2 11-5 0-6 6-14 6-5 0-8-2-7-5Z" fill="#e3cda9" stroke="#473743" stroke-width="1.7"/><path d="M8 18q5 2 4 6m2-10q6 2 5 7m1-12q5 2 5 9" fill="none" stroke="#a58e76" stroke-width="2"/><path d="m26 11 4-4-1 7Z" fill="#cfa343" stroke="#544339" stroke-width="1.2"/><circle cx="25" cy="11" r="1.2" fill="#342c37"/>';
  const glint = '<path d="m4 23 9-10 6 2 9-9-3 11-7 1-8 9Z" fill="#fff4af" stroke="#926a43" stroke-width="1.3"/>';

  function text(value, y, fill) {
    return '<text x="16" y="' + y + '" fill="' + fill + '" font-family="Arial,sans-serif" font-size="7.5" font-weight="bold" text-anchor="middle">' + value + '</text>';
  }

  function printBlock(total) {
    const lined = Math.min(6, Math.max(0, Math.round((total - 28) / 15)));
    let lines = "";
    for (let i = 0; i < lined; i++) lines += '<path d="m' + (7 + i*3.5) + ' 9 1.2-2.5" stroke="#c1ddbc" stroke-width="1.4"/>';
    return '<path d="m3 8 23-4 3 4v18L6 29l-3-3z" fill="#675448" stroke="#2f2e38" stroke-width="1.6"/><path d="m5 10 21-3v16L5 26z" fill="#427d86"/><path d="m7 12 17-3v12L7 23z" fill="#2f5668" stroke="#83d9dc"/>' + lines + text("+" + total, 20, "#d8ffef");
  }

  function soldPrint(id) {
    const item = id && root.CW?.item(id);
    const shape = item?.kind === "familiar" ? 'm7 10 6 3 6-1 5-4v9l-3 5-10 1-4-5Z' :
      item?.rarity === "Constellation" ? 'm16 7 2 6 6 1-5 4 1 6-5-3-5 3 1-7-4-3 7-1Z' :
      item?.kind === "spell" ? 'm9 10 14-2 1 12-13 2 2-4-3-1z' :
      'm16 8 6 8-6 7-6-7Z';
    return '<path d="m4 5 18-2 6 23-18 3Z" fill="#d8ccb0" stroke="#465149" stroke-width="1.8"/><path d="' + shape + '" fill="#354c53"/>';
  }

  function keystone(total) {
    const count = Math.min(8, Math.max(0, Math.round((total - 35) / 12)));
    let cuts = "";
    for (let i=0; i<count; i++) cuts += '<path d="m' + (6 + i*2.6) + ' 8 .7 3" stroke="#e7d1a5" stroke-width="1.4"/>';
    return '<path d="m2 7 4-3 20 1 4 4-6 17-7 3-9-3z" fill="#677d8b" stroke="#353746" stroke-width="1.8"/><path d="m4 8 3-2 18 1 3 2-5 3-16-1z" fill="#99adba"/><path d="m7 12 16 1-2 11-11-1z" fill="#465a69"/>' + cuts + text("+" + total, 20, "#e2f4ef");
  }

  function dial(total) {
    const cuts = Math.min(10, Math.max(0, Math.round((total-1.3)/.15)));
    let notches = "";
    for (let i=0; i<10; i++) notches += '<path d="M16 4v3" transform="rotate(' + (-135 + i*30) + ' 16 16)" stroke="' + (i < cuts ? "#fff0a6" : "#826e59") + '" stroke-width="1.5"/>';
    return '<circle cx="16" cy="16" r="14" fill="#785a42" stroke="#332c39" stroke-width="1.8"/><circle cx="16" cy="16" r="10.8" fill="#51444b" stroke="#c3985e" stroke-width="1.3"/>' + notches + text("×"+Number(total.toFixed(2)), 19, "#ffdfa1");
  }

  function printer(fx, fact) {
    const g = fact.growth;
    if (fact.event === "sell" && g?.stat === "chips" && g.after > g.before) {
      if (fx.still) {
        fx.sprite(printBlock(g.after), "mire-new-impression", fx.source, fx.source, {size:42});
        return;
      }
      if (fx.card) fx.sprite(soldPrint(fact.itemId), "mire-sold-paper", fx.card, fx.source, {size:30, arc:15, rotation:12, duration:230});
      // The two bogwood drums close around the sheet. Its proof emerges below.
      fx.sprite(roller, "mire-upper-drum", fx.point(fx.source,0,-12), fx.point(fx.source,0,-3), {size:44, delay:90, duration:210});
      fx.sprite(roller, "mire-lower-drum", fx.point(fx.source,0,12), fx.point(fx.source,0,3), {size:44, delay:90, duration:210});
      fx.sprite(printBlock(g.after), "mire-new-impression", fx.source, fx.point(fx.source,0,13), {size:37, delay:235, duration:235});
      return;
    }
    if (fact.event !== "hand" || !(fact.chips > 0) || !fx.chips) return;
    const proof = printBlock(fact.chips);
    if (fx.still) { fx.sprite(proof, "mire-chip-proof", fx.chips, fx.chips, {size:40}); return; }
    fx.sprite(roller, "mire-print-drum", fx.source, fx.point(fx.source,3,4), {size:38, rotation:9, duration:190});
    fx.trail(fx.source, fx.chips, {color:"#73bfc1", width:4, arc:-9, delay:55, duration:270});
    fx.sprite(proof, "mire-chip-proof", fx.source, fx.chips, {size:36, delay:55, arc:-9, duration:285});
    fx.sprite(proof, "mire-chip-impression", fx.chips, fx.chips, {size:36, delay:295, duration:155});
  }

  function tinker(fx, fact) {
    const g = fact.growth;
    if (fact.event === "packOpen" && g?.stat === "chips" && g.after > g.before) {
      if (fx.still) {
        fx.sprite(keystone(g.after), "granite-new-notch", fx.source, fx.source, {size:42});
        return;
      }
      const seam = fx.card ? fx.point(fx.card,0,-fx.card.h*.35) : fx.point(fx.source,0,-15);
      fx.sprite(gear, "granite-booster-gear", seam, fx.source, {size:24, arc:17, rotation:100, duration:230});
      fx.sprite(keystone(g.before), "granite-uncut-stone", fx.source, fx.source, {size:36, duration:240});
      fx.sprite(hammer, "granite-mallet", fx.point(fx.source,8,-20), fx.source, {size:36, arc:3, rotation:-52, delay:115, duration:165});
      fx.sprite(looseFlake, "granite-fresh-cut", fx.source, fx.point(fx.source,-13,6), {size:13, arc:8, delay:230, duration:165});
      fx.sprite(keystone(g.after), "granite-new-notch", fx.source, fx.source, {size:41, delay:230, duration:235});
      return;
    }
    if (fact.event !== "hand" || !(fact.chips > 0) || !fx.chips) return;
    const stone = keystone(fact.chips);
    if (fx.still) { fx.sprite(stone, "granite-chip-stamp", fx.chips, fx.chips, {size:40}); return; }
    const above = fx.point(fx.chips,0,-20);
    fx.sprite(stone, "granite-lift-stone", fx.source, above, {size:36, arc:25, duration:275});
    fx.sprite(stone, "granite-chip-stamp", above, fx.chips, {size:42, delay:220, duration:165});
    fx.burst(fx.chips, {color:"#c7dfed", count:4, reach:15, delay:340, duration:150});
  }

  function vault(fx, fact) {
    const g = fact.growth;
    if (fact.event === "reroll" && g?.stat === "xmult" && g.after > g.before) {
      if (fx.still) {
        fx.sprite(dial(g.after), "vault-cut-notch", fx.source, fx.source, {size:42});
        return;
      }
      if (fx.card) fx.trail(fx.card, fx.source, {color:"#e8ba6f", width:2, arc:14, duration:175});
      fx.sprite(dial(g.before), "vault-turn-dial", fx.source, fx.source, {size:40, rotation:30, duration:265});
      const bite = fx.point(fx.source, 9, -7);
      fx.sprite(maggot, "vault-cutting-maggot", fx.point(fx.source,-11,6), bite, {size:32, arc:6, rotation:20, duration:250});
      fx.sprite(glint, "vault-brass-filing", bite, fx.point(bite,7,-6), {size:17, delay:177, duration:130});
      fx.sprite(dial(g.after), "vault-cut-notch", fx.source, fx.source, {size:42, delay:225, duration:225});
      return;
    }
    if (fact.event !== "hand" || !(fact.xmult > 1) || !fx.mult) return;
    const engraved = dial(fact.xmult);
    if (fx.still) { fx.sprite(engraved, "vault-mult-engraving", fx.mult, fx.mult, {size:40}); return; }
    fx.sprite(engraved, "vault-spin", fx.source, fx.source, {size:38, rotation:-30, duration:230});
    fx.sprite(glint, "vault-brass-reflection", fx.source, fx.mult, {size:24, arc:-17, delay:125, duration:240});
    fx.trail(fx.source, fx.mult, {color:"#f4d091", width:3, arc:-17, delay:125, duration:240});
    fx.sprite(engraved, "vault-mult-engraving", fx.mult, fx.mult, {size:36, delay:312, duration:165});
  }

  registry.register("mire_printer", printer);
  registry.register("granite_tinker", tinker);
  registry.register("vault_maggot", vault);
})(window);
