const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const game = require('../engine');
const {createStore} = require('../progression');

function storage() {
  const data = new Map();
  return {getItem:key=>data.get(key), setItem:(key,value)=>data.set(key,value)};
}

test('all five whimsical card sets have distinct artwork, unique achievements, and start locked', () => {
  const store = createStore(storage());
  const fresh = store.getProgress();
  assert.equal(fresh.equippedCardSet, 'classic');
  assert.equal(fresh.cardSets.length, 5);
  assert.equal(new Set(fresh.cardSets.map(s => s.achievement)).size, 5);
  const images = new Set();
  const courtImages = new Set();
  for (const set of fresh.cardSets) {
    assert.ok(fresh.achievements.some(a => a.id === set.achievement && a.description === set.goal));
    assert.equal(set.earned, false);
    assert.equal(store.equipCardSet(set.id), false);
    const image = fs.readFileSync(path.join(__dirname, '..', 'art', set.art + '.jpg'));
    assert.equal(image.readUInt16BE(0), 0xffd8);
    images.add(crypto.createHash('sha256').update(image).digest('hex'));
    for (const face of ['king', 'queen', 'jack']) {
      const court = fs.readFileSync(path.join(__dirname, '..', 'art', 'card-set-courts', `${set.id}-${face}.png`));
      assert.equal(court.readUInt32BE(0), 0x89504e47);
      courtImages.add(crypto.createHash('sha256').update(court).digest('hex'));
    }
  }
  assert.equal(images.size, 5);
  assert.equal(courtImages.size, 15);
});

