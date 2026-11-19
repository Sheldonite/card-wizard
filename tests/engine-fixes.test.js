const test = require("node:test");
const assert = require("node:assert/strict");
const content = require("../content.js");
const market = require("../market.js");
const game = require("../engine.js");
const progression = require("../progression.js");

const ids = Object.fromEntries(Object.values(content.familiars).map(f => [f.joker, f.id]));

function setup(...jokers) {
  const s = game.newRun("engine-fixes-seed");
  s.familiars = jokers.map(name => ids[name] || name);
  return s;
}

function deal(s, text) {
  const ranks = { J: 11, Q: 12, K: 13, A: 14 };
  s.hand = text.split(" ").map((code, i) => ({
    id: "fx" + i,
    suit: code.slice(-1),
    rank: ranks[code.slice(0, -1)] || Number(code.slice(0, -1))
  }));
  s.deck = [...s.hand, ...s.deck.slice(s.hand.length)];
  return s.hand.map(c => c.id);
}

test("perishable cash-out familiars and To the Moon trigger on all 5 blinds", () => {
  const s = setup(
    market.withVariant(ids["Golden Joker"], null, "perishable"),
    market.withVariant(ids["To the Moon"], null, "perishable")
  );
  for (let blind = 1; blind <= 5; blind++) {
    s.phase = "select";
    s.blind = 0;
    s.money = 25;
    game.startBlind(s);
    s.target = 1;
    game.play(s, [s.hand[0].id]);
    assert.equal(s.phase, "payout");
    assert.equal(s.payout.bonus, 4, "Golden Joker pays on blind " + blind);
    assert.equal(s.payout.interest, 10, "To the Moon doubles interest on blind " + blind);
    game.cashOut(s);
    game.leaveShop(s);
  }
  // On the 6th blind, both perishable familiars are now expired (age === 5).
  s.phase = "select";
  s.blind = 0;
  s.money = 25;
  game.startBlind(s);
  s.target = 1;
  game.play(s, [s.hand[0].id]);
  assert.equal(s.payout.bonus, 0, "Golden Joker is debuffed on blind 6");
  assert.equal(s.payout.interest, 5, "To the Moon is debuffed on blind 6");
});

test("Seeing Double with Smeared Joker requires two distinct scoring cards", () => {
  const s = setup("Seeing Double", "Smeared Joker");
  game.startBlind(s);
  assert.equal(game.preview(s, deal(s, "AC")).mult, 1);
  assert.equal(game.preview(s, deal(s, "AS")).mult, 1);
  assert.equal(game.preview(s, deal(s, "AC AS")).mult, 4);
});

test("dispelBoss wins immediately when lowered target is already met", () => {
  const s = setup("Luchador");
  s.blind = 2;
  s.bossId = "eclipse";
  game.startBlind(s);
  assert.equal(s.target, 900);
  s.score = 650;
  s.lastType = "Pair";
  assert.equal(game.sell(s, 0), true);
  assert.equal(s.bossDisabled, true);
  assert.equal(s.target, 600);
  assert.equal(s.phase, "payout");
});

test("Split Scroll checks consumable capacity for owned, shop, pack, and negative cases", () => {
  const s = setup();
  s.phase = "shop";
  s.money = 50;
  s.consumables = ["market_favor", "rehearsal"];
  s.offers = ["split_scroll"];
  assert.equal(game.canBuyAndUse(s, 0), false, "cannot buy-and-use Split Scroll when slots are full");

  s.pack = { id: "scroll_chest", pool: "spell", choices: ["split_scroll"], remaining: 1, hand: [] };
  assert.equal(game.canPick(s, 0), false, "cannot pick Split Scroll from pack when slots are full");
  s.pack = null;

  s.consumables = ["split_scroll", "market_favor"];
  assert.equal(game.canUse(s, 0), true, "can use owned non-negative Split Scroll when slots are full");

  s.consumables = ["market_favor", "rehearsal", market.withVariant("split_scroll", "negative")];
  assert.equal(game.canUse(s, 2), false, "cannot use owned Negative Split Scroll when non-negative slots are full");
});

