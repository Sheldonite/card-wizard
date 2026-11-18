const test = require('node:test');
const assert = require('node:assert/strict');
const game = require('../engine');
const {createStore} = require('../progression');
const content = require('../content');
const market = require('../market');
const rules = require('../familiar-unlocks');
const cards = Object.values(content.familiars);
const id = joker => cards.find(f => f.joker === joker).id;
const unlocked = (store, joker) => store.getProgress().unlocked.familiars.includes(id(joker));

function storage() {
  const values = new Map();
  return {getItem:k=>values.get(k), setItem:(k,v)=>values.set(k,v)};
}
function table(hand, deck = hand) {
  const s = game.newRun();
  s.deck = deck.map(([rank,suit,enhancement,seal],i) => ({id:'t'+i,rank,suit,enhancement,seal}));
  s.hand = s.deck.slice(0,hand.length);
  s.draw = s.deck.slice(hand.length);
  s.phase = 'play';
  s.target = 1e15;
  s.score = s.playedCount = s.discardCount = 0;
  s.handCounts = {};
  s.hands = s.discards = 6;
  return s;
}
const ids = s => s.hand.map(c=>c.id);
function expectAwards(store, s, yes, no = []) {
  store.saveRun(s);
  for (const j of yes) assert.ok(unlocked(store,j),j);
  for (const j of no) assert.ok(!unlocked(store,j),j);
}
function win(s) {
  s.blind = 2; s.ante = 8; s.phase = 'payout'; s.payout = {total:3};
  assert.ok(game.cashOut(s));
}

test('fresh profile and game pool agree on all 150 collection entries', () => {
  const store = createStore(storage()), profile = store.getProgress();
  assert.deepEqual(profile.unlocked.familiars,cards.slice(0,105).map(f=>f.id));
  assert.deepEqual(profile.familiarAchievements.map(a=>a.id),cards.slice(105,145).map(f=>f.id));
  assert.deepEqual(game.newRun().unlocks.familiars,profile.unlocked.familiars);
  const entries = profile.collection.find(g=>g.key==='familiars').entries;
  assert.ok(entries.every(e=>!e.discovered));
  assert.ok(entries.slice(105).every(e=>e.locked && e.unlockHint));
  assert.ok(entries.slice(145).every(e=>e.unlockHint.includes('The Old Name')));
});

test('ordinary packs and shops roll only available familiars; earning one is distinct from acquiring it', () => {
  const store = createStore(storage()), s = game.newRun();
  const allowed = new Set(s.unlocks.familiars);
  s.phase = 'shop'; s.money = 99999; s.rerolls = 0; s.shopOfferCount = 3;
  for (let i=0;i<90;i++) {
    s.offers=['familiar_egg'];
    assert.ok(game.buy(s,0));
    for (const ref of s.pack.choices) assert.ok(allowed.has(market.splitVariant(ref).id));
    game.closePack(s);
    assert.ok(game.reroll(s));
    for (const ref of s.offers.filter(Boolean)) {
      const f = game.item(ref);
      if (f.kind==='familiar') assert.ok(allowed.has(f.baseId || f.id));
    }
  }
  s.ante = 4;
  expectAwards(store,s,['Showman']);
  const reward = id('Showman');
  assert.ok(s.unlocks.familiars.includes(reward));
  assert.equal(store.getProgress().discovered[reward],undefined);
  s.offers=[reward]; assert.ok(game.buy(s,0));
  store.saveRun(s);
  assert.equal(store.getProgress().discovered[reward],1);
  assert.deepEqual(game.newRun(undefined,'gossip').familiars,['merlin']);
  assert.deepEqual(game.newRun(undefined,'gossip',{unlocked:{familiars:[id('Shoot the Moon')]}}).familiars,[id('Shoot the Moon')]);
});

test('loading old shop stock replaces locked offers while preserving purchased inventory and pack picks', () => {
  const s=game.newRun();
  s.phase='shop';s.familiars=[id('Blueprint')];
  s.offers=[id('Stuntman')+'~foil','old_name','scroll_case'];
  s.pack={pool:'familiar',choices:[id('The Tribe'),'night_owl'],remaining:2};
  const restored=game.restore(s);
  assert.deepEqual(restored.familiars,[id('Blueprint')]);
  assert.equal(market.splitVariant(restored.offers[0]).edition,'foil');
  assert.equal(game.item(restored.offers[1]).rarity,'Spectral');
  assert.notEqual(restored.offers[1],'old_name');
  assert.equal(restored.pack.remaining,2);
  for (const ref of [restored.offers[0],...restored.pack.choices]) assert.ok(!game.item(ref).unlock);
  const again=structuredClone(restored);
  assert.deepEqual(game.restore(again),restored);
});

