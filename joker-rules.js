// Timing is explicit: permanent growth happens on its event, and copies read the owner's counter.
(function (root) {
  "use strict";
  const rules = {};
  function on(name, event, handler) {
    (rules[name] ??= {})[event] = handler;
  }
  const rankChips = rank => rank === 14 ? 11 : Math.min(10, rank || 0);
  const rankOf = card => card.enhancement === "stone" ? 0 : card.rank;
  const bonus = c => c.memory.bonus || 0;
  const bank = (c, amount) => {
    if (!c.copied) c.memory.bonus = Math.max(0, Math.round((bonus(c) + amount) * 100) / 100);
  };
  const gain = (stat, amount) => ({[stat]:amount});
  const rankIn = ranks => c => ranks.includes(rankOf(c.card));
  const face = c => c.face(c.card);
  const always = () => true;
  function score(name, stat, amount, when = always, event = "hand") {
    on(name, event, c => when(c) ? gain(stat, typeof amount === "function" ? amount(c) : amount) : {});
  }
  function card(name, stat, amount, when) { score(name,stat,amount,when,"scoredCard"); }
  function repeat(name, when, times = 1, event = "scoredCard") {
    score(name,"retriggers",times,c => !c.pass && when(c),event);
  }
  function growing(name, stat, event, amount) {
    score(name,stat,c => (stat === "xmult" ? 1 : 0) + bonus(c));
    on(name,event,c => { bank(c,typeof amount === "function" ? amount(c) : amount); });
  }
  function suitsCovered(c, wanted, cards = c.scoring) {
    function match(i, remaining) {
      return i === wanted.length || remaining.some((card,index) => c.suited(card,wanted[i]) &&
        match(i + 1,remaining.filter((_,j) => index !== j)));
    }
    return match(0,cards);
  }
  score("Joker","mult",4);
  for (const [name,suit] of [["Greedy Joker","D"],["Lusty Joker","H"],["Wrathful Joker","S"],["Gluttonous Joker","C"]]) {
    card(name,"mult",3,c => c.suited(c.card,suit));
  }
  for (const [hand,multName,mult,chipsName,chips] of [
    ["Pair","Jolly Joker",8,"Sly Joker",50],["Three of a Kind","Zany Joker",12,"Wily Joker",100],
    ["Two Pair","Mad Joker",10,"Clever Joker",80],["Straight","Crazy Joker",12,"Devious Joker",100],
    ["Flush","Droll Joker",10,"Crafty Joker",80]
  ]) {
    score(multName,"mult",mult,c => c.contains[hand]);
    score(chipsName,"chips",chips,c => c.contains[hand]);
  }
  score("Half Joker","mult",20,c => c.cards.length <= 3);
  score("Joker Stencil","xmult",c => Math.max(1,c.capacity.familiars - c.s.familiars.length + c.s.familiars.filter(ref=>c.joker(ref)==="Joker Stencil").length));
  repeat("Mime",always,1,"heldCard");
  score("Banner","chips",c => 30 * c.s.discards);
  score("Mystic Summit","mult",15,c => !c.s.discards);
  on("Loyalty Card","before",c => { if (!c.copied) c.memory.turn = ((c.memory.turn || 0) + 1) % 6; });
  score("Loyalty Card","xmult",4,c => c.memory.turn === 0);
  on("8 Ball","scoredCard",c => { if (rankOf(c.card) === 8 && c.chance(4)) c.create("spell"); });
  score("Misprint","mult",c => Math.floor(c.random() * 24));
  repeat("Dusk",c => c.lastHand);
  score("Raised Fist","mult",c => 2 * rankChips(rankOf(c.card)),c => c.lowest?.id === c.card.id,"heldCard");
  card("Fibonacci","mult",8,rankIn([14,2,3,5,8]));
  score("Steel Joker","xmult",c => 1 + 0.2 * c.s.deck.filter(card=>card.enhancement === "steel").length);
  card("Scary Face","chips",30,face);
  score("Abstract Joker","mult",c => 3 * c.s.familiars.length);
  repeat("Hack",rankIn([2,3,4,5]));
  score("Gros Michel","mult",15);
  card("Even Steven","mult",4,rankIn([2,4,6,8,10]));
  card("Odd Todd","chips",31,rankIn([14,3,5,7,9]));
  on("Scholar","scoredCard",c => rankOf(c.card) === 14 ? {chips:20,mult:4} : {});
  card("Business Card","money",2,c => face(c) && c.chance(2));
  score("Supernova","mult",c => 1 + (c.s.seenHands[c.name] || 0));
  growing("Ride the Bus","mult","before",c => c.scoring.some(c.face) ? -bonus(c) : 1);
  on("Space Joker","before",c => { if (c.chance(4)) c.s.levels[c.name]++; });
  score("Blackboard","xmult",3,c => c.held.every(card=>c.suited(card,"S") || c.suited(card,"C")));
  growing("Runner","chips","before",c => c.contains.Straight ? 15 : 0);
  score("Ice Cream","chips",c => 100 - 5 * (c.memory.spent || 0));
  on("DNA","before",c => { if (!c.s.playedCount && c.cards.length === 1) c.addCard(c.cards[0],"hand"); });
  score("Blue Joker","chips",c => 2 * c.s.draw.length);
  on("Sixth Sense","after",c => {
    if (!c.s.playedCount && c.cards.length === 1 && rankOf(c.cards[0]) === 6) {
      c.destroyCards(c.cards);
      c.create("spectral");
    }
  });
  growing("Constellation","xmult","cast",c => c.item.rarity === "Constellation" ? 0.1 : 0);
  on("Hiker","scoredCard",c => { c.updateCard(c.card,{tallyChips:(c.card.tallyChips || 0) + 5}); });
  on("Faceless Joker","discard",c => c.cards.filter(c.face).length >= 3 ? {money:5} : {});
  growing("Green Joker","mult","before",1);
  on("Green Joker","discard",c => bank(c,-1));
  on("Superposition","hand",c => { if (c.contains.Straight && c.scoringSet.some(card=>rankOf(card) === 14)) c.create("spell"); });
  score("To Do List","money",4,c => c.name === c.s.jokerTargets.hand,"before");
  score("Cavendish","xmult",3);
  score("Card Sharp","xmult",3,c => (c.s.handCounts[c.name] || 0) > 0);
  growing("Red Card","mult","packSkip",3);
  score("Madness","xmult",c => 1 + bonus(c));
  growing("Square Joker","chips","before",c => c.cards.length === 4 ? 4 : 0);
  on("Séance","hand",c => { if (c.name === "Straight Flush") c.create("spectral"); });
  on("Vampire","before",c => {
    if (c.copied) return;
    for (const card of c.scoring) if (card.enhancement) {
      c.updateCard(card,{enhancement:null});
      bank(c,0.1);
    }
  });
  score("Vampire","xmult",c => 1 + bonus(c));
  growing("Hologram","xmult","cardAdded",0.25);
  on("Vagabond","hand",c => { if (c.s.money <= 4) c.create("spell"); });
  score("Baron","xmult",1.5,rankIn([13]),"heldCard");
  growing("Obelisk","xmult","before",c => (c.s.seenHands[c.name] || 0) >= Math.max(0,...Object.values(c.s.seenHands)) ? -bonus(c) : 0.2);
  on("Midas Mask","before",c => {
    for (const card of c.scoring.filter(c.face)) c.updateCard(card,{enhancement:"gold"});
  });
  card("Photograph","xmult",2,c => c.scoring.find(c.face)?.id === c.card.id);
  score("Erosion","mult",c => 4 * Math.max(0,c.s.startingDeckSize - c.s.deck.length));
  score("Reserved Parking","money",1,c => face(c) && c.chance(2),"heldCard");
  on("Mail-In Rebate","discard",c => ({money:5 * c.cards.filter(card=>rankOf(card) === c.s.jokerTargets.rank).length}));
  on("Hallucination","packOpen",c => { if (c.chance(2)) c.create("spell"); });
  score("Fortune Teller","mult",c => c.s.tarotsUsed || 0);
  score("Stone Joker","chips",c => 25 * c.s.deck.filter(card=>card.enhancement === "stone").length);
  growing("Lucky Cat","xmult","lucky",0.25);
  score("Bull","chips",c => 2 * Math.max(0,c.s.money));
  on("Trading Card","discard",c => {
    if (c.s.discardCount === 1 && c.cards.length === 1) { c.destroyCards(c.cards); return {money:3}; }
  });
  growing("Flash Card","mult","reroll",2);
  score("Popcorn","mult",c => 20 - 4 * (c.memory.spent || 0));
  growing("Spare Trousers","mult","before",c => c.contains["Two Pair"] ? 2 : 0);
  card("Ancient Joker","xmult",1.5,c => c.suited(c.card,c.s.jokerTargets.ancient));
  score("Ramen","xmult",c => 2 - (c.memory.discarded || 0) / 100);
  on("Ramen","discard",c => {
    if (!c.copied && (c.memory.discarded = (c.memory.discarded || 0) + c.cards.length) >= 100) c.remove(c.ref);
  });
  on("Walkie Talkie","scoredCard",c => rankIn([4,10])(c) ? {chips:10,mult:4} : {});
  repeat("Seltzer",always);
  growing("Castle","chips","discard",c => 3 * c.cards.filter(card=>c.suited(card,c.s.jokerTargets.castle)).length);
  card("Smiley Face","mult",5,face);
  growing("Campfire","xmult","sell",0.25);
  on("Campfire","roundEnd",c => { if (!c.copied && c.s.blind === 2) c.memory.bonus = 0; });
  card("Golden Ticket","money",4,c => c.card.enhancement === "gold");
  score("Acrobat","xmult",3,c => c.lastHand);
  repeat("Sock and Buskin",face);
  score("Swashbuckler","mult",c => c.s.familiars.filter(ref=>ref !== c.owner).reduce((sum,ref)=>sum+c.sellPrice(ref),0));
  score("Throwback","xmult",c => 1 + 0.25 * c.s.stats.skipped);
  repeat("Hanging Chad",c => c.cardIndex === 0,2);
  card("Rough Gem","money",1,c => c.suited(c.card,"D"));
  card("Bloodstone","xmult",1.5,c => c.suited(c.card,"H") && c.chance(2));
  card("Arrowhead","chips",50,c => c.suited(c.card,"S"));
  card("Onyx Agate","mult",7,c => c.suited(c.card,"C"));
  growing("Glass Joker","xmult","destroyed",c => 0.75 * c.cards.filter(card=>card.enhancement === "glass").length);
  score("Flower Pot","xmult",3,c => suitsCovered(c,["H","D","S","C"],c.scoringSet.filter(card=>card.enhancement !== "wild" || !c.debuffed(card))));
  growing("Wee Joker","chips","scoredCard",c => rankOf(c.card) === 2 ? 8 : 0);
  card("The Idol","xmult",2,c => rankOf(c.card) === c.s.jokerTargets.idol.rank && c.suited(c.card,c.s.jokerTargets.idol.suit));
  score("Seeing Double","xmult",2,c => c.scoring.some(card=>card.enhancement !== "wild" && c.suited(card,"C") && c.suited(card,"S")) ||
    ["S","H","D"].some(suit=>suitsCovered(c,["C",suit])));
  score("Matador","money",8,c => c.bossTriggered);
  growing("Hit the Road","xmult","discard",c => 0.5 * c.cards.filter(card=>rankOf(card) === 11).length);
  on("Hit the Road","roundEnd",c => { if (!c.copied) c.memory.bonus = 0; });
  for (const [name,hand,amount] of [["The Duo","Pair",2],["The Trio","Three of a Kind",3],["The Family","Four of a Kind",4],
    ["The Order","Straight",3],["The Tribe","Flush",2]]) score(name,"xmult",amount,c => c.contains[hand]);
  score("Stuntman","chips",250);
  score("Shoot the Moon","mult",13,rankIn([12]),"heldCard");
  score("Driver's License","xmult",3,c => c.s.deck.filter(card=>card.enhancement).length >= 16);
  score("Bootstraps","mult",c => 2 * Math.max(0,Math.floor(c.s.money / 5)));
  growing("Canio","xmult","destroyed",c => c.cards.filter(c.face).length);
  card("Triboulet","xmult",2,rankIn([12,13]));
  score("Yorick","xmult",c => 1 + Math.floor((c.memory.discarded || 0) / 23));
  on("Yorick","discard",c => { if (!c.copied) c.memory.discarded = (c.memory.discarded || 0) + c.cards.length; });

  // Round, shop, inventory and consumable events share the same copy-resolution path as scoring.
  for (const [name,event,limit] of [["Ice Cream","after",20],["Seltzer","after",10],["Popcorn","roundEnd",5],["Turtle Bean","roundEnd",5]]) {
    on(name,event,c => {
      if (!c.copied && (c.memory.spent = (c.memory.spent || 0) + 1) >= limit) c.remove(c.ref);
    });
  }
  on("Gros Michel","roundEnd",c => { if (!c.copied && c.chance(6) && c.remove(c.ref)) c.s.bananaExtinct = true; });
  on("Cavendish","roundEnd",c => { if (!c.copied && c.chance(1000)) c.remove(c.ref); });
  on("Ceremonial Dagger","blindStart",c => {
    if (c.copied) return;
    const victim = c.s.familiars[c.s.familiars.indexOf(c.ref) + 1];
    if (!victim) return;
    const value = c.sellPrice(victim);
    if (c.remove(victim)) bank(c,2 * value);
  });
  score("Ceremonial Dagger","mult",bonus);
  on("Madness","blindStart",c => {
    if (c.copied || c.s.blind === 2) return;
    bank(c,0.5);
    c.remove(c.choose(c.s.familiars.filter(ref=>ref !== c.ref && !c.eternal(ref))));
  });
  on("Marble Joker","blindStart",c => c.addCard({...c.randomCard(),enhancement:"stone"},"deck"));
  on("Certificate","firstDraw",c => c.addCard({...c.randomCard(),seal:c.choose(["gold","red","purple","blue"])},"hand"));
  on("Cartomancer","blindStart",c => c.create("spell"));
  on("Riff-Raff","blindStart",c => { c.create("common"); c.create("common"); });
  on("Burglar","blindStart",c => { c.s.hands += 3; c.s.discards = 0; });
  on("Egg","roundEnd",c => { c.memory.sellBonus = (c.memory.sellBonus || 0) + 3; });
  on("Gift Card","roundEnd",c => {
    for (const ref of [...c.s.familiars,...c.s.consumables]) c.raisePrice(ref);
  });
  on("Rocket","roundEnd",c => { if (c.s.blind === 2) bank(c,2); });
  on("Rocket","cashBonus",c => ({money:1 + bonus(c)}));
  on("Golden Joker","cashBonus",() => ({money:4}));
  on("Delayed Gratification","cashBonus",c => ({money:c.s.discardCount ? 0 : 2 * c.s.discards}));
  on("Cloud 9","cashBonus",c => ({money:c.s.deck.filter(card=>rankOf(card) === 9).length}));
  on("Satellite","cashBonus",c => ({money:Object.keys(c.s.planetUses || {}).length}));
  on("Diet Cola","sold",c => { c.s.doubleTags = (c.s.doubleTags || 0) + 1; });
  on("Luchador","sold",c => { if (c.s.phase === "play" && c.s.blind === 2) c.disableBoss(); });
  on("Invisible Joker","roundEnd",c => { c.memory.rounds = (c.memory.rounds || 0) + 1; });
  on("Invisible Joker","sold",c => { if (c.memory.rounds >= 2) c.duplicateFamiliar(); });
  on("Perkeo","leaveShop",c => {
    const target = c.choose(c.s.consumables);
    if (target) c.negativeCopy(target);
  });
  on("Burnt Joker","discard",c => { if (c.s.discardCount === 1) c.s.levels[c.name]++; });
  const api = {rules,rankOf,rankChips};
  root.CWJokerRules = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
