const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const game = require("../engine.js");
const {familiars} = require("../content.js");

const roster = Object.values(familiars);
const ids = Object.fromEntries(roster.map(f=>[f.joker,f.id]));
function setup(...jokers) {
  const s = game.newRun("JOKER-CHECK");
  s.familiars = jokers.map(j=>ids[j]);
  return s;
}
function deal(s, faces) {
  const rank = {A:14,K:13,Q:12,J:11};
  s.hand = faces.split(" ").map(face=>s.deck.find(card=>
    card.rank === (rank[face.slice(0,-1)] || Number(face.slice(0,-1))) && card.suit === face.at(-1)));
  assert.ok(s.hand.every(Boolean));
  s.draw = s.deck.filter(c=>!s.hand.includes(c));
  return s.hand.map(c=>c.id);
}
function round(...jokers) {
  const s = setup(...jokers);
  game.startBlind(s);
  s.target = 1e9;
  return s;
}
function shop(s) {
  s.target = 1;
  game.play(s,[s.hand[0].id]);
  assert.equal(game.cashOut(s),true);
}

test("all 150 Jokers have distinct portraits, matching rarity totals, and 121 copyable effects",()=>{
  assert.equal(roster.length,150);
  assert.equal(new Set(roster.map(f=>f.joker)).size,150);
  assert.equal(new Set(roster.map(f=>f.art)).size,150);
  assert.equal(roster.filter(f=>f.copyable).length,121);
  assert.deepEqual(["Common","Uncommon","Rare","Legendary"].map(r=>roster.filter(f=>f.rarity===r).length),[61,64,20,5]);
  for (const f of roster) assert.ok(fs.existsSync(path.join(__dirname,"..","art",f.art+".png")),f.id);
});

for (const familiar of roster) {
  test(familiar.joker+" plays, saves, reloads, discards and reaches the shop",()=>{
    const s = round(familiar.joker);
    const cards = deal(s,"2S 2C 3H 4D 6H JH QS KC");
    const before = JSON.stringify(s);
    const view = game.preview(s,cards.slice(0,2));
    assert.equal(JSON.stringify(s),before);
    const loaded = game.restore(JSON.parse(before));
    const result = game.play(loaded,cards.slice(0,2));
    assert.equal(result.total,view.total);
    assert.ok(Number.isFinite(result.total));
    if (loaded.discards) game.discard(loaded,[loaded.hand[0].id]);
    shop(loaded);
    assert.equal(loaded.phase,"shop");
    assert.equal(game.leaveShop(loaded),true);
    assert.equal(game.startBlind(loaded),true);
  });
}

test("contained hands pay once each even when the named hand is a Full House",()=>{
  const s = round("Jolly Joker","Zany Joker","Clever Joker","The Trio");
  const view = game.play(s,deal(s,"2S 2C 2H 4D 4H"));
  assert.equal(view.name,"Full House");
  assert.equal(view.chips,40+14+80);
  assert.equal(view.mult,(4+8+12)*3);
});

test("Four Fingers can combine a four-card Flush and separate four-card Straight",()=>{
  const s = round("Four Fingers");
  const view = game.preview(s,deal(s,"2D 3D 4D 5C 9D"));
  assert.equal(view.name,"Straight Flush");
  assert.equal(view.scoring.length,5);
  assert.equal(game.preview(s,deal(s,"2D 3D 8D KC QD")).scoring.length,4);
});

test("Blueprint and Brainstorm chains respect order, incompatibility and cycles",()=>{
  const s = round("Blueprint","Brainstorm","Joker");
  const hand = deal(s,"2S");
  assert.equal(game.preview(s,hand).mult,5);
  game.reorder(s,2,1);
  assert.equal(game.preview(s,hand).mult,13);
  s.familiars=[ids.Blueprint,ids["Four Fingers"]];
  assert.equal(game.preview(s,hand).mult,1);
});

test("Hanging Chad, Hiker, Wee Joker and Blueprint apply growth on the correct trigger",()=>{
  const s = round("Hanging Chad","Hiker","Blueprint","Wee Joker");
  const hand = deal(s,"2S");
  const view = game.preview(s,hand);
  assert.equal(s.hand[0].tallyChips,undefined);
  assert.equal(view.chips,5+2+7+12+24+24);
  assert.equal(game.play(s,hand).chips,view.chips);
  assert.equal(s.deck.find(c=>c.id===hand[0]).tallyChips,15);
  assert.equal(s.jokerMemory[ids["Wee Joker"]].bonus,24);
});