test('lifetime counters accumulate once across saves, reloads and runs', () => {
  const db=storage();
  let store=createStore(db);
  const hand=[[11,'H'],[12,'D'],[2,'S']];
  const s=table(hand,[...hand,[5,'D']]);
  s.stats.handsPlayed=198; s.familiarProgress.faces=297;
  s.familiarProgress.familiarsSold=19; s.familiarProgress.cardsSold=48;
  game.play(s,ids(s));
  expectAwards(store,s,[],['Acrobat','Sock and Buskin','Swashbuckler','Burnt Joker']);
  store.saveRun(s);
  store=createStore(db);
  const next=table([[13,'S'],[2,'H']],[[13,'S'],[2,'H'],[2,'C']]);
  game.play(next,ids(next));
  next.phase='shop'; next.consumables=['blue_ink'];
  assert.ok(game.sellConsumable(next,0));
  expectAwards(store,next,['Acrobat','Sock and Buskin'],['Burnt Joker','Swashbuckler']);
  assert.ok(game.sell(next,0));
  expectAwards(store,next,['Swashbuckler','Burnt Joker']);
  assert.equal(store.getProgress().familiarAchievements.find(a=>a.id===id('Burnt Joker')).current,50);
  for (let i=0;i<4;i++) {const loss=game.newRun();loss.phase='lost';store.saveRun(loss);store.saveRun(loss);}
  assert.ok(!unlocked(store,'Mr. Bones'));
  const loss=game.newRun();loss.phase='lost';expectAwards(store,loss,['Mr. Bones']);
});

test('milestones use single-hand score, current ante and simultaneous cash', () => {
  const store=createStore(storage()), s=game.newRun();
  s.ante=3; s.stats.bestScore=9999; s.score=1e9; s.money=399; s.stats.moneyEarned=5000;
  expectAwards(store,s,[],['Showman','Oops! All 6s','Satellite']);
  s.ante=4; s.stats.bestScore=10000; s.phase='shop'; s.consumables=['market_favor'];
  assert.ok(game.use(s,0));
  s.money=0;
  expectAwards(store,s,['Showman','Oops! All 6s','Satellite'],['Flower Pot','The Idol']);
  s.ante=8; s.stats.bestScore=1e6;
  expectAwards(store,s,['Flower Pot','The Idol'],['Stuntman']);
  s.stats.bestScore=1e8; expectAwards(store,s,['Stuntman']);
});

test('deck composition requires simultaneous enhancements, suits and the seal on the same Gold card', () => {
  const store=createStore(storage()), s=game.newRun();
  s.deck=Array.from({length:120},(_,i)=>({id:'x'+i,suit:'DHSC'[i%4],rank:2+i%13}));
  s.deck[0].seal='gold';
  s.deck[1].enhancement='gold';
  for(let i=2;i<7;i++) s.deck[i].enhancement='glass';
  for(let i=7;i<10;i++) s.deck[i].enhancement='wild';
  for(let i=10;i<17;i++) s.deck[i].enhancement='steel';
  expectAwards(store,s,['Rough Gem','Bloodstone','Arrowhead','Onyx Agate','Glass Joker','Smeared Joker',"Driver's License"],['Certificate','Bootstraps']);
  s.deck[1].seal='gold';
  s.familiars=['merlin~polychrome','night_owl~polychrome'];
  expectAwards(store,s,['Certificate','Bootstraps']);
  s.deck=[]; s.familiars=[];
  expectAwards(store,s,['Certificate','Bootstraps','Glass Joker']);
});

test('play conditions inspect selected cards before effects, include kickers, and ignore previews', () => {
  const store=createStore(storage());
  const gold=[[7,'C','gold'],[7,'C','gold'],[7,'C','gold'],[7,'C','gold'],[2,'H','gold']];
  const s=table(gold); s.familiars=[id('Vampire')];
  const before=JSON.stringify(s);
  game.preview(s,ids(s));
  assert.equal(JSON.stringify(s),before);
  assert.equal(game.play(s,[ids(s)[0],ids(s)[0]]),null);
  expectAwards(store,s,[],['Golden Ticket','Seeing Double','Shoot the Moon']);
  game.play(s,ids(s));
  expectAwards(store,s,['Golden Ticket','Seeing Double','Shoot the Moon']);
  const wild=table([[7,'S','wild'],[7,'C'],[7,'C'],[7,'C']]);
  game.play(wild,ids(wild));
  expectAwards(createStore(storage()),wild,['Seeing Double']);
});

