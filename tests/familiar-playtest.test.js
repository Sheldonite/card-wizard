const test = require('node:test');
const assert = require('node:assert/strict');
const game = require('../engine.js');
const progress = require('../progression.js');
const market = require('../market.js');
require('../playtest.js');

const practice = globalThis.CWPlaytest;
const first = (s,n) => s.hand.slice(0,n).map(card=>card.id);

test('each practice deal is repeatable and all 52 cards occupy exactly one zone', () => {
  for (const id of Object.keys(practice.deals)) {
    const a = practice.start(id), b = practice.start(id);
    assert.equal(a.phase,'play');
    assert.deepEqual(a.hand,b.hand);
    assert.deepEqual(a.draw,b.draw);
    assert.equal(a.hand.length,8);
    assert.equal(a.draw.length,44);
    assert.equal(new Set([...a.hand,...a.draw].map(c=>c.id)).size,52);
  }
});

test('Royal Reader pays +13 Mult for each Queen held, including red-seal repeats', () => {
  const s = practice.start('royal_reader');
  const snapshot = JSON.stringify(s);
  const pair = game.preview(s,first(s,2));
  assert.equal(pair.mult,28);
  assert.equal(pair.total,840);
  assert.equal(game.preview(s,first(s,4)).mult,2);
  assert.equal(JSON.stringify(s),snapshot);
  s.hand[2].seal='red';
  assert.equal(game.play(s,first(s,2)).mult,41);
});

test('Wayfinder allows multiple one-rank gaps with either Ace and can complete a Straight Flush', () => {
  for (const [ranks,expected] of [
    [[4,5,7,8,9],6], [[3,4,6,8,9],5], [[14,2,4,5,6],3], [[9,10,11,13,14],12],
    [[14,2,3,4,5],null], [[9,10,11,12,13],null]
  ]) {
    const cards = ranks.map((rank,i)=>({rank,suit:i%2?'D':'S'}));
    const view = game.evaluate(cards,true);
    assert.equal(view.name,'Straight');
    assert.equal(view.skippedRank ?? null,expected);
    assert.equal(game.evaluate(cards.map(c=>({...c,suit:'S'})),true).name,'Straight Flush');
  }
  for (const ranks of [[3,4,7,8,9],[12,13,14,2,3],[4,4,5,7,8]]) {
    assert.doesNotMatch(game.evaluate(ranks.map(rank=>({rank,suit:'S'})),true).name,/Straight/);
  }
  const s = practice.start('wayfinder');
  const ids = first(s,5);
  assert.equal(game.play(s,ids).name,'Straight');
  assert.equal(s.stats.itemUses.wayfinder,1);
  for (const disabled of ['expired','boss','challenge']) {
    const run = practice.start('wayfinder');
    if (disabled === 'expired') {
      run.familiars[0] = market.withVariant('wayfinder','foil','perishable');
      run.familiarMemory.wayfinder = {age:5};
    } else if (disabled === 'boss') {
      run.blind = 2;
      run.bossId = 'hollow_crown';
    } else run.rules.noFamiliarEffects = true;
    assert.equal(game.preview(run,first(run,5)).name,'High Card');
  }
});

test('Dustfin repeats each scoring low card, with no repeat for a kicker', () => {
  const s = practice.start('dustfin');
  const [a,b,c] = s.hand;
  const view = game.preview(s,[a.id,b.id,c.id]);
  assert.deepEqual(view.steps.filter(step=>step.fact?.retriggers).map(step=>step.cardId),[a.id,b.id]);
  assert.equal(view.chips,26);
  assert.equal(game.play(s,[a.id,b.id,c.id]).total,52);
});

test('Fox rolls a repeatable 0-23 bonus, and spends consumables normally', () => {
  const s = practice.start('fox_in_ink');
  const restored = game.restore(JSON.parse(JSON.stringify(s)));
  const ids = first(s,1);
  const view = game.preview(s,ids);
  assert.ok(Number.isInteger(view.mult) && view.mult>=1 && view.mult<=24);
  assert.equal(game.play(restored,ids).total,view.total);
  s.consumables=['rank_stencil'];
  assert.equal(game.use(s,0,first(s,2)),true);
  assert.deepEqual(s.consumables,[]);
});

test('a practice deal cannot overwrite a campaign or change profile progress', () => {
  const data = new Map();
  const store = progress.createStore({getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)});
  const demo = practice.start('royal_reader');
  game.play(demo,first(demo,2));
  assert.equal(store.saveRun(demo),false);
  assert.equal(store.getRun(),null);
  assert.equal(store.saveRun(game.newRun('EXISTING','gossip')),true);
  const before = [...data];
  assert.equal(store.saveRun(demo),false);
  assert.deepEqual([...data],before);
});