test("Vampire and Midas Mask convert cards in familiar order before scoring",()=>{
  for (const [a,b,end] of [["Vampire","Midas Mask","gold"],["Midas Mask","Vampire",undefined]]) {
    const s=round(a,b);
    const hand=deal(s,"QS");
    s.hand[0].enhancement="steel";
    assert.equal(game.play(s,hand).mult,1.1);
    assert.equal(s.deck.find(c=>c.id===hand[0]).enhancement,end);
  }
});

test("DNA adds a held copy and Hologram gains on that same hand",()=>{
  const s=round("DNA","Hologram","Baron");
  const hand=deal(s,"KS 5H");
  const result=game.play(s,[hand[0]]);
  assert.equal(s.deck.length,53);
  assert.equal(s.hand.filter(c=>c.rank===13 && c.suit==="S").length,1);
  assert.equal(result.mult,1.5*1.25);
});

test("trading, discarding and spell destruction reach Canio, Yorick and Burnt Joker",()=>{
  const s=round("Canio","Trading Card","Burnt Joker","Yorick");
  const hand=deal(s,"JH QS 4H 5C 6D");
  const purse=s.money;
  game.discard(s,[hand[0]]);
  assert.equal(s.deck.length,51);
  assert.equal(s.money,purse+3);
  assert.equal(s.levels["High Card"],2);
  assert.equal(s.jokerMemory[ids.Canio].bonus,1);
  assert.equal(s.jokerMemory[ids.Yorick].discarded,1);
  s.consumables=["unwrite"];
  game.use(s,0,[hand[1]]);
  assert.equal(s.jokerMemory[ids.Canio].bonus,2);
});

test("Showman duplicates keep independent counters through reordering, reload and sale",()=>{
  const s=round("Showman","Green Joker");
  shop(s);
  s.money=50;
  s.offers=[ids["Green Joker"]];
  assert.equal(game.buy(s,0),true);
  const [first,second]=s.familiars.slice(1);
  assert.notEqual(first,second);
  game.reorder(s,2,1);
  const restored=game.restore(JSON.parse(JSON.stringify(s)));
  game.leaveShop(restored);
  game.startBlind(restored);
  game.play(restored,[restored.hand[0].id]);
  assert.equal(game.ownedItem(restored,"familiars",1).stackAmount,"+1");
  assert.equal(game.ownedItem(restored,"familiars",2).stackAmount,"+2");
  game.sell(restored,2);
  assert.equal(game.ownedItem(restored,"familiars",1).stackAmount,"+1");
});

test("Credit Card, Chaos, Flash Card and Astronomer use normal shop transactions",()=>{
  const s=round("Credit Card","Chaos the Clown","Flash Card","Astronomer");
  shop(s);
  s.money=-20;
  s.offers=["star_candle","star_chart",ids.Joker];
  assert.equal(game.price(s,"star_chart"),0);
  assert.equal(game.buy(s,0),true);
  assert.equal(game.buy(s,2),false);
  assert.equal(game.reroll(s),true);
  assert.equal(game.reroll(s),false);
  assert.equal(s.jokerMemory[ids["Flash Card"]].bonus,2);
  s.money=-18;
  s.offers=[ids.Joker];
  assert.equal(game.buy(s,0),true);
  assert.equal(s.money,-20);
});

test("Egg, Gift Card, Ceremonial Dagger and Perkeo use real inventory values and capacity",()=>{
  const s=round("Egg","Gift Card","Perkeo");
  s.consumables=["star_candle","alchemy"];
  shop(s);
  assert.equal(game.sellPrice(s,ids.Egg),6);
  assert.equal(game.sellPrice(s,"alchemy"),3);
  s.familiars.unshift(ids["Ceremonial Dagger"]);
  game.leaveShop(s);
  assert.equal(s.consumables.length,3);
  assert.equal(game.capacity(s).consumables,3);
  assert.match(s.consumables[2],/~negative/);
  game.startBlind(s);
  assert.ok(!s.familiars.includes(ids.Egg));
  assert.equal(s.jokerMemory[ids["Ceremonial Dagger"]].bonus,12);
});

test("selling a Blueprint copying Diet Cola doubles the next reward only",()=>{
  const s=setup("Blueprint","Diet Cola");
  assert.ok(game.sell(s,0));
  s.tags=["coins","coins"];
  const money=s.money;
  game.skipBlind(s);
  assert.equal(s.money,money+14);
  game.skipBlind(s);
  assert.equal(s.money,money+21);
});