test('every Heart must actually be played in that round and survives a mid-round reload', () => {
  const store=createStore(storage()), hand=[[2,'H'],[9,'S'],[3,'H']], s=table(hand);
  game.play(s,[s.hand[0].id]); store.saveRun(s);
  const resumed=game.restore(store.getRun());
  assert.ok(!unlocked(store,'Shoot the Moon'));
  game.play(resumed,[resumed.hand.find(c=>c.suit==='H').id]);
  expectAwards(store,resumed,['Shoot the Moon']);
  const discarded=table(hand);
  game.discard(discarded,[discarded.hand[0].id]);
  game.play(discarded,[discarded.hand.find(c=>c.suit==='H').id]);
  expectAwards(createStore(storage()),discarded,[],['Shoot the Moon']);
  const nextRound=table(hand);
  game.play(nextRound,[nextRound.hand[0].id]);
  nextRound.phase='select'; game.startBlind(nextRound);
  game.play(nextRound,['t2']);
  expectAwards(createStore(storage()),nextRound,[],['Shoot the Moon']);
});

test('Royal Flush and five Jacks unlock on discard only', () => {
  const royal=[10,11,12,13,14].map(r=>[r,'S']), jacks=Array.from({length:5},()=>[11,'D']);
  for (const [hand,reward] of [[royal,'Brainstorm'],[jacks,'Hit the Road']]) {
    const played=table(hand);game.play(played,ids(played));expectAwards(createStore(storage()),played,[],[reward]);
    const tossed=table(hand);game.discard(tossed,ids(tossed));expectAwards(createStore(storage()),tossed,[reward]);
  }
  const short=table(royal.slice(0,4));
  game.discard(short,ids(short));expectAwards(createStore(storage()),short,[],['Brainstorm']);
});

test('boss finish uses the winning hand, discard count and hands actually played', () => {
  for (const [plays,discards,hand,chad,matador] of [
    [0,0,[[14,'S']],true,true],[0,1,[[14,'S']],true,false],
    [1,0,[[14,'S']],true,false],[0,0,[[2,'S'],[2,'H']],false,true]
  ]) {
    const s=table(hand);s.blind=2;s.bossDisabled=true;s.playedCount=plays;s.discardCount=discards;s.target=1;
    game.play(s,ids(s));
    assert.equal(s.phase,'payout');
    const store=createStore(storage());store.saveRun(s);
    assert.equal(unlocked(store,'Hanging Chad'),chad);assert.equal(unlocked(store,'Matador'),matador);
  }
});

test('one-hand clears tolerate skips and saves, while a multi-hand clear breaks the streak', () => {
  const db=storage(); let store=createStore(db), s=game.newRun();
  function clear(hands) {
    s.phase='select';s.blind=0;game.startBlind(s);s.playedCount=hands-1;s.target=1;
    game.play(s,[s.hand[0].id]);store.saveRun(s);store.saveRun(s);
  }
  clear(1);clear(1);clear(2);clear(1);clear(1);
  s.phase='select';game.skipBlind(s);store.saveRun(s);
  store=createStore(db);s=game.restore(store.getRun());
  clear(1);clear(1);
  assert.ok(!unlocked(store,'Troubadour'));
  clear(1);assert.ok(unlocked(store,'Troubadour'));
});

test('Ante 8 win snapshots round count, all five exact hand exclusions and peak inventory before endless', () => {
  const skipped={"The Duo":"Pair","The Trio":"Three of a Kind","The Family":"Four of a Kind","The Order":"Straight","The Tribe":"Flush"};
  for (const [reward,hand] of Object.entries(skipped)) {
    const s=game.newRun(); s.stats.roundsWon=18; s.seenHands={[hand]:1,'Full House':3};
    win(s);
    assert.ok(game.endless(s));
    s.stats.roundsWon=19;
    expectAwards(createStore(storage()),s,['Blueprint','Wee Joker','Invisible Joker',...Object.keys(skipped).filter(j=>j!==reward)],['Merry Andy',reward]);
  }
  const s=game.newRun();s.phase='shop';s.familiars=['merlin','night_owl','ember_moth','thornwing'];
  s.money=100;s.offers=['ruby_jay'];assert.ok(game.buy(s,0));assert.ok(game.sell(s,4));
  s.stats.roundsWon=12;win(s);
  expectAwards(createStore(storage()),s,['Merry Andy','Wee Joker'],['Invisible Joker']);
  const long=game.newRun();long.stats.roundsWon=19;win(long);
  expectAwards(createStore(storage()),long,['Blueprint'],['Wee Joker','Merry Andy']);
});

test('resume requires the active saved campaign and never awards from a mere load or completed result', () => {
  const db=storage();let store=createStore(db);const s=game.newRun();
  assert.equal(store.resumeRun(s),false);store.saveRun(s);store=createStore(db);
  const saved=store.getRun();expectAwards(store,saved,[],['Throwback']);
  assert.ok(store.resumeRun(saved));
  assert.deepEqual(store.takeFamiliarUnlocks(),[id('Throwback')]);store.resumeRun(saved);
  assert.deepEqual(store.takeFamiliarUnlocks(),[]);
  store.createProfile('Second');assert.ok(!unlocked(store,'Throwback'));assert.equal(store.resumeRun(saved),false);
  const done=game.newRun();done.phase='lost';store.saveRun(done);assert.equal(store.resumeRun(done),false);
});