test("blocked hands skip handCounts, seenHands, tallyPerPlay, and after dispatch, while recording Matador step and event", () => {
  const s = setup("Sixth Sense", "Matador");
  s.blind = 2;
  s.bossId = "lock";
  s.tallyPerPlay = 4;
  game.startBlind(s);
  const handIds = deal(s, "6S 2D 3H 4C 5S");
  const singleSix = [handIds[0]];
  const result = game.play(s, singleSix);
  assert.equal(result.blocked, true);
  assert.equal(s.handCounts["High Card"] || 0, 0);
  assert.equal(s.seenHands["High Card"] || 0, 0);
  assert.equal(s.deck.some(c => c.id === handIds[0]), true, "Sixth Sense does not destroy the 6 on a blocked hand");
  assert.equal(s.deck.find(c => c.id === handIds[0]).tallyChips || 0, 0, "tallyPerPlay is not banked on a blocked hand");
  assert.equal(result.money, 8);
  assert.ok(result.steps.some(step => step.familiarId === ids.Matador && step.text === "+$8"));
  const events = game.drainFamiliarEvents(s);
  assert.ok(events.some(ev => ev.familiarId === ids.Matador && ev.money === 8));
});

test("Hollow Crown locks silenced status to slot-0 familiar across mid-blind reorder", () => {
  const s = setup("Stuntman", "Joker");
  s.blind = 2;
  s.bossId = "hollow_crown";
  game.startBlind(s);
  assert.equal(game.handSize(s), 8, "Stuntman silenced at blind start does not reduce hand size");
  assert.equal(game.ownedItem(s, "familiars", 0).bossMuted, true);
  assert.equal(game.reorder(s, 0, 1), true);
  assert.equal(game.ownedItem(s, "familiars", 1).bossMuted, true, "Stuntman stays silenced after moving out of slot 0");
  assert.equal(game.ownedItem(s, "familiars", 0).bossMuted, undefined, "Joker moved into slot 0 is not silenced");
  const handIds = deal(s, "2S");
  const view = game.preview(s, handIds);
  assert.equal(view.chips, 7, "Stuntman still grants no +250 chips after reorder");
  assert.equal(view.mult, 5, "Joker still grants +4 mult");
});

test("Brainstorm unlock requires all 5 Royal Flush ranks including Ace", () => {
  const s = game.newRun();
  s.familiars = [ids["Four Fingers"]];
  game.startBlind(s);
  const fourCard = deal(s, "10S JS QS KS 2D").slice(0, 4);
  game.discard(s, fourCard);
  assert.ok(!s.familiarProgress.earned.Brainstorm, "4-card 10-J-Q-K does not unlock Brainstorm");

  const royal = deal(s, "10S JS QS KS AS");
  game.discard(s, royal);
  assert.equal(s.familiarProgress.earned.Brainstorm, true, "5-card Royal Flush unlocks Brainstorm");
});

test("abandoning an active run resets Troubadour one-hand streak", () => {
  const data = {};
  const db = {
    getItem: k => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); }
  };
  const store = progression.createStore(db);
  const clearOne = run => {
    run.phase = "select";
    run.blind = 0;
    game.startBlind(run);
    run.target = 1;
    game.play(run, [run.hand[0].id]);
    store.saveRun(run);
  };
  const r1 = game.newRun();
  clearOne(r1);
  clearOne(r1);
  clearOne(r1);
  assert.equal(store.getProgress().familiarAchievements.find(a => a.id === ids.Troubadour).current, 3);
  store.clearRun();
  assert.equal(store.getProgress().familiarAchievements.find(a => a.id === ids.Troubadour).current, 0);
});