test("Mr. Bones saves only at or above a quarter of the target",()=>{
  for (const [target,phase] of [[28,"payout"],[29,"lost"]]) {
    const s=round("Mr. Bones");
    s.target=target;
    s.hands=1;
    const hand=deal(s,"2S 5H");
    game.play(s,[hand[0]]);
    assert.equal(s.phase,phase);
    assert.equal(s.familiars.length,Number(phase==="lost"));
  }
});

test("Chicot disables a boss before dealing, including a boss that silences the leftmost familiar",()=>{
  for (const boss of ["famine","hollow_crown","eclipse"]) {
    const s=setup("Chicot");
    s.blind=2;
    s.bossId=boss;
    game.startBlind(s);
    assert.ok(s.bossDisabled);
    assert.equal(s.discards,3);
    assert.equal(s.target,600);
  }
});

test("static scoring Jokers pay their published values on qualifying cards and hands",()=>{
  // The delta is measured against the identical unmodified hand.
  const cases = [
    ["Joker","2S","mult",4],["Greedy Joker","2D","mult",3],["Lusty Joker","2H","mult",3],
    ["Wrathful Joker","2S","mult",3],["Gluttonous Joker","2C","mult",3],
    ["Jolly Joker","2S 2C","mult",8],["Zany Joker","2S 2C 2H","mult",12],
    ["Mad Joker","2S 2C 3S 3H","mult",10],["Crazy Joker","2S 3D 4C 5H 6S","mult",12],
    ["Droll Joker","2S 4S 7S QS KS","mult",10],["Sly Joker","2S 2C","chips",50],
    ["Wily Joker","2S 2C 2H","chips",100],["Clever Joker","2S 2C 3S 3H","chips",80],
    ["Devious Joker","2S 3D 4C 5H 6S","chips",100],["Crafty Joker","2S 4S 7S QS KS","chips",80],
    ["Half Joker","2D 4S 7H","mult",20],["Banner","2S","chips",90],
    ["Fibonacci","AS","mult",8],["Fibonacci","7S","mult",0],["Scary Face","JS","chips",30],
    ["Abstract Joker","2S","mult",3],["Even Steven","10S","mult",4],["Even Steven","QS","mult",0],
    ["Odd Todd","AS","chips",31],["Odd Todd","KS","chips",0],["Scholar","AC","chips",20],["Scholar","AC","mult",4],
    ["Supernova","2S","mult",1],["Ride the Bus","2S","mult",1],["Ride the Bus","JS","mult",0],
    ["Green Joker","2S","mult",1],["Square Joker","2S 3H 5C AD","chips",4],
    ["Runner","AS 2C 3H 4C 5D","chips",15],["Spare Trousers","3S 3D 5C 5S","mult",2],
    ["Bull","2S","chips",8],["Walkie Talkie","4S","chips",10],["Walkie Talkie","10D","mult",4],
    ["Smiley Face","QH","mult",5],["Arrowhead","AS","chips",50],["Onyx Agate","AC","mult",7],
    ["Rough Gem","AD","money",1],["Throwback","2S","mult",0],["Stuntman","2S","chips",250],
    ["Ice Cream","2S","chips",100],["Popcorn","2S","mult",20],["Gros Michel","2S","mult",15],
    ["Triboulet","QS","mult",1],["Triboulet","JS","mult",0],["The Duo","2S 2C","mult",2],
    ["The Trio","2S 2C 2H","mult",6],["The Family","2S 2C 2H 2D","mult",21],
    ["The Order","2S 3D 4C 5H 6S","mult",8],["The Tribe","2S 4S 7S QS KS","mult",4],
    ["Bootstraps","2S","mult",0],["Cavendish","2S","mult",2]
  ];
  for (const [joker,cards,stat,delta] of cases) {
    const active=round(joker), base=round();
    const actual=game.preview(active,deal(active,cards))[stat]-game.preview(base,deal(base,cards))[stat];
    assert.equal(actual,delta,joker+" with "+cards);
  }
});