test('all core spells and secret constellations require acquisition or use, across eligible runs', () => {
  const store=createStore(storage()), s=game.newRun();
  const spells=Object.values(content.spells).filter(rules.isCoreSpell);
  const stars=Object.values(content.spells).filter(d=>d.rarity==='Constellation');
  assert.equal(spells.length,22);assert.equal(stars.length,12);
  s.discovered.push('witch_tally',...spells.slice(1).map(d=>d.id),...stars.slice(0,-1).map(d=>d.id));
  s.offers=[spells[0].id,stars.at(-1).id];
  expectAwards(store,s,[],['Cartomancer','Astronomer']);
  const next=game.newRun();next.phase='shop';next.money=100;next.offers=[...s.offers];
  assert.ok(game.buy(next,0));assert.ok(game.buyAndUse(next,1));
  expectAwards(store,next,['Cartomancer','Astronomer']);
});

test('The Old Name replaces individual Spell and Spectral pack slots at 0.3% and summons through a locked collection', () => {
  const s=game.newRun();
  function open(pool,rolls,showman=false) {
    const api={hasJoker:()=>showman, random:()=>rolls.shift(),choose:(_,a)=>a[0],power:()=>0,
      shuffle:(_,a)=>a,spellPool:()=>['blue_ink','red_ink','sunwash']};
    return market.openPack(s,{choices:3,picks:1,pool},api).choices;
  }
  for (const pool of ['spell','spectral']) assert.deepEqual(open(pool,[0.003,0.00299,0]),['blue_ink','old_name','sunwash']);
  assert.ok(!open('star',[0,0,0]).includes('old_name'));
  s.consumables=['old_name'];assert.ok(!open('spell',[0,0,0]).includes('old_name'));
  const store=createStore(storage());const seen=new Set();
  s.phase='shop';s.familiars=[];s.rules.familiarCap=5;
  for(let i=0;i<5;i++) {
    s.pack={id:'scroll_case',choices:['old_name'],remaining:1,pool:'spell',hand:[]};
    assert.ok(game.pick(s,0));
    const ref=s.familiars.at(-1);seen.add(ref);
    store.saveRun(s);
    assert.ok(unlocked(store,game.item(ref).joker));
    assert.ok(store.getProgress().discovered[ref]);
  }
  assert.equal(seen.size,5);
  s.consumables=['old_name'];assert.equal(game.canUse(s,0),false);
});

test('seeded, challenge and playtest sessions never advance familiar achievements or discoveries', () => {
  const store=createStore(storage());
  for (const options of [{seeded:true},{challengeId:'quiet_study'},{playtest:true}]) {
    const s=table([[14,'H']]);
    Object.assign(s,options);s.money=800;s.ante=8;s.stats.handsPlayed=201;s.stats.bestScore=1e8;
    s.familiars=[id('Canio')];s.discovered.push('old_name','blue_ink',id('Canio'));
    game.play(s,ids(s));win(s);store.saveRun(s);store.resumeRun(s);
    assert.equal(store.getProgress().unlocked.familiars.length,105);
    assert.equal(store.getProgress().discovered[id('Canio')],undefined);
    assert.equal(store.getProgress().discovered.blue_ink,undefined);
  }
});

test('legacy counters migrate once, campaign wins survive mixed history, and missing peak inventory stays unknown', () => {
  const db=storage(), original=createStore(db), s=game.newRun();
  s.stats.handsPlayed=199;s.ante=4;s.stats.bestScore=9999;original.saveRun(s);
  const saved=JSON.parse(db.getItem('card-wizard.profiles.1'));
  const p=saved.profiles[0];delete p.familiarCareer;delete p.tracking.familiarCounters;delete p.run.familiarProgress;
  db.setItem('card-wizard.profiles.1',JSON.stringify(saved));
  const migrated=createStore(db), active=game.restore(migrated.getRun());
  expectAwards(migrated,active,['Showman'],['Acrobat']);
  active.stats.handsPlayed=200;expectAwards(migrated,active,['Acrobat']);
  win(active);expectAwards(migrated,active,['Blueprint'],['Invisible Joker']);
  p.stats.wins=1;p.discovered.challenge_quiet_study=1;p.stats.bestScore=1e9;p.stats.handsPlayed=300;
  db.setItem('card-wizard.profiles.1',JSON.stringify(saved));
  const mixed=createStore(db);
  assert.ok(unlocked(mixed,'Blueprint'));assert.ok(!unlocked(mixed,'Stuntman'));assert.ok(!unlocked(mixed,'Acrobat'));
});