test("ownedItem appends live dynamic counters and Loyalty Card singular/plural", () => {
  const s = setup(
    "Ice Cream", "Popcorn", "Seltzer", "Turtle Bean", "Ramen", "Rocket", "Yorick",
    "Driver's License", "Supernova", "Fortune Teller", "Throwback", "Erosion",
    "Bull", "Bootstraps", "Loyalty Card"
  );
  s.money = 25;
  s.tarotsUsed = 7;
  s.stats.skipped = 2;
  s.seenHands["Flush"] = 3;
  s.deck.pop();
  s.deck.pop();
  s.deck[0].enhancement = "bonus";
  s.jokerMemory[ids["Ice Cream"]] = { spent: 3 };
  s.jokerMemory[ids.Popcorn] = { spent: 2 };
  s.jokerMemory[ids.Seltzer] = { spent: 9 };
  s.jokerMemory[ids["Turtle Bean"]] = { spent: 1 };
  s.jokerMemory[ids.Ramen] = { discarded: 25 };
  s.jokerMemory[ids.Rocket] = { bonus: 4 };
  s.jokerMemory[ids.Yorick] = { discarded: 25 };
  s.jokerMemory[ids["Loyalty Card"]] = { turn: 5 };

  const desc = i => game.ownedItem(s, "familiars", i).description;
  assert.match(desc(0), /\+85 Chips/);
  assert.match(desc(1), /\+12 Mult/);
  assert.match(desc(2), /1 hand left/);
  assert.match(desc(3), /\+4 hand size/);
  assert.match(desc(4), /x1\.75 Mult/);
  assert.match(desc(5), /\$5\/round/);
  assert.match(desc(6), /x2 Mult, 2\/23 cards/);
  assert.match(desc(7), /1\/16 enhanced/);
  assert.match(desc(8), /Flush: \+3 Mult/);
  assert.match(desc(9), /\+7 Mult/);
  assert.match(desc(10), /x1\.5 Mult/);
  assert.match(desc(11), /\+8 Mult/);
  assert.match(desc(12), /\+50 Chips/);
  assert.match(desc(13), /\+10 Mult/);
  assert.match(desc(14), /1 hand to go\)/);
  s.jokerMemory[ids["Loyalty Card"]].turn = 0;
  assert.match(desc(14), /6 hands to go\)/);
});

test("preview exposes non-RNG-leaking baseChips and baseMult", () => {
  const s = setup("Space Joker", "Misprint");
  s.levels["Pair"] = 3;
  game.startBlind(s);
  const view = game.preview(s, deal(s, "AS AC"));
  assert.equal(view.name, "Pair");
  assert.equal(view.baseChips, 40);
  assert.equal(view.baseMult, 4);

  // Also present on blocked hands
  s.blind = 2;
  s.bossId = "lock";
  const blockedView = game.preview(s, deal(s, "AS AC"));
  assert.equal(blockedView.blocked, true);
  assert.equal(blockedView.baseChips, 40);
  assert.equal(blockedView.baseMult, 4);
});

test("restore migrates legacy familiarMemory into jokerMemory", () => {
  const s = game.newRun("migrate-test");
  s.familiars = [market.withVariant("wayfinder", "foil", "perishable")];
  const saved = JSON.parse(JSON.stringify(s));
  saved.familiarMemory = { wayfinder: { age: 5 } };
  const restored = game.restore(saved);
  assert.equal(restored.familiarMemory, undefined);
  assert.equal(restored.jokerMemory.wayfinder.age, 5);
  assert.equal(game.ownedItem(restored, "familiars", 0).debuffed, true);
});

test("balance hooks: famine minAnte, ante1Scale, steeper endless curve, and spectral downsides", () => {
  assert.equal(game.BOSSES.famine.minAnte, 2);

  const topStake = Object.keys(game.STAKES).at(-1);
  const highStake = game.newRun("stake-curve", "arcane", { stakeId: topStake });
  highStake.ante = 1;
  highStake.blind = 0;
  assert.equal(game.blindInfo(highStake).target, Math.floor(300 * game.STAKES[topStake].ante1Scale));
  highStake.ante = 2;
  assert.equal(game.blindInfo(highStake).target, Math.floor(800 * game.STAKES[topStake].targetScale));

  const endless = game.newRun("endless-curve");
  endless.ante = 10;
  endless.blind = 0;
  assert.ok(game.blindInfo(endless).target > Math.round(50000 * Math.pow(1.9, 2)), "Endless scaling past Ante 8 is steeper than 1.9^n");

  const spec = setup("Joker");
  spec.phase = "shop";
  spec.money = 2;
  spec.consumables = ["midnight_collar", "hollow_scroll"];
  assert.equal(game.use(spec, 0), true);
  assert.equal(spec.rules.handSize, 7, "midnight_collar reduces permanent handSize by 1");
  spec.consumables = ["hollow_scroll", "market_favor"];
  assert.equal(game.use(spec, 0), true);
  assert.equal(spec.money, -3, "hollow_scroll applies -$5 downside even into debt");

  spec.rules.handSize = 1;
  spec.familiars = [ids.Joker];
  spec.consumables = ["midnight_collar"];
  assert.equal(game.canUse(spec, 0), false, "midnight_collar blocked if it would drop hand size below 1");
});
