// Card Wizard — deterministic, serializable run rules. UI selections live outside the run.
(function (root) {
  "use strict";
  const content = root.CWContent || (typeof require === "function" && require("./content.js"));
  const catalog = root.CWCatalog || (typeof require === "function" && require("./catalog.js"));
  const market = root.CWMarket || (typeof require === "function" && require("./market.js"));
  const jokerRules = root.CWJokerRules || (typeof require === "function" && require("./joker-rules.js"));
  const familiarUnlocks = root.CWFamiliarUnlocks || (typeof require === "function" && require("./familiar-unlocks.js"));
  const initialFamiliars = Object.values(content.familiars).filter(f => !f.unlock).map(f => f.id);
  const HANDS = {};
  const hand = (name, chips, mult, chipStep, multStep, secret = false) => {
    HANDS[name] = { name, chips, mult, chipStep, multStep, secret };
  };
  hand("High Card", 5, 1, 10, 1);
  hand("Pair", 10, 2, 15, 1);
  hand("Two Pair", 20, 2, 20, 1);
  hand("Three of a Kind", 30, 3, 20, 2);
  hand("Straight", 30, 4, 30, 3);
  hand("Flush", 35, 4, 15, 2);
  hand("Full House", 40, 4, 25, 2);
  hand("Four of a Kind", 60, 7, 30, 3);
  hand("Straight Flush", 100, 8, 40, 4);
  hand("Five of a Kind", 120, 12, 35, 3, true);
  hand("Flush House", 140, 14, 40, 4, true);
  hand("Flush Five", 160, 16, 50, 3, true);

  const DECKS = {
    arcane: { name: "Arcane Deck", description: "Begin with Merlin, $4, four hands, and three discards." },
    alchemist: { name: "Alchemist Deck", description: "Start with $10 and three hands per blind.", money:10, hands:3 },
    oracle: { name: "Oracle Deck", description: "Hold nine cards, with two discards per blind.", handSize:9, discards:2 },
    ...catalog.decks
  };
  const STAKES = catalog.stakes;
  const CHALLENGES = catalog.challenges;
  const SUITS = { S:"Spades", H:"Hearts", C:"Clubs", D:"Diamonds" };
  const SYMBOLS = { S:"♠", H:"♥", C:"♣", D:"♦" };
  const RANKS = {11:"J",12:"Q",13:"K",14:"A"};
  const BASE_TARGETS = [300, 800, 2000, 5000, 11000, 20000, 35000, 50000];
  const BOSSES = {
    thorn: { name:"The Thorn", description:"Clubs count toward poker hands but score no chips or enchantments.", suit:"C" },
    cinder: { name:"The Cinder", description:"Hearts count toward poker hands but score no chips or enchantments.", suit:"H" },
    mirror: { name:"The Mirror", description:"Playing the same hand type twice in a row scores zero." },
    veil: { name:"The Veil", description:"Face cards count toward poker hands but score no chips or enchantments." },
    lock: { name:"The Lock", description:"Only hands of exactly five played cards can score." },
    famine: { name:"The Famine", description:"Begin this blind with zero discards." },
    moon: { name:"The Pale Moon", description:"Draw and hold one fewer card during this blind." },
    eclipse: { name:"The Eclipse", description:"The final blind demands three times the Small Blind score.", scale:3, final:true },
    prism: { name:"The Prism", description:"Diamonds count toward poker hands but score no chips or enchantments.", suit:"D" },
    spire: { name:"The Spire", description:"Spades count toward poker hands but score no chips or enchantments.", suit:"S" },
    ...catalog.bosses
  };
  const TAGS = {
    coins:"Gain $7 immediately", stars:"Raise your most-played hand by one level",
    fortune:"Gain $1 per unused discard from your last blind, plus $4",
    reroll:"Your next shop's first reroll is free", doubled:"Earn an extra $8 after the next blind",
    ...catalog.tags
  };
  const BASE_STAKE = Object.keys(STAKES)[0];
  const legacyTagFamilies = {coins:"money",fortune:"money",doubled:"money",stars:"handLevel",reroll:"freeReroll"};
  const tagFamily = id => {
    const effect = TAGS[id]?.effect;
    return legacyTagFamilies[id] || (effect === "cash" || effect === "bonus" ? "money" : effect);
  };
  const differentReward = (first,pool) => pool.find(id=>tagFamily(id) !== tagFamily(first));
  const DEFAULT_RULES = {money:4,hands:4,discards:3,handSize:8,starter:["merlin"],anteLimit:8};
  const hash = text => {
    let value = 2166136261;
    for (const char of String(text)) value = Math.imul(value ^ char.codePointAt(0), 16777619);
    return value >>> 0;
  };
  function random(s) {
    s.rng = (s.rng + 0x6D2B79F5) >>> 0;
    let n = Math.imul(s.rng ^ s.rng >>> 15, s.rng | 1);
    n ^= n + Math.imul(n ^ n >>> 7, n | 61);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  }
  const choose = (s, array) => array[Math.floor(random(s) * array.length)];
  function shuffle(s, array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(random(s) * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
  const has = (s, voucher) => s.vouchers.includes(voucher);
  const baseVoucherPowers = {
    deep_pockets:{interestCap:5},long_sleeve:{handSize:1},second_wind:{discards:1},extra_turn:{hands:1},
    trade_route:{rerollDiscount:2},silver_tongue:{discount:0.2},menagerie:{familiarSlots:1}
  };
  const power = (s,key) => s.vouchers.reduce((total,id) =>
    total + (content.vouchers[id]?.power?.[key] ?? baseVoucherPowers[id]?.[key] ?? 0),0);
  const stake = s => STAKES[s.stakeId] || STAKES[BASE_STAKE];
  const boss = s => s.blind === 2 && !s.bossDisabled ? BOSSES[s.bossId] : null;
  const bossValue = (s,rule) => boss(s)?.rule === rule ? boss(s).value : 0;
  const cardLabel = c => (RANKS[c.rank] || c.rank) + SYMBOLS[c.suit];
  function discover(s,id) {
    if (id && !s.discovered.includes(id)) s.discovered.push(id);
  }
  function drawBoss(s, exclude) {
    const finale = s.ante % s.rules.anteLimit === 0;
    const pool = Object.keys(BOSSES).filter(id =>
      Boolean(BOSSES[id].final) === finale && (BOSSES[id].minAnte || 1) <= s.ante && id !== exclude);
    const used = finale ? s.finalBosses : s.regularBosses;
    const available = pool.filter(id=>!used.includes(id));
    if (!available.length) used.length = 0;
    const id = choose(s,available.length ? available : pool);
    if (id) used.push(id);
    return id || exclude || "eclipse";
  }
  function setupAnte(s) {
    s.bossId = drawBoss(s);
    s.bossDisabled = false;
    s.bossRerollsUsed = 0;
    s.bossDisablesUsed = 0;
    const pool = shuffle(s,Object.keys(TAGS));
    s.tags = [pool[0],differentReward(pool[0],pool)];
    s.skipReceipts = [];
    s.anteVoucher = null;
    s.voucherSold = false;
  }
  function blindInfo(s, index = s.blind) {
    const guard = BOSSES[s.bossId];
    const base = s.ante <= 8 ? BASE_TARGETS[s.ante - 1] : Math.round(50000 * Math.pow(1.9, s.ante - 8));
    const kind = ["Small Blind","Big Blind","Boss Blind"][index];
    const reward = index < 2 ? TAGS[s.tags[index]] : null;
    let tag = reward?.description || reward;
    if (reward?.effect === "edition") {
      const edition = market.editions[reward.value].name;
      const candidates = editionCandidates(s,{kind:"familiar",edition:reward.value});
      if (candidates.length === 1) tag = item(candidates[0].id).name + " becomes " + edition + ".";
      else if (candidates.length) tag = "A random Familiar without an edition becomes " + edition + ".";
      else tag = "The next Familiar you gain without an edition becomes " + edition + ".";
    }
    return {
      name: index === 2 ? guard.name : kind, kind,
      description: index === 2 ? (s.bossDisabled ? "Boss rule dispelled." : guard.description) : "Beat the target before you run out of hands.",
      target: Math.floor(base * (stake(s).targetScale || 1) * (s.rules.targetScale || 1) *
        [1, 1.5, !s.bossDisabled && guard.scale || 2][index]),
      reward: Math.max(0,[3,4,5][index] - (index === 0 ? stake(s).rewardReduction || 0 : 0)),
      tag
    };
  }
  function handSize(s) {
    const extra = jokerCount(s,"Juggler") + 2 * jokerCount(s,"Troubadour") - jokerCount(s,"Merry Andy") - 2 * jokerCount(s,"Stuntman") +
      s.familiars.reduce((n,ref,i)=>n+(jokerOf(ref) === "Turtle Bean" && activeFamiliar(s,i) ? 5-(memoryOf(s,ref).spent || 0) : 0),0);
    return Math.max(0,extra + s.rules.handSize + power(s,"handSize") + s.blindMods.handSize -
      Number(boss(s) && s.bossId === "moon") - bossValue(s,"reduceHand"));
  }
  function refill(s) {
    while (s.hand.length < handSize(s) && s.draw.length) s.hand.push(s.draw.pop());
  }
  function startingFamiliars(deck, allowed = initialFamiliars, challenge) {
    const starters = challenge?.rules?.starter ?? deck.starter ?? DEFAULT_RULES.starter;
    return challenge ? [...starters] : starters.map(id => allowed.includes(id) ? id : "merlin");
  }
  function newRun(seed, deckId = "arcane", options = {}) {
    if (typeof options === "string") options = {stakeId:options};
    const explicitSeed = String(seed ?? "").trim();
    const unique = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const token = explicitSeed || unique.slice(0,12).toUpperCase();
    const {unlocked} = options;
    const allowed = (key,id) => !unlocked?.[key] || unlocked[key].includes(id);
    const challengeId = CHALLENGES[options.challengeId] && allowed("challenges",options.challengeId) ? options.challengeId : null;
    const challenge = CHALLENGES[challengeId];
    deckId = challenge?.deck || (DECKS[deckId] && allowed("decks",deckId) ? deckId : "arcane");
    const requestedStake = challenge?.stake || options.stakeId;
    const stakeId = STAKES[requestedStake] && (challenge || allowed("stakes",requestedStake)) ? requestedStake : BASE_STAKE;
    const {eternal,perishable,rental} = STAKES[stakeId];
    const rules = {...DEFAULT_RULES,...DECKS[deckId],eternal,perishable,rental,...challenge?.rules};
    rules.starter = startingFamiliars(DECKS[deckId],unlocked?.familiars,challenge);
    const s = {
      version:1, seed:token, deckId, stakeId, challengeId, rng:hash(token), rules, unlocks:{...unlocked,familiars:[...(unlocked?.familiars || initialFamiliars)]},
      phase:"select", ante:1, blind:0, round:1, bossId:null, tags:[], regularBosses:[], finalBosses:[],
      runId:unique, seeded:Boolean(explicitSeed), victory:false,
      money:rules.money, earnedBonus:0, freeReroll:false, rerolls:0, shopsVisited:0, shopOfferCount:2,
      deck:[], hand:[], draw:[], discardPile:[], nextId:1, familiars:[...rules.starter],
      consumables:[...(rules.startingConsumables || [])], vouchers:[...(rules.startingVouchers || [])],
      levels:{...Object.fromEntries(Object.keys(HANDS).map(name=>[name,1])),...rules.handLevels},
      seenHands:{}, offers:[], pack:null, lastScore:null, payout:null, tallyPerPlay:0,
      familiarProgress:familiarUnlocks.fresh(rules.starter.length),
      jokerMemory:{}, startingDeckSize:0, familiarMemory:{}, nextBlind:{}, blindMods:{hands:0,discards:0,handSize:0},
      discovered:["deck_" + deckId,"stake_" + stakeId,...rules.starter,...(rules.startingConsumables || []),...(rules.startingVouchers || [])],
      stats:{handsPlayed:0,discardsUsed:0,bestHand:"",bestScore:0,roundsWon:0,skipped:0,
        moneyEarned:0,purchases:0,packsOpened:0,bossesWon:0,spellsCast:0}
    };
    const composition = rules.composition || Object.keys(SUITS).flatMap(suit =>
      Array.from({length:13},(_,i)=>({suit,rank:i + 2})));
    for (const {copies = 1,...card} of composition) {
      for (let i = 0; i < copies; i++) s.deck.push({id:"c" + s.nextId++,...card});
    }
    familiarUnlocks.inventory(s);
    familiarUnlocks.deck(s);
    s.startingDeckSize = s.deck.length;
    rollTargets(s);
    if (challengeId) discover(s,"challenge_" + challengeId);
    setupAnte(s);
    s.target = blindInfo(s).target;
    s.score = s.hands = s.discards = 0;
    s.draw = [...s.deck];
    s.discardPile = [];
    return s;
  }
  function restore(s) {
    if (!s || !DECKS[s.deckId] || !Array.isArray(s.deck) || !BOSSES[s.bossId]) return null;
    if (s.tags?.length === 2 && s.blind < 2 && tagFamily(s.tags[0]) === tagFamily(s.tags[1])) {
      const pool = shuffle({rng:hash(s.seed + ":" + s.ante)},Object.keys(TAGS));
      s.tags[1] = differentReward(s.tags[0],pool);
    }
    s.rules = {...DEFAULT_RULES,...DECKS[s.deckId],...CHALLENGES[s.challengeId]?.rules,...s.rules};
    familiarUnlocks.state(s);
    s.stakeId = STAKES[s.stakeId] ? s.stakeId : BASE_STAKE;
    s.regularBosses ??= [];
    s.finalBosses ??= [];
    s.blindMods ??= {hands:0,discards:0,handSize:0};
    s.nextBlind ??= {};
    s.familiarMemory ??= {};
    s.jokerMemory ??= {};
    // Older runs could hold identical consumable references. Give every copy its own sell-value counter.
    for (const category of ["consumables","familiars"]) {
      const seen = new Set();
      s[category] = s[category].map(ref=>{
        const key=memoryKey(ref);
        if (seen.has(key)) return uniqueRef(s,ref);
        seen.add(key);
        return ref;
      });
    }
    s.startingDeckSize ??= s.rules.composition?.reduce((n,c)=>n+(c.copies || 1),0) || 52;
    if (!s.jokerTargets) rollTargets(s);
    s.planetUses ??= Object.fromEntries(Object.entries(s.stats.itemUses || {}).filter(([id])=>content.spells[id]?.rarity === "Constellation"));
    s.tarotsUsed ??= Object.entries(s.stats.itemUses || {}).reduce((n,[id,times])=>n+(content.spells[id]?.rarity === "Spell" ? times : 0),0);
    if (s.phase === "shop" && s.shopRerolled == null) {
      // Older saves tracked paid rerolls only. A claimed free reroll from the
      // consecutive skips leading here also counts once its token is spent.
      s.shopRerolled = Boolean(s.rerolls || s.familiarMemory.shopbell_sprite?.paid);
      for (let i = s.blind - 1; !s.shopRerolled && !s.freeReroll && s.skipReceipts?.[i]; i--) {
        s.shopRerolled = tagFamily(s.tags[i]) === "freeReroll";
      }
    }
    s.tallyPerPlay ??= 0;
    s.discovered ??= [s.deckId,...s.familiars,...s.consumables,...s.vouchers];
    s.runId ??= "legacy-" + s.seed;
    s.seeded ??= false;
    s.victory ??= s.phase === "won" || s.ante > 8;
    s.bossRerollsUsed ??= 0;
    s.shopsVisited ??= s.phase === "shop" ? 1 : Math.max(0,s.round - 1);
    s.shopOfferCount ??= s.phase === "shop" ? 3 : 2;
    s.stats = {moneyEarned:0,purchases:0,packsOpened:0,bossesWon:0,spellsCast:0,...s.stats};
    if (s.pack && !s.pack.hand && ["spell","spectral"].includes(s.pack.pool)) s.pack.hand = drawPackHand(s);
    if (s.phase === "shop") refreshLockedOffers(s);
    return s;
  }
  function startBlind(s) {
    if (s.phase !== "select") return false;
    s.phase = "play";
    if (s.blind === 2 && !s.rules.noFamiliarEffects && s.familiars.some(ref=>
      jokerOf(ref) === "Chicot" && (market.splitVariant(ref).sticker !== "perishable" || (s.familiarMemory[memoryKey(ref)]?.age || 0)<5))) s.bossDisabled = true;
    s.target = blindInfo(s).target;
    s.score = 0;
    s.blindMods = {hands:0,discards:0,handSize:0,...s.nextBlind};
    s.nextBlind = {};
    s.hands = Math.max(1,s.rules.hands - jokerCount(s,"Troubadour") + power(s,"hands") + s.blindMods.hands - bossValue(s,"reduceHands"));
    s.discards = boss(s) && s.bossId === "famine" ? 0 :
      Math.max(0,s.rules.discards + jokerCount(s,"Drunkard") + 3*jokerCount(s,"Merry Andy") + (stake(s).discards || 0) + power(s,"discards") + s.blindMods.discards);
    s.handCounts = {};
    s.lastType = "";
    s.playedCount = 0;
    familiarUnlocks.state(s).playedCards = {};
    s.discardCount = 0;
    s.lastScore = null;
    s.payout = null;
    s.hand = [];
    s.discardPile = [];
    s.draw = shuffle(s, [...s.deck]);
    // A new player's opening deal always demonstrates multiple suits, a court card, and an ace.
    if (!s.rules.composition && s.round === 1 && s.stats.handsPlayed === 0) {
      const top = () => s.draw.slice(-handSize(s));
      for (let n = 0; n < 100; n++) {
        const opening = top();
        if (new Set(opening.map(c=>c.suit)).size >= 3 && opening.some(c=>c.rank === 14) &&
          opening.some(c=>c.rank >= 11 && c.rank <= 13)) break;
        shuffle(s,s.draw);
      }
    }
    dispatch(s,"blindStart");
    refill(s);
    dispatch(s,"firstDraw");
    if (s.blind === 2) discover(s,"boss_" + s.bossId);
    if (!s.hand.length) s.phase = "lost";
    return true;
  }
  const advance = s => {
    if (s.blind === 2) { s.ante++; s.blind = 0; setupAnte(s); } else s.blind++;
    s.target = blindInfo(s).target;
  };
  function skipBlind(s) {
    if (s.phase !== "select" || s.blind === 2 || s.rules.noSkip) return false;
    const tag = s.tags[s.blind];
    const copies = 1 + (s.doubleTags || 0);
    s.doubleTags = 0;
    for (let copy=0;copy<copies;copy++) applySkipTag(s,tag);
    s.stats.skipped++;
    advance(s);
    return true;
  }
  function applySkipTag(s,tag) {
    const balance = s.money;
    discover(s,"tag_" + tag);
    if (tag === "coins") earn(s,7);
    if (tag === "fortune") earn(s,4 + s.discards);
    if (tag === "doubled") s.earnedBonus += 8;
    if (tag === "reroll") s.freeReroll = Number(s.freeReroll || 0) + 1;
    if (tag === "stars") {
      s.levels[mostPlayed(s)]++;
    }
    const {effect,value} = TAGS[tag] || {};
    if (effect === "cash") earn(s,value);
    if (effect === "bonus") s.earnedBonus += value;
    if (effect === "freeReroll") s.freeReroll = Number(s.freeReroll || 0) + 1;
    if (effect === "handLevel") s.levels[value.hand === "mostPlayed" ? mostPlayed(s) : value.hand] += value.levels;
    if (effect === "nextHands") s.nextBlind.hands = (s.nextBlind.hands || 0) + value;
    if (effect === "nextDiscards") s.nextBlind.discards = (s.nextBlind.discards || 0) + value;
    if (effect === "nextHandSize") s.nextBlind.handSize = (s.nextBlind.handSize || 0) + value;
    if (effect === "bossReroll") s.freeBossRerolls = (s.freeBossRerolls || 0) + 1;
    if (effect === "pack") (s.rewardPacks ??= []).push(value);
    let upgraded;
    if (effect === "edition") {
      upgraded = inventoryEdition(s,{kind:"familiar",edition:value});
      if (!upgraded) {
        if (s.nextEdition) (s.queuedEditions ??= []).push(value);
        else s.nextEdition = value;
      }
    }
    if (effect === "shopDiscount") s.nextShopDiscount = (s.nextShopDiscount || 1) * value;
    const receipt = (s.skipReceipts ??= []);
    if (upgraded) receipt[s.blind] = item(upgraded).name + " gained " + market.editions[value].name + ".";
    else if (effect === "edition") receipt[s.blind] = market.editions[value].name + " promised to the next Familiar without an edition.";
    else if (effect === "pack") receipt[s.blind] = "Earned a free " + item(value).name + ".";
    else if (tag === "reroll" || effect === "freeReroll") receipt[s.blind] = "Earned a free shop reroll.";
    else if (s.money > balance) receipt[s.blind] = "Collected $" + (s.money - balance) + ".";
    else if (tag === "stars") receipt[s.blind] = mostPlayed(s) + " reached level " + s.levels[mostPlayed(s)] + ".";
    else if (tag === "doubled") receipt[s.blind] = "Earned an extra $8 at the next payout.";
    else receipt[s.blind] = TAGS[tag]?.name || "Bonus claimed.";
  }
  const mostPlayed = s => Object.keys(HANDS).reduce((a,b) => (s.seenHands[b] || 0) > (s.seenHands[a] || 0) ? b : a);
  const bossRerollPrice = s => s.freeBossRerolls ? 0 : 10;
  const canRerollBoss = s => s.phase === "select" && s.blind === 2 && !s.bossDisabled &&
    (s.freeBossRerolls || s.bossRerollsUsed < power(s,"bossRerolls")) && affordable(s,bossRerollPrice(s));
  function rerollBoss(s) {
    if (!canRerollBoss(s)) return false;
    s.money -= bossRerollPrice(s);
    if (s.freeBossRerolls) s.freeBossRerolls--;
    else s.bossRerollsUsed++;
    s.bossId = drawBoss(s,s.bossId);
    s.target = blindInfo(s).target;
    return true;
  }
  const bossDisablePrice = s => s.bossWard ? 0 : 10;
  const canDisableBoss = s => s.phase === "select" && s.blind === 2 && !s.bossDisabled &&
    (s.bossWard || (s.bossDisablesUsed || 0) < power(s,"bossDisables")) && affordable(s,bossDisablePrice(s));
  function disableBoss(s) {
    if (!canDisableBoss(s)) return false;
    s.money -= bossDisablePrice(s);
    if (s.bossWard) s.bossWard--;
    else s.bossDisablesUsed = (s.bossDisablesUsed || 0) + 1;
    dispelBoss(s);
    return true;
  }
  function dispelBoss(s) {
    if (s.bossDisabled) return;
    const guard = boss(s);
    s.bossDisabled = true;
    s.target = blindInfo(s).target;
    if (guard && s.phase === "play") {
      if (guard.rule === "reduceHands") s.hands += guard.value;
      if (s.bossId === "famine" && !hasJoker(s,"Burglar")) s.discards = Math.max(0,
        s.rules.discards + (stake(s).discards || 0) + power(s,"discards") + s.blindMods.discards +
        jokerCount(s,"Drunkard") + 3*jokerCount(s,"Merry Andy") - s.discardCount);
      refill(s);
    }
  }
  function matching(ids, min, max, source) {
    if (!Array.isArray(ids) || ids.length < min || ids.length > max || new Set(ids).size !== ids.length) return null;
    const cards = ids.map(id => source.find(c=>c.id === id));
    return cards.every(Boolean) ? cards : null;
  }
  function suitMatch(card,suit,smeared = false,wild = true) {
    return card.enhancement !== "stone" && (card.suit === suit || (wild && card.enhancement === "wild") ||
      (smeared && "HD".includes(card.suit) === "HD".includes(suit)));
  }
  function evaluate(cards, allowGap = false, four = false, smeared = false, wildAllowed = () => true) {
    const ranked = cards.filter(card=>card.enhancement !== "stone");
    const groups = new Map();
    for (const card of ranked) {
      if (!groups.has(card.rank)) groups.set(card.rank,[]);
      groups.get(card.rank).push(card);
    }
    const sets = [...groups.values()].sort((a,b)=>b.length-a.length || b[0].rank-a[0].rank);
    const many = sets[0]?.length || 0;
    const second = sets[1]?.length || 0;
    const need = four ? 4 : 5;
    const flushSuit = Object.keys(SUITS).find(suit=>ranked.filter(c=>suitMatch(c,suit,smeared,wildAllowed(c))).length >= need);
    const flush = flushSuit ? ranked.filter(c=>suitMatch(c,flushSuit,smeared,wildAllowed(c))) : [];
    let straightRanks = [];
    // An ace can anchor either end, never wrap through the middle of a straight.
    for (let start=1;start<=14;start++) {
      if (!groups.has(start === 1 ? 14 : start)) continue;
      const path = [start];
      for (let next=start+1;next<=14;next++) {
        if (next === 14 && start === 1) break;
        if (next - path.at(-1) > (allowGap ? 2 : 1)) break;
        if (groups.has(next)) path.push(next);
      }
      if (path.length >= need && path.length >= straightRanks.length) straightRanks = path;
    }
    const straight = ranked.filter(c=>straightRanks.includes(c.rank) || (c.rank === 14 && straightRanks[0] === 1));
    const contains = {"Pair":many>=2,"Two Pair":second>=2,"Three of a Kind":many>=3,"Four of a Kind":many>=4,
      Straight:!!straight.length,Flush:!!flush.length};
    let name = "High Card", scoring = sets[0] || [];
    if (many === 5) { name = flush.length ? "Flush Five" : "Five of a Kind"; scoring=ranked; }
    else if (many === 3 && second === 2) { name = flush.length ? "Flush House" : "Full House"; scoring=ranked; }
    else if (flush.length && straight.length) { name="Straight Flush"; scoring=[...straight,...flush]; }
    else if (many === 4) name="Four of a Kind";
    else if (flush.length) { name="Flush"; scoring=flush; }
    else if (straight.length) { name="Straight"; scoring=straight; }
    else if (many === 3) name="Three of a Kind";
    else if (second === 2) { name="Two Pair"; scoring=[...sets[0],...sets[1]]; }
    else if (many === 2) name="Pair";
    const gap = straightRanks.find((rank,i)=>straightRanks[i+1] === rank+2);
    return {name,contains,flushSuit,scoring:cards.filter(c=>scoring.includes(c) || c.enhancement === "stone"),
      ...(gap && {skippedRank:gap+1})};
  }
  const classify = (s,cards) => evaluate(cards,hasJoker(s,"Shortcut"),hasJoker(s,"Four Fingers"),hasJoker(s,"Smeared Joker"),c=>!debuffed(s,c));
  function debuffed(s, card) {
    const guard = boss(s);
    if (!guard || !card) return false;
    return (guard.suit && suitMatch(card,guard.suit,hasJoker(s,"Smeared Joker"))) ||
      (s.bossId === "veil" && isFace(s,card));
  }
  const baseId = id => market.splitVariant(id).id;
  function earn(s,amount) {
    s.money += amount;
    if (s.money >= 400) familiarUnlocks.award(s,"Satellite");
    s.stats.moneyEarned += Math.max(0,amount);
  }
  function countUse(s,id) {
    const uses = s.stats.itemUses ??= {};
    const key = baseId(id);
    uses[key] = (uses[key] || 0) + 1;
  }
  const jokerOf = ref => content.familiars[baseId(ref)]?.joker;
  const memoryKey = ref => String(ref).split("~")[3] || baseId(ref);
  const memoryOf = (s,ref) => s.jokerMemory[memoryKey(ref)] ??= {};
  const bossSilences = (s,index) => s.phase === "play" && index < bossValue(s,"noJokers");
  function activeFamiliar(s,index) {
    const ref = s.familiars[index];
    if (!ref || bossSilences(s,index) || s.rules.noFamiliarEffects) return false;
    return market.splitVariant(ref).sticker !== "perishable" || (s.familiarMemory[memoryKey(ref)]?.age || 0) < 5;
  }
  const jokerCount = (s,name) => s.familiars.filter((ref,i)=>jokerOf(ref) === name && activeFamiliar(s,i)).length;
  const hasJoker = (s,name) => jokerCount(s,name) > 0;
  const funds = s => s.money + 20 * jokerCount(s,"Credit Card");
  const affordable = (s,cost) => cost === 0 || funds(s) >= cost;
  const isFace = (s,c) => hasJoker(s,"Pareidolia") || (c.enhancement !== "stone" && c.rank >= 11 && c.rank <= 13);
  const eternal = ref => market.splitVariant(ref).sticker === "eternal";
  function resolvedOwner(s,ref) {
    const seen = new Set();
    const original = ref;
    while (ref && !seen.has(ref)) {
      const i = s.familiars.indexOf(ref);
      if (!activeFamiliar(s,i)) return null;
      seen.add(ref);
      const def = content.familiars[baseId(ref)];
      if (original !== ref && !def.copyable) return null;
      if (def.joker === "Blueprint") ref = s.familiars[i+1];
      else if (def.joker === "Brainstorm") ref = s.familiars[0];
      else return ref;
    }
    return null;
  }
  function rollTargets(s) {
    const roll = {rng:hash(s.seed + ":joker-targets:" + s.round)};
    const ranked = s.deck.filter(card=>card.enhancement !== "stone");
    const target = () => ranked.length ? choose(roll,ranked) : {rank:14,suit:"S"};
    const {rank,suit} = target();
    const different = (values,last) => values.filter(x=>x !== last);
    s.jokerTargets = {idol:{rank,suit},rank:target().rank,castle:target().suit,
      ancient:choose(roll,different(Object.keys(SUITS),s.jokerTargets?.ancient)),
      hand:choose(roll,different(Object.keys(HANDS).filter(h=>!HANDS[h].secret || s.seenHands[h]),s.jokerTargets?.hand))};
  }
  function removeFamiliar(s,ref) {
    const index = s.familiars.indexOf(ref);
    if (index < 0 || eternal(ref)) return false;
    s.familiars.splice(index,1);
    delete s.jokerMemory[memoryKey(ref)];
    delete s.familiarMemory[memoryKey(ref)];
    return true;
  }
  function destroyCards(s,cards) {
    const ids = new Set(cards.map(c=>c.id));
    const destroyed = s.deck.filter(c=>ids.has(c.id));
    if (!destroyed.length) return;
    for (const zone of ["deck","draw","hand","discardPile"]) s[zone] = s[zone].filter(c=>!ids.has(c.id));
    if (s.pack?.hand) s.pack.hand = s.pack.hand.filter(c=>!ids.has(c.id));
    dispatch(s,"destroyed",{cards:destroyed});
  }
  function duplicateFamiliar(s) {
    if (!s.familiars.length || s.familiars.length >= capacity(s).familiars) return;
    const source = choose(s,s.familiars);
    const {id,edition,sticker} = market.splitVariant(source);
    const copy = uniqueRef(s,market.withVariant(id,edition === "negative" ? null : edition,sticker));
    s.familiars.push(copy);
    familiarUnlocks.inventory(s);
    s.jokerMemory[memoryKey(copy)] = {...memoryOf(s,source)};
    s.familiarMemory[memoryKey(copy)] = {...s.familiarMemory[memoryKey(source)]};
  }
  function uniqueRef(s,ref) {
    const plain = market.splitVariant(ref);
    const canonical = market.withVariant(plain.id,plain.edition,plain.sticker);
    if (![...s.familiars,...s.consumables].some(r=>memoryKey(r) === plain.id)) return canonical;
    s.nextInstance = (s.nextInstance || 0) + 1;
    return [plain.id,plain.edition || "",plain.sticker || "","i"+s.nextInstance].join("~");
  }
  function eventContext(s,extra) {
    const smeared = hasJoker(s,"Smeared Joker");
    const probability = 2 ** jokerCount(s,"Oops! All 6s");
    return {s,...extra,capacity:capacity(s),joker:jokerOf,eternal,random:()=>random(s),
      chance:n=>random(s) < probability / n,choose:a=>a.length ? choose(s,a) : null,
      debuffed:card=>debuffed(s,card),face:card=>isFace(s,card),suited:(c,suit)=>suitMatch(c,suit,smeared,!debuffed(s,c)),
      randomCard:()=>({rank:2+Math.floor(random(s)*13),suit:choose(s,Object.keys(SUITS))}),
      remove:ref=>removeFamiliar(s,ref),sellPrice:ref=>sellPrice(s,ref),
      addCard:(card,zone)=>addCard(s,card,zone),updateCard:(card,patch)=>updateCard(s,card,patch),
      destroyCards:cards=>destroyCards(s,cards),
      raisePrice:ref=>{const m=memoryOf(s,ref); m.sellBonus=(m.sellBonus || 0)+1;},
      disableBoss:()=>dispelBoss(s),duplicateFamiliar:()=>duplicateFamiliar(s),
      negativeCopy:ref=>{
        if (acquire(s,market.withVariant(baseId(ref),"negative"))) {
          s.jokerMemory[memoryKey(s.consumables.at(-1))] = {...s.jokerMemory[memoryKey(ref)]};
        }
      }};
  }
  function callJoker(s,ref,event,context,receive,owner = resolvedOwner(s,ref)) {
    if (!owner) return;
    const handler = jokerRules.rules[jokerOf(owner)]?.[event];
    if (!handler) return;
    const memory = context.soldMemory || memoryOf(s,owner);
    const create = pool => {
      const created = [];
      if (!generate(s,pool,created)) return false;
      countUse(s,ref);
      enqueueFamiliarEvent(s,{event,familiarId:ref,created});
      return true;
    };
    const result = handler({...context,create,memory,ref,owner,copied:ref !== owner});
    if (result && typeof result === "object" && ("chips" in result || "mult" in result || "xmult" in result ||
        "money" in result || "retriggers" in result)) receive(result,ref,owner);
  }
  function dispatch(s,event,extra = {}) {
    const ctx = eventContext(s,extra);
    for (const ref of [...s.familiars]) callJoker(s,ref,event,ctx,(effect,id)=>{
      if (effect.money) {
        if (event === "cashBonus") s.earnedBonus += effect.money;
        else earn(s,effect.money);
        countUse(s,id);
        enqueueFamiliarEvent(s,{event,familiarId:id,money:effect.money});
      }
    });
  }
  // Action feedback belongs to the current client, never to a saved run.
  const familiarEvents = new WeakMap();
  function enqueueFamiliarEvent(s,fact) {
    if (!familiarEvents.has(s)) familiarEvents.set(s,[]);
    familiarEvents.get(s).push(fact);
  }
  function drainFamiliarEvents(s) {
    const events = familiarEvents.get(s) || [];
    familiarEvents.delete(s);
    return events;
  }
  function preview(s,ids) {
    if (s.phase !== "play" || !ids?.length) return null;
    // Pre-scoring effects can change permanent cards, RNG, money and hand levels.
    // The preview runs the very same turn on an isolated state.
    return scoreHand(structuredClone({...s,lastScore:null}),ids);
  }
  function scoreHand(s,ids) {
    if (s.phase !== "play") return null;
    const cards = matching(ids,1,5,s.hand);
    if (!cards) return null;
    const hand = classify(s,cards);
    const {name,contains,skippedRank} = hand;
    const scored = hasJoker(s,"Splash") ? cards : hand.scoring;
    const guard = boss(s);
    const previous = s.handCounts[name] || 0;
    const blocked = guard && ((s.bossId === "lock" && cards.length !== 5) ||
      (s.bossId === "mirror" && s.lastType === name) ||
      (guard.rule === "capCards" && cards.length > guard.value) ||
      (guard.rule === "minCards" && cards.length < guard.value) ||
      (guard.rule === "uniqueHands" && previous >= guard.value));
    const active = scored.filter(c=>!debuffed(s,c));
    const held = s.hand.filter(c=>!ids.includes(c.id));
    const handEffects = {name,contains,cards,scoring:active,scoringSet:scored,held,lastHand:s.hands === 1,
      bossTriggered:!!(blocked || scored.some(c=>debuffed(s,c)) ||
        (guard && (["halveChips","halveMult","noCardChips"].includes(guard.rule) ||
        (guard.rule === "firstHand" && !s.playedCount) || (guard.rule === "slowStart" && s.playedCount < 2) ||
        (guard.rule === "noEnhancements" && scored.slice(0,guard.value).some(c=>c.enhancement)))))};
    if (blocked) {
      dispatch(s,"after",handEffects);
      let money = 0;
      for (const ref of s.familiars) if (jokerOf(resolvedOwner(s,ref)) === "Matador") { earn(s,8); money+=8; countUse(s,ref); }
      return {name,level:s.levels[name],chips:0,mult:0,total:0,money,scoring:[],blocked:true,
        steps:[{label:guard.name,text:guard.description}],broken:cards.filter(c=>!s.deck.some(card=>card.id===c.id)).map(c=>c.id)};
    }
    const balance = s.money;
    dispatch(s,"before",handEffects);
    const level = s.levels[name];
    let chips = HANDS[name].chips + (level-1)*HANDS[name].chipStep;
    let mult = HANDS[name].mult + (level-1)*HANDS[name].multStep;
    let money = s.money - balance;
    const steps = [{label:name,text:chips+" chips x "+mult,chips,mult}];
    const suppressed = {};
    const fired = new Set();
    function apply(effect,label,fact = {}) {
      const labels = [];
      if (effect.chips) { chips+=effect.chips; labels.push("+"+effect.chips+" Chips"); }
      if (effect.mult) { mult+=effect.mult; labels.push("+"+effect.mult+" Mult"); }
      if (effect.xmult != null && effect.xmult !== 1) { mult*=effect.xmult; labels.push("x"+Number(effect.xmult.toFixed(3))+" Mult"); }
      if (effect.money) { money+=effect.money; earn(s,effect.money); labels.push("+$"+effect.money); }
      if (effect.retriggers) labels.push("Retrigger");
      if (fact.skippedRank) labels.push("Skipped "+(RANKS[fact.skippedRank] || fact.skippedRank));
      if (!labels.length) return;
      if (fact.familiarId) fired.add(fact.familiarId);
      const step = {label,...fact,text:labels.join(" · "),chips,mult};
      Object.defineProperty(step,"fact",{value:{...fact,...effect}});
      steps.push(step);
    }
    if (skippedRank) {
      const ref = s.familiars.find(r=>jokerOf(r) === "Shortcut");
      apply({},item(ref).name,{event:"straight",familiarId:ref,skippedRank,contributors:scored.map(c=>({cardId:c.id}))});
    }
    // DNA's copy is held immediately and can itself trigger held-card effects.
    handEffects.held = s.hand.filter(c=>!ids.includes(c.id));
    handEffects.lowest = handEffects.held.filter(c=>jokerRules.rankOf(c)).reduce((low,c)=>
      !low || c.rank <= low.rank ? c : low,null);
    const ctx = eventContext(s,handEffects);
    function scoreCard(card,cardIndex,isHeld) {
      if (debuffed(s,card)) return;
      const event = isHeld ? "heldCard" : "scoredCard";
      const label = cardLabel(card);
      const enhancement = !isHeld && cardIndex < bossValue(s,"noEnhancements") ? null : card.enhancement;
      if (!isHeld && card.enhancement && !enhancement) suppressed[card.id]="enhancement";
      const suppressRank = !isHeld && enhancement !== "stone" && cardIndex < bossValue(s,"noCardChips");
      if (suppressRank) suppressed[card.id]="rank";
      let repeats = card.seal === "red" ? 1 : 0;
      for (let pass=0;pass<=repeats;pass++) {
        const fact = {cardId:card.id,event,pass};
        if (isHeld) {
          if (enhancement === "steel") apply({xmult:1.5},label,fact);
        } else {
          const luckyMult = enhancement === "lucky" && ctx.chance(5);
          const luckyMoney = enhancement === "lucky" && ctx.chance(15);
          const rank = suppressRank ? 0 : jokerRules.rankChips(card.rank);
          apply({chips:enhancement === "stone" ? 50 : rank + (enhancement === "bonus" ? 30 : 0),
            mult:enhancement === "mult" ? 4 : luckyMult ? 20 : 0,xmult:enhancement === "glass" ? 2 : 1,
            money:Number(card.seal === "gold")*3 + Number(luckyMoney)*20},label,fact);
          const tally = (card.tallyChips || 0) + s.tallyPerPlay;
          if (tally) apply({chips:tally},label,{...fact,event:"tally"});
          if (luckyMult || luckyMoney) dispatch(s,"lucky");
          if (market.editions[card.edition]) apply(market.editions[card.edition],label,fact);
        }
        for (const ref of s.familiars) {
          const effective = !isHeld && enhancement !== card.enhancement ? {...card,enhancement} : card;
          callJoker(s,ref,event,{...ctx,card:effective,cardIndex,pass},(effect,id,owner)=>{
            if (effect.retriggers && !pass) repeats+=effect.retriggers;
            apply(effect,item(id).name,{...fact,familiarId:id,...(owner!==id && {copiedFrom:owner})});
          });
        }
      }
    }
    scored.forEach((card,i)=>scoreCard(card,i,false));
    handEffects.held.forEach((card,i)=>scoreCard(card,i,true));
    for (const ref of s.familiars) {
      if (!activeFamiliar(s,s.familiars.indexOf(ref))) continue;
      const {edition} = market.splitVariant(ref);
      const finish = market.editions[edition];
      const editionFact = {event:"edition",familiarId:ref,pass:0};
      if (finish && edition !== "polychrome") apply(finish,finish.name,editionFact);
      callJoker(s,ref,"hand",ctx,(effect,id,owner)=>apply(effect,item(id).name,
        {event:"hand",familiarId:id,pass:0,...(owner!==id && {copiedFrom:owner})}));
      if (item(ref).rarity === "Uncommon") for (const other of s.familiars) {
        if (jokerOf(resolvedOwner(s,other)) === "Baseball Card")
          apply({xmult:1.5},item(other).name,{event:"hand",familiarId:other,pass:0});
      }
      if (finish && edition === "polychrome") apply(finish,finish.name,editionFact);
    }
    if (s.rules.chipToMult) apply({mult:Math.min(8,Math.floor(chips/s.rules.chipToMult))},DECKS[s.deckId].name);
    if (guard) {
      const before = [chips,mult];
      if (guard.rule === "firstHand" && !s.playedCount) chips *= guard.value;
      if (guard.rule === "slowStart" && s.playedCount < 2) chips = Math.max(0,chips-guard.value);
      if (guard.rule === "halveChips") chips *= guard.value;
      if (guard.rule === "halveMult") mult *= guard.value;
      if (chips !== before[0] || mult !== before[1]) steps.push({label:guard.name,text:guard.description,chips,mult});
    }
    fired.forEach(ref=>countUse(s,ref));
    const broken = scored.filter((c,i)=>!debuffed(s,c) && c.enhancement === "glass" &&
      i >= bossValue(s,"noEnhancements") && ctx.chance(4));
    dispatch(s,"after",handEffects);
    destroyCards(s,broken);
    return {name,level,chips,mult,total:Math.floor(chips*mult),money,scoring:active.map(c=>c.id),suppressed,steps,
      broken:cards.filter(c=>!s.deck.some(card=>card.id===c.id)).map(c=>c.id)};
  }

  function clearBlind(s,result,heldCards) {
    s.stats.roundsWon++;
    familiarUnlocks.roundWon(s,result.name);
    if (s.blind === 2) s.stats.bossesWon++;
    dispatch(s,"roundEnd",{name:result.name,held:heldCards,succeeded:true});
    const mimes = s.familiars.filter(ref=>jokerOf(resolvedOwner(s,ref)) === "Mime").length;
    for (const card of heldCards) {
      if (debuffed(s,card)) continue;
      const triggers = 1 + Number(card.seal === "red") + mimes;
      if (card.enhancement === "gold") earn(s,3 * triggers);
      if (card.seal === "blue") {
        const star = Object.values(content.spells).find(def=>def.effect === "level" && def.value === result.name);
        if (star) for (let i=0;i<triggers;i++) acquire(s,star.id);
      }
    }
    for (const ref of s.familiars) {
      const {sticker} = market.splitVariant(ref);
      if (sticker === "rental") s.money -= 3;
      if (sticker === "perishable") {
        const memory = s.familiarMemory[memoryKey(ref)] ??= {};
        memory.age = (memory.age || 0) + 1;
      }
    }
    dispatch(s,"cashBonus");
    const blind = blindInfo(s).reward;
    const interest = s.rules.noInterest ? 0 : (1+jokerCount(s,"To the Moon")) * Math.min(Math.floor(Math.max(0,s.money) / Math.max(2,5 - power(s,"interestDiscount"))),
      5 + power(s,"interestCap"));
    const bonus = s.earnedBonus;
    s.payout = {blind,hands:s.hands,interest,bonus,total:blind + s.hands + interest + bonus};
    s.phase = "payout";
  }
  function play(s,ids) {
    const used = s.phase === "play" && matching(ids,1,5,s.hand);
    if (!used) return null;
    familiarUnlocks.played(s,used,c=>isFace(s,c) && !debuffed(s,c),
      c=>suitMatch(c,"C",hasJoker(s,"Smeared Joker"),!debuffed(s,c)));
    const result = scoreHand(s,ids);
    s.hands--;
    s.score += result.total;
    s.handCounts[result.name] = (s.handCounts[result.name] || 0) + 1;
    s.seenHands[result.name] = (s.seenHands[result.name] || 0) + 1;
    s.lastType = result.name;
    s.playedCount++;
    s.stats.handsPlayed++;
    if (result.total > s.stats.bestScore) { s.stats.bestScore = result.total; s.stats.bestHand = result.name; }
    if (s.tallyPerPlay) {
      for (const c of used) updateCard(s,c,{tallyChips:(c.tallyChips || 0) + s.tallyPerPlay});
    }
    const held = s.hand.filter(c=>!ids.includes(c.id));
    s.discardPile.push(...used.filter(c=>!result.broken.includes(c.id)));
    s.hand = held;
    s.lastScore = result;
    if (s.score >= s.target) clearBlind(s,result,held);
    else {
      refill(s);
      if (s.hands === 0 || !s.hand.length) {
        const bones = s.familiars.find((ref,i)=>jokerOf(ref) === "Mr. Bones" && activeFamiliar(s,i));
        if (bones && s.score >= s.target / 4) { removeFamiliar(s,bones); clearBlind(s,result,held); }
        else s.phase = "lost";
      }
    }
    if (s.phase === "lost" || (s.phase === "payout" && s.blind === 2 && s.ante === s.rules.anteLimit)) {
      result.finalCards = used.map(({rank,suit,enhancement,edition,seal,tallyChips}) => ({rank,suit,enhancement,edition,seal,tallyChips}));
    }
    return result;
  }
  function discard(s,ids) {
    if (s.phase !== "play" || s.discards === 0) return false;
    const cards = matching(ids,1,5,s.hand);
    if (!cards) return false;
    s.discards -= Math.min(s.discards,!s.discardCount && bossValue(s,"firstDiscard") || 1);
    s.money -= Math.min(Math.max(0,s.money),bossValue(s,"taxDiscard"));
    s.discardCount++;
    s.stats.discardsUsed++;
    const hand = classify(s,cards);
    familiarUnlocks.discarded(s,cards,hand);
    dispatch(s,"discard",{cards,name:hand.name});
    for (const card of cards) if (card.seal === "purple" && !debuffed(s,card)) generate(s,"spell");
    s.discardPile.push(...cards.filter(c=>s.deck.some(card=>card.id === c.id)));
    s.hand = s.hand.filter(c=>!ids.includes(c.id));
    refill(s);
    if (!s.hand.length) s.phase = "lost";
    return true;
  }
  const countNegative = refs => refs.reduce((n,ref)=>n + Number(market.splitVariant(ref).edition === "negative"),0);
  const capacity = s => ({familiars:(s.rules.familiarCap ?? 5) + power(s,"familiarSlots") + countNegative(s.familiars),
    consumables:(s.rules.consumableCap ?? 2) + power(s,"spellSlots") + countNegative(s.consumables)});
  function item(ref) {
    if (!ref) return null;
    const {id,edition,sticker} = market.splitVariant(ref);
    const definition = content.get(id);
    if (definition) {
      if (!edition && !sticker && ref === id) return definition;
      return {...definition,id:ref,baseId:id,edition,sticker,editionName:market.editions[edition]?.name,
        stickerName:market.stickers[sticker]?.name,cost:definition.cost + (market.editions[edition]?.premium || 0)};
    }
    const match = /^card_([SHCD])_(\d+)_(plain|bonus|mult|glass|steel|wild|stone|gold|lucky)(?:_(foil|holographic|polychrome))?(?:_(gold|red|blue|purple))?$/.exec(id);
    if (!match) return null;
    const [,suit,rankText,enhancementKey,cardEdition,seal] = match;
    const rank = Number(rankText);
    const enhancement = enhancementKey === "plain" ? null : enhancementKey;
    const effects = [market.enhancements[enhancement],market.editions[cardEdition],market.seals[seal]].filter(Boolean);
    const face = ({11:"Jack",12:"Queen",13:"King",14:"Ace"})[rank] || String(rank);
    const name = enhancement === "stone" ? "Stone Card" : face + " of " + SUITS[suit];
    return {id,name,kind:"card",cost:3 + effects.length,rank,suit,enhancement,edition:cardEdition,seal,
      rarity:effects.map(x=>x.name).join(" · ") || "Standard",art:"card",icon:SYMBOLS[suit],
      description:effects.map(x=>x.description).join(" ") || "Add this card to your permanent deck."};
  }
  function ownedItem(s,category,index) {
    let def = item(s[category]?.[index]);
    if (category === "familiars" && def) {
      const ref = s.familiars[index];
      const key = def.joker;
      const memory = s.jokerMemory[memoryKey(ref)] || {};
      const target = s.jokerTargets;
      const rank = r => RANKS[r] || r;
      const hints = {
        "The Idol":target && rank(target.idol.rank) + " of " + SUITS[target.idol.suit],
        "Ancient Joker":target && SUITS[target.ancient], "Castle":target && SUITS[target.castle],
        "To Do List":target?.hand, "Mail-In Rebate":target && rank(target.rank),
        "Invisible Joker":Math.min(2,memory.rounds || 0) + "/2 rounds",
        "Loyalty Card":(6-(memory.turn || 0))+" hands to go",
        "Yorick":((memory.discarded || 0)%23)+"/23 cards",
        "Blueprint":resolvedOwner(s,ref) && item(resolvedOwner(s,ref)).name,
        "Brainstorm":resolvedOwner(s,ref) && item(resolvedOwner(s,ref)).name
      };
      const hint = hints[key];
      if (hint) def = {...def,description:def.description+" ("+hint+")"};
      if (memory.bonus != null && memory.bonus > 0 && key !== "Rocket") {
        const stat = ["Runner","Square Joker","Wee Joker","Castle"].includes(key) ? "chips" :
          ["Madness","Hologram","Vampire","Obelisk","Constellation","Glass Joker","Lucky Cat","Campfire","Canio","Hit the Road"].includes(key) ? "xmult" : "mult";
        const amount = stat === "xmult" ? "x"+Number((1+memory.bonus).toFixed(2)) : "+"+memory.bonus;
        def = {...def,stackAmount:amount,stackStat:stat,description:def.description+" ("+amount+" "+(stat==="chips"?"Chips":"Mult")+")"};
      }
      if (s.phase === "play" && bossSilences(s,index)) {
        def = {...def,bossMuted:true,description:"Silenced by " + boss(s).name + ". " + def.description};
      }
    }
    if (def?.sticker !== "perishable") return def;
    const remaining = Math.max(0,5 - (s.familiarMemory[memoryKey(s[category][index])]?.age || 0));
    return {...def,perishRounds:remaining,debuffed:!remaining};
  }
  const catSalePrice = (s,cost) => s.catSale ? Math.max(1,Math.floor(cost / 2)) : cost;
  function price(s,id,includeCatSale = true) {
    const def = item(id);
    if ((def?.rarity === "Constellation" || def?.pool === "star") && hasJoker(s,"Astronomer")) return 0;
    if (def?.sticker === "rental") return 1;
    const discount = (1 - power(s,"discount")) * (s.shopDiscount || 1);
    const cost = Math.max(1,Math.floor((def?.cost || 0) * discount) - (def?.kind === "pack" ? power(s,"packDiscount") : 0));
    return includeCatSale ? catSalePrice(s,cost) : cost;
  }
  function sellPrice(s,ref) {
    const def = item(ref);
    if (def?.sticker === "rental") return 1;
    const free = def?.rarity === "Constellation" && hasJoker(s,"Astronomer");
    const cost = free ? 0 : Math.floor((def?.cost || 0)*(1-power(s,"discount")));
    return Math.max(1,Math.floor(cost/2)) + (s.jokerMemory[memoryKey(ref)]?.sellBonus || 0);
  }
  const rerollPrice = s => (s.freeReroll || chaosReroll(s)) ? 0 : catSalePrice(s,Math.max(1,5 - power(s,"rerollDiscount")) + s.rerolls);
  const chaosReroll = s => s.familiars.find((r,i)=>jokerOf(r) === "Chaos the Clown" && activeFamiliar(s,i) &&
    s.jokerMemory[memoryKey(r)]?.rerollShop !== s.shopsVisited);
  const familiarAvailable = (s,def) => !def.unlock || (s.unlocks?.familiars || initialFamiliars).includes(def.id) ||
    (familiarUnlocks.eligible(s) && s.familiarProgress?.earned[def.joker]);
  function randomFamiliar(s,excluded = [],legendary = false,common = false) {
    if (s.rules.noFamiliars) return null;
    const owned = s.familiars.map(baseId);
    const displayed = [...(s.pack?.choices || []),...(s.offers || [])].filter(Boolean).map(baseId);
    const duplicates = hasJoker(s,"Showman");
    const needs = {"Glass Joker":"glass","Golden Ticket":"gold","Lucky Cat":"lucky","Stone Joker":"stone","Steel Joker":"steel"};
    const pool = Object.values(content.familiars).filter(def=>(def.rarity === "Legendary") === legendary &&
      (!common || def.rarity === "Common") && (!needs[def.joker] || s.deck.some(c=>c.enhancement === needs[def.joker])) &&
      (def.joker !== "Cavendish" || s.bananaExtinct) && (def.joker !== "Gros Michel" || !s.bananaExtinct) &&
      (legendary || familiarAvailable(s,def)) && (duplicates || (!owned.includes(def.id) && !excluded.includes(def.id) && !displayed.includes(def.id))));
    if (!pool.length) return null;
    if (legendary || common) return choose(s,pool).id;
    const roll = random(s);
    const rarity = roll < 0.7 ? "Common" : roll < 0.95 ? "Uncommon" : "Rare";
    const tier = pool.filter(def=>def.rarity === rarity);
    return choose(s,tier.length ? tier : pool).id;
  }
  // A market or paid pack saved under the old unlock table may contain a now-locked familiar.
  function refreshLockedOffers(s) {
    for (const choices of [s.offers, s.pack?.pool === "familiar" ? s.pack.choices : null]) {
      if (!choices) continue;
      choices.forEach((ref, index) => {
        if (!ref) return;
        const {id,edition,sticker} = market.splitVariant(ref);
        if (id === "old_name") {
          choices[index] = choose(s,spellPool(s,"spectral"))?.id || null;
          return;
        }
        const def = content.familiars[id];
        if (!def || (def.rarity !== "Legendary" && familiarAvailable(s,def))) return;
        const replacement = randomFamiliar(s);
        choices[index] = replacement ? market.withVariant(replacement,edition,sticker) : null;
      });
    }
    if (s.pack?.pool === "familiar") {
      s.pack.choices = s.pack.choices.filter(Boolean);
      s.pack.remaining = Math.min(s.pack.remaining,s.pack.choices.length);
      if (!s.pack.remaining) s.pack = null;
    }
  }
  function spellPool(s,pool) {
    if (s.rules.noSpells) return [];
    return Object.values(content.spells).filter(def=>{
      const family = def.effect === "level" ? "star" : def.pool || "spell";
      if (pool !== family || def.id === "old_name") return false;
      if (!hasJoker(s,"Showman") && [...s.consumables,...(s.offers || []),...(s.pack?.choices || [])]
        .some(ref=>ref && baseId(ref) === def.id)) return false;
      return family !== "star" || !HANDS[def.value].secret || Boolean(s.seenHands[def.value]);
    });
  }
  function drawPackHand(s) {
    return shuffle(s,[...s.deck]).slice(0,Math.min(s.deck.length,handSize(s)));
  }
  const marketApi = {hasJoker,random,choose,shuffle,hash,has,power,randomFamiliar,spellPool,item,drawPackHand,
    suits:SUITS,packs:content.packs,vouchers:content.vouchers};
  function stock(s) {
    return market.stock(s,marketApi);
  }
  function enterShop(s) {
    s.phase = "shop";
    s.rerolls = 0;
    s.shopRerolled = false;
    s.pack = null;
    s.shopDiscount = s.nextShopDiscount || 1;
    s.nextShopDiscount = 1;
    // Give the shopkeeper her own roll so seeded stock and draws keep their sequence.
    s.catSale = random({rng:hash(s.seed + ":cat-favor:" + s.shopsVisited)}) < 1 / 40;
    s.shopOfferCount = Math.max(1,2 + power(s,"shopSlots") + (s.rules.shopSlots || 0));
    if (!s.anteVoucher) s.anteVoucher = market.voucherOffer(s,{...marketApi,
      isUnlocked:(_,run,id)=>!run.unlocks?.vouchers || run.unlocks.vouchers.includes(id)});
    const packs = market.packsForShop(s,marketApi);
    s.offers = [];
    s.offers = [...stock(s),...packs,s.voucherSold ? null : s.anteVoucher];
    s.shopsVisited++;
    dispatch(s,"shop");
  }
  function cashOut(s) {
    if (s.phase !== "payout") return false;
    earn(s,s.payout.total);
    s.earnedBonus = 0;
    if (s.ante === s.rules.anteLimit && s.blind === 2) {
      if (!s.victory) familiarUnlocks.won(s);
      s.phase = "won";
      s.victory = true;
    }
    else enterShop(s);
    return true;
  }
  function endless(s) {
    if (s.phase !== "won" || s.challengeId) return false;
    enterShop(s);
    return true;
  }
  function leaveShop(s) {
    if (s.phase !== "shop" || s.pack) return false;
    dispatch(s,"leaveShop");
    s.freeReroll = false;
    s.round++;
    rollTargets(s);
    s.catSale = false;
    advance(s);
    s.offers = [];
    s.phase = "select";
    return true;
  }
  function reroll(s) {
    const cost = rerollPrice(s);
    if (s.phase !== "shop" || s.pack || !affordable(s,cost) || s.rules.noReroll) return false;
    s.money -= cost;
    const free = chaosReroll(s);
    if (s.freeReroll) s.freeReroll--;
    else if (free) memoryOf(s,free).rerollShop = s.shopsVisited;
    else s.rerolls++;
    s.offers.fill(null,0,s.shopOfferCount);
    s.offers.splice(0,s.shopOfferCount,...stock(s));
    const firstShopReroll = !s.shopRerolled;
    s.shopRerolled = true;
    dispatch(s,"reroll",{firstShopReroll});
    return true;
  }
  function space(s,def) {
    const {edition} = market.splitVariant(def.id);
    const extra = Number(edition === "negative");
    if (def.kind === "familiar") return !s.rules.noFamiliars && s.familiars.length < capacity(s).familiars + extra;
    if (def.kind === "spell") return !s.rules.noSpells && s.consumables.length < capacity(s).consumables + extra;
    return true;
  }
  function discoverCard(s,card) {
    if (card.enhancement) discover(s,"enhance_" + card.enhancement);
    if (card.seal) discover(s,"seal_" + card.seal);
    if (card.edition) discover(s,"edition_" + card.edition);
  }
  function addCard(s,card,zone) {
    const copy = {rank:card.rank,suit:card.suit,id:"c" + s.nextId++};
    for (const key of ["enhancement","edition","seal","tallyChips"]) if (card[key]) copy[key] = card[key];
    s.deck.push(copy);
    if (s.phase === "play") {
      if (zone === "hand" || (!zone && s.hand.length < handSize(s))) s.hand.push(copy);
      else if (zone === "deck") s.draw.splice(Math.floor(random(s)*(s.draw.length+1)),0,copy);
      else s.draw.push(copy);
    }
    discoverCard(s,copy);
    familiarUnlocks.deck(s);
    dispatch(s,"cardAdded",{cards:[copy]});
    return copy;
  }
  function acquire(s,ref) {
    let def = item(ref);
    if (!def || !space(s,def)) return false;
    if (def.kind === "familiar" && s.nextEdition && !def.edition) {
      const {sticker} = market.splitVariant(ref);
      ref = market.withVariant(baseId(ref),s.nextEdition,sticker);
      s.nextEdition = s.queuedEditions?.shift() || null;
      def = item(ref);
    }
    if (def.kind === "familiar") {
      s.familiars.push(uniqueRef(s,ref));
      familiarUnlocks.inventory(s);
      if (s.phase === "play" && s.blind === 2 && hasJoker(s,"Chicot")) dispelBoss(s);
    }
    if (def.kind === "spell") s.consumables.push(uniqueRef(s,ref));
    if (def.kind === "card") addCard(s,def);
    if (def.kind !== "card") discover(s,baseId(ref));
    if (def.edition) discover(s,"edition_" + def.edition);
    if (def.sticker) discover(s,"sticker_" + def.sticker);
    return true;
  }
  function generate(s,value,created) {
    const {pool,count = 1} = typeof value === "string" ? {pool:value} : value;
    const ids = [];
    const category = ["legendary","common"].includes(pool) ? "familiars" : "consumables";
    for (let i=0;i<count;i++) {
      if (s[category].length >= capacity(s)[category]) break;
      let ref = pool === "common" ? randomFamiliar(s,[],false,true) : pool === "legendary" ? randomFamiliar(s,[],true) :
        choose(s,spellPool(s,pool).filter(def=>hasJoker(s,"Showman") || !ids.includes(def.id)))?.id;
      if (ref && pool === "common") ref = market.variant(s,ref,"familiar",marketApi,false);
      if (!ref || !acquire(s,ref)) break;
      if (pool === "legendary") familiarUnlocks.award(s,jokerOf(ref));
      ids.push(ref);
      if (created) {
        const index = s[category].length - 1;
        created.push({id:s[category][index],category,index});
      }
    }
    return ids.length > 0;
  }
  function shopItem(s,index) {
    if (s.phase !== "shop" || s.pack || !Number.isInteger(index)) return null;
    const def = item(s.offers[index]);
    return def && affordable(s,price(s,def.id)) ? def : null;
  }
  function canBuy(s,index) {
    const def = shopItem(s,index);
    return Boolean(def && space(s,def));
  }
  function openPack(s,def) {
    s.pack = market.openPack(s,def,marketApi);
    if (!s.pack.remaining) s.pack = null;
    s.stats.packsOpened++;
    discover(s,def.id);
    dispatch(s,"packOpen",{pack:def});
  }
  function claimRewardPack(s) {
    if (s.phase !== "shop" || s.pack || !s.rewardPacks?.length) return false;
    const def = item(s.rewardPacks.shift());
    if (!def) return false;
    openPack(s,def);
    return true;
  }
  function purchase(s,index,def) {
    s.money -= price(s,def.id);
    s.offers[index] = null;
    s.stats.purchases++;
  }
  function buy(s,index) {
    if (!canBuy(s,index)) return false;
    const def = shopItem(s,index);
    purchase(s,index,def);
    if (def.kind === "voucher") {
      s.vouchers.push(def.id);
      discover(s,def.id);
      s.voucherSold = true;
    } else if (def.kind === "pack") openPack(s,def);
    else acquire(s,def.id);
    dispatch(s,"buy",{item:def});
    return true;
  }
  function canBuyAndUse(s,index,ids) {
    const def = shopItem(s,index);
    return Boolean(market.canDirectUse(def) && canCast(s,def,ids || [],[]));
  }
  function buyAndUse(s,index,ids = []) {
    if (!canBuyAndUse(s,index,ids)) return false;
    const def = shopItem(s,index);
    purchase(s,index,def);
    cast(s,def,ids,[]);
    dispatch(s,"buy",{item:def});
    return true;
  }
  function canPick(s,index,ids) {
    if (s.phase !== "shop" || !s.pack || !Number.isInteger(index)) return false;
    const def = item(s.pack.choices[index]);
    if (!def) return false;
    if (def.kind !== "spell") return space(s,def);
    const hand = s.pack.hand || [];
    if (ids === undefined && def.minTargets) return hand.filter(card=>canTarget(def,card)).length >= def.minTargets &&
      (def.effect !== "remove" || s.deck.length > def.minTargets);
    return canCast(s,def,ids || [],hand);
  }
  function pick(s,index,ids = []) {
    if (!canPick(s,index,ids)) return false;
    const def = item(s.pack.choices[index]);
    if (def.kind === "spell") cast(s,def,ids,s.pack.hand || []);
    else acquire(s,def.id);
    s.pack.choices.splice(index,1);
    if (!--s.pack.remaining) s.pack = null;
    return true;
  }
  function closePack(s) {
    if (s.phase !== "shop" || !s.pack) return false;
    dispatch(s,"packSkip");
    s.pack = null;
    return true;
  }
  const inventoryOpen = s => s.phase === "play" || s.phase === "shop";
  function canSell(s,category,index) {
    const betweenBlinds = category === "familiars" && ["select","payout"].includes(s.phase);
    if ((!inventoryOpen(s) && !betweenBlinds) || !["familiars","consumables"].includes(category) || !Number.isInteger(index)) return false;
    const ref = s[category][index];
    return Boolean(ref) && market.splitVariant(ref).sticker !== "eternal";
  }
  function sellFrom(s,index,category) {
    if (!canSell(s,category,index)) return false;
    const id = s[category][index];
    const value = sellPrice(s,id);
    const owner = category === "familiars" && resolvedOwner(s,id);
    const ctx = eventContext(s,{soldMemory:owner && memoryOf(s,owner)});
    s[category].splice(index,1);
    if (familiarUnlocks.eligible(s)) {
      const progress = familiarUnlocks.state(s);
      progress.cardsSold++;
      if (category === "familiars") progress.familiarsSold++;
    }
    earn(s,value);
    delete s.jokerMemory[memoryKey(id)];
    delete s.familiarMemory[memoryKey(id)];
    if (owner) callJoker(s,id,"sold",ctx,()=>{},owner);
    dispatch(s,"sell",{item:item(id)});
    return true;
  }
  const sell = (s,index) => sellFrom(s,index,"familiars");
  const sellConsumable = (s,index) => sellFrom(s,index,"consumables");
  function reorder(s,from,to) {
    if ((!inventoryOpen(s) && s.phase !== "select") || !Number.isInteger(from) || !Number.isInteger(to) ||
        from < 0 || to < 0 || from >= s.familiars.length || to >= s.familiars.length) return false;
    s.familiars.splice(to,0,s.familiars.splice(from,1)[0]);
    return true;
  }
  function editionCandidates(s,{kind,edition},excluded) {
    const refs = kind === "familiar" ? s.familiars : s.consumables;
    return refs.map((ref,index)=>({index,...market.splitVariant(ref)}))
      .filter(data=>data.index !== excluded && !data.edition && market.editions[edition]?.kinds.includes(kind));
  }
  function inventoryEdition(s,value) {
    const target = choose(s,editionCandidates(s,value));
    if (!target) return false;
    const refs = value.kind === "familiar" ? s.familiars : s.consumables;
    const instance = String(refs[target.index]).split("~")[3];
    refs[target.index] = instance ? [target.id,value.edition,target.sticker || "",instance].join("~") :
      market.withVariant(target.id,value.edition,target.sticker);
    familiarUnlocks.inventory(s);
    discover(s,"edition_" + value.edition);
    return refs[target.index];
  }
  function canTarget(def,card) {
    return card.enhancement !== "stone" || !["rankCopy","suitCopy","rank","suit"].includes(def.effect);
  }
  function canCast(s,def,ids,source,excluded) {
    if (def.minTargets) {
      const targets = matching(ids,def.minTargets,def.maxTargets,source);
      if (!targets || !targets.every(card=>canTarget(def,card))) return false;
    }
    if (def.effect === "inventoryEdition") return Boolean(editionCandidates(s,def.value,excluded).length);
    if (def.effect === "remove") return ids.length < (s.phase === "play" ? s.hand.length + s.draw.length : s.deck.length);
    if (def.effect === "generate" && def.value.pool === "legendary") {
      return !s.rules.noFamiliars && s.familiars.length < capacity(s).familiars &&
        Object.values(content.familiars).some(f=>f.rarity === "Legendary" && (hasJoker(s,"Showman") || !s.familiars.some(ref=>baseId(ref) === f.id)));
    }
    return true;
  }
  function updateCard(s,card,updates,checkDeck = true) {
    for (const zone of [s.deck,s.hand,s.draw,s.discardPile,s.pack?.hand || []]) {
      const ref = zone.find(c=>c.id === card.id);
      if (!ref) continue;
      for (const [key,value] of Object.entries(updates)) {
        if (value == null) delete ref[key];
        else ref[key] = value;
      }
    }
    discoverCard(s,card);
    if (checkDeck) familiarUnlocks.deck(s);
  }
  function cast(s,def,ids,source) {
    const value = def.value;
    const targets = def.minTargets ? matching(ids,def.minTargets,def.maxTargets,source) : [];
    discover(s,baseId(def.id));
    if (def.edition) discover(s,"edition_" + def.edition);
    countUse(s,def.id);
    s.stats.spellsCast++;
    if (def.rarity === "Spell") s.tarotsUsed = (s.tarotsUsed || 0) + 1;
    if (def.rarity === "Constellation") {
      const uses = s.planetUses ??= {};
      uses[baseId(def.id)] = (uses[baseId(def.id)] || 0) + 1;
    }
    switch (def.effect) {
      case "money": earn(s,Math.max(0,Math.min(s.money,value))); break;
      case "cash": earn(s,value); break;
      case "tally": s.tallyPerPlay += value; break;
      case "level": s.levels[value]++; break;
      case "levelMost": s.levels[mostPlayed(s)] += value; break;
      case "levelMany": value.hands.forEach(hand=>{ s.levels[hand] += value.amount; }); break;
      case "generate": generate(s,value); break;
      case "inventoryEdition": inventoryEdition(s,value); break;
      case "bossDisable":
        if (boss(s) && s.phase === "play") dispelBoss(s);
        else s.bossWard = (s.bossWard || 0) + value;
        if (s.blind === 2) s.target = blindInfo(s).target;
        break;
      case "remove":
        destroyCards(s,targets);
        if (s.phase === "play") refill(s);
        break;
      case "copy": for (let i=0;i<value;i++) addCard(s,targets[0]); break;
      case "rankCopy":
      case "suitCopy": {
        const key = def.effect === "rankCopy" ? "rank" : "suit";
        for (const card of targets.slice(1)) updateCard(s,card,{[key]:targets[0][key]});
        break;
      }
      case "swapModifiers": {
        const [a,b] = targets.map(card=>({enhancement:card.enhancement,edition:card.edition,seal:card.seal}));
        updateCard(s,targets[0],b,false);
        updateCard(s,targets[1],a);
        break;
      }
      default:
        for (const c of targets) {
          if (def.effect === "enhance") updateCard(s,c,{enhancement:value});
          if (def.effect === "suit") updateCard(s,c,{suit:value});
          if (def.effect === "rank") updateCard(s,c,{rank:(c.rank - 2 + value + 13) % 13 + 2});
          if (def.effect === "seal") updateCard(s,c,{seal:value});
          if (def.effect === "edition") updateCard(s,c,{edition:value});
          if (def.effect === "modify") updateCard(s,c,value);
        }
    }
    dispatch(s,"cast",{item:def});
  }
  const useHand = s => s.pack?.hand || (s.phase === "play" ? s.hand : []);
  function canUse(s,index,ids) {
    if (!inventoryOpen(s) || !Number.isInteger(index)) return false;
    const def = item(s.consumables[index]);
    if (!def) return false;
    const source = useHand(s);
    if (ids === undefined && def.minTargets) return source.filter(card=>canTarget(def,card)).length >= def.minTargets &&
      (def.effect !== "remove" || s.deck.length > def.minTargets);
    return canCast(s,def,ids || [],source,def.effect === "inventoryEdition" && def.value.kind === "spell" ? index : undefined);
  }
  function use(s,index,ids = []) {
    if (!canUse(s,index,ids)) return false;
    const def = item(s.consumables[index]);
    const [spent] = s.consumables.splice(index,1);
    delete s.jokerMemory[memoryKey(spent)];
    cast(s,def,ids,useHand(s));
    return true;
  }

  const api = {HANDS,DECKS,STAKES,CHALLENGES,SUITS,BOSSES,TAGS,startingFamiliars,newRun,restore,blindInfo,handSize,startBlind,skipBlind,debuffed,
    evaluate,preview,play,discard,cashOut,endless,leaveShop,item,ownedItem,price,sellPrice,rerollPrice,reroll,drainFamiliarEvents,
    capacity,funds,affordable,canBuy,buy,canBuyAndUse,buyAndUse,canPick,pick,closePack,claimRewardPack,canSell,sell,sellConsumable,reorder,
    canTarget,canUse,use,canRerollBoss,rerollBoss,bossRerollPrice,canDisableBoss,disableBoss};
  root.CW = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