test('fun achievements unlock each of the five card sets through real gameplay', () => {
  // 1. Toadstool Coven: 3 Flushes in a single blind
  {
    const store = createStore(storage());
    const run = game.newRun();
    game.startBlind(run);
    run.target = 1e9;
    run.hands = 5;
    // Two flushes in the first blind should not carry over to the next blind
    for (let i = 0; i < 2; i++) {
      run.hand = [2, 4, 6, 8, 10].map((rank, j) => ({id: `f1_${i}_${j}`, rank, suit: 'H'}));
      game.play(run, run.hand.map(c => c.id));
    }
    store.saveRun(run);
    assert.equal(store.getProgress().cardSets.find(s => s.id === 'toadstool-coven').earned, false);

    // Start a fresh blind: 1 flush (3rd of the run, 1st of this blind) must still be locked
    run.phase = 'select';
    game.startBlind(run);
    run.target = 1e9;
    run.hands = 5;
    for (let i = 0; i < 3; i++) {
      run.hand = [2, 4, 6, 8, 10].map((rank, j) => ({id: `f2_${i}_${j}`, rank, suit: 'S'}));
      game.play(run, run.hand.map(c => c.id));
      store.saveRun(run);
      const earned = store.getProgress().cardSets.find(s => s.id === 'toadstool-coven').earned;
      assert.equal(earned, i === 2);
    }
    assert.deepEqual(store.takeCardSetUnlocks().map(s => s.id), ['toadstool-coven']);
  }

  // 2. Owl Observatory: Level up any poker hand to Level 4
  {
    const store = createStore(storage());
    const run = game.newRun();
    run.levels['Pair'] = 3;
    store.saveRun(run);
    assert.equal(store.getProgress().cardSets.find(s => s.id === 'owl-observatory').earned, false);
    run.levels['Pair'] = 4;
    store.saveRun(run);
    assert.equal(store.getProgress().cardSets.find(s => s.id === 'owl-observatory').earned, true);
    assert.deepEqual(store.takeCardSetUnlocks().map(s => s.id), ['owl-observatory']);
  }

  // 3. Teacup Dragons: Defeat a Boss Blind in a single hand
  {
    const store = createStore(storage());
    const run = game.newRun();
    run.blind = 2;
    run.bossId = 'moon';
    game.startBlind(run);
    run.target = 10;
    run.hand = [{id: 'd1', rank: 14, suit: 'S'}];
    game.play(run, ['d1']);
    assert.equal(run.phase, 'payout');
    store.saveRun(run);
    assert.equal(store.getProgress().cardSets.find(s => s.id === 'teacup-dragons').earned, true);
    assert.deepEqual(store.takeCardSetUnlocks().map(s => s.id), ['teacup-dragons']);
  }

  // 4. Badger Alchemists: Play a 5-card hand where every card is enhanced, sealed, or has an edition
  {
    const store = createStore(storage());
    const run = game.newRun();
    game.startBlind(run);
    run.target = 1e9;
    run.hand = [
      {id: 'b1', rank: 2, suit: 'S', enhancement: 'bonus'},
      {id: 'b2', rank: 3, suit: 'H', seal: 'gold'},
      {id: 'b3', rank: 4, suit: 'C', edition: 'foil'},
      {id: 'b4', rank: 5, suit: 'D', enhancement: 'mult'},
      {id: 'b5', rank: 7, suit: 'S'}
    ];
    game.play(run, run.hand.map(c => c.id));
    store.saveRun(run);
    assert.equal(store.getProgress().cardSets.find(s => s.id === 'badger-alchemists').earned, false);

    run.hand = [
      {id: 'e1', rank: 2, suit: 'S', enhancement: 'bonus'},
      {id: 'e2', rank: 3, suit: 'H', seal: 'red'},
      {id: 'e3', rank: 4, suit: 'C', edition: 'holo'},
      {id: 'e4', rank: 5, suit: 'D', enhancement: 'lucky'},
      {id: 'e5', rank: 7, suit: 'S', seal: 'blue'}
    ];
    game.play(run, run.hand.map(c => c.id));
    store.saveRun(run);
    assert.equal(store.getProgress().cardSets.find(s => s.id === 'badger-alchemists').earned, true);
    assert.deepEqual(store.takeCardSetUnlocks().map(s => s.id), ['badger-alchemists']);
  }

  // 5. Goose Archmages: Hold $150 or more at once
  {
    const store = createStore(storage());
    const run = game.newRun();
    run.money = 149;
    store.saveRun(run);
    assert.equal(store.getProgress().cardSets.find(s => s.id === 'goose-archmages').earned, false);
    run.money = 150;
    store.saveRun(run);
    assert.equal(store.getProgress().cardSets.find(s => s.id === 'goose-archmages').earned, true);
    assert.deepEqual(store.takeCardSetUnlocks().map(s => s.id), ['goose-archmages']);
  }
});

test('card sets equip per profile independently from card backs and never unlock in seeded/playtest', () => {
  const db = storage();
  const store = createStore(db);
  for (const mode of [{seeded: true}, {playtest: 'royal_reader'}]) {
    const run = Object.assign(game.newRun(), mode, {money: 200});
    run.levels['Pair'] = 6;
    store.saveRun(run);
    assert.ok(store.getProgress().cardSets.every(s => !s.earned));
  }

  const run = game.newRun();
  run.money = 160;
  run.stats.roundsWon = 1;
  store.saveRun(run);
  const original = store.getRun();
  assert.ok(store.equipCardStyle('lantern-tabby'));
  assert.ok(store.equipCardSet('goose-archmages'));
  assert.equal(store.equipCardSet('teacup-dragons'), false);
  assert.deepEqual(store.getRun(), original);

  const reopened = createStore(db);
  assert.equal(reopened.getEquippedCardStyle().id, 'lantern-tabby');
  assert.equal(reopened.getEquippedCardSet().id, 'goose-archmages');

  const firstId = reopened.current().id;
  reopened.createProfile('Second Wizard');
  assert.equal(reopened.getEquippedCardSet(), null);
  assert.equal(reopened.equipCardSet('goose-archmages'), false);
  reopened.switchProfile(firstId);
  assert.equal(reopened.getEquippedCardSet().id, 'goose-archmages');
  assert.ok(reopened.equipCardSet('classic'));
  assert.equal(createStore(db).getProgress().equippedCardSet, 'classic');
});