test("round resources, blind generators, discard rewards and interest",()=>{
  const burglar=setup("Blueprint","Burglar");
  game.startBlind(burglar);
  assert.deepEqual([burglar.hands,burglar.discards],[10,0]);
  const resources=setup("Juggler","Drunkard","Merry Andy","Troubadour");
  game.startBlind(resources);
  assert.deepEqual([resources.hand.length,resources.discards,resources.hands],[10,7,3]);
  const sealed=setup("Certificate","Marble Joker","Cartomancer","Hologram");
  game.startBlind(sealed);
  assert.deepEqual([sealed.deck.length,sealed.hand.length,sealed.consumables.length],[54,9,1]);
  assert.ok(sealed.hand.some(c=>c.seal));
  assert.ok(sealed.deck.some(c=>c.enhancement==="stone"));
  assert.equal(sealed.jokerMemory[ids.Hologram].bonus,0.5);
  const income=round("Cloud 9","Golden Joker","Delayed Gratification","Rocket","To the Moon");
  income.money=35;
  income.target=1;
  game.play(income,[income.hand[0].id]);
  assert.deepEqual([income.payout.interest,income.payout.bonus],[10,4+4+6+1]);
});

test("balanced suits, Wild suits and all-scoring cards honor distinct cards",()=>{
  const s=round("Splash","Flower Pot","Seeing Double");
  const hand=deal(s,"2C 4D 7S QH");
  assert.equal(game.preview(s,hand).mult,6);
  s.hand[0].enhancement="wild";
  assert.equal(game.preview(s,[hand[0]]).mult,1);
  assert.equal(game.preview(s,hand.slice(0,2)).mult,2);
  s.blind=2;
  s.bossId="prism";
  assert.equal(game.preview(s,hand).mult,1,"a debuffed Wild cannot complete Flower Pot");
  s.hand[0].enhancement=null;
  assert.equal(game.preview(s,hand).mult,6,"a debuffed printed Diamond still counts toward Flower Pot");
  const smear=round("Smeared Joker","Greedy Joker");
  const hearts=deal(smear,"2D 4H 6D 8H QD");
  assert.equal(game.preview(smear,hearts).name,"Flush");
  assert.equal(game.preview(smear,hearts).mult,19);
  smear.familiars=[ids["Seeing Double"],ids["Smeared Joker"]];
  assert.equal(game.preview(smear,deal(smear,"AS")).mult,2);
});

test("Yorick grows every 23 discarded cards and Triboulet repeats on face-card retriggers",()=>{
  const yorick=round("Yorick");
  yorick.discards=8;
  for (const n of [5,5,5,5,2]) game.discard(yorick,yorick.hand.slice(0,n).map(c=>c.id));
  const check=()=>game.preview(yorick,[yorick.hand[0].id]).mult;
  assert.equal(check(),1);
  game.discard(yorick,[yorick.hand[0].id]);
  assert.equal(check(),2);
  const trib=round("Triboulet","Sock and Buskin");
  assert.equal(game.preview(trib,deal(trib,"KS KC")).mult,32);
});

test("a reloaded Invisible Joker makes a distinct copy and a Dagger respects Eternal",()=>{
  const s=round("Invisible Joker","Joker");
  for(let i=0;i<2;i++){
    shop(s);
    if (!i) {game.leaveShop(s);game.startBlind(s);}
  }
  const saved=game.restore(JSON.parse(JSON.stringify(s)));
  game.sell(saved,0);
  assert.equal(saved.familiars.length,2);
  assert.equal(game.item(saved.familiars[1]).joker,"Joker");
  assert.notEqual(...saved.familiars);
  const dagger=setup("Ceremonial Dagger");
  dagger.familiars.push(ids.Egg+"~~eternal");
  game.startBlind(dagger);
  assert.equal(dagger.familiars.length,2);
  assert.equal(game.preview(dagger,[dagger.hand[0].id]).mult,1);
});

test("chance multipliers, round targets, pack skipping and consumption use normal game actions",()=>{
  const s=round("Oops! All 6s","Business Card","Hallucination","Mail-In Rebate","Red Card");
  const hand=deal(s,"KH 9C 9H 3D");
  assert.equal(game.play(s,[hand[0]]).money,2);
  s.jokerTargets.rank=9;
  const money=s.money;
  game.discard(s,hand.slice(1,3));
  assert.equal(s.money,money+10);
  shop(s);
  s.offers=["scroll_case"];
  s.money=20;
  assert.ok(game.buy(s,0));
  assert.equal(s.consumables.length,1);
  assert.ok(game.closePack(s));
  assert.equal(s.jokerMemory[ids["Red Card"]].bonus,3);
});
