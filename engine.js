// Card Wizard — deterministic, serializable run rules. UI selections live outside the run.
(function (root) {
  "use strict";
  const content = root.CWContent || (typeof require === "function" && require("./content.js"));
  const catalog = root.CWCatalog || (typeof require === "function" && require("./catalog.js"));
  const market = root.CWMarket || (typeof require === "function" && require("./market.js"));
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
    s.tags = shuffle(s, Object.keys(TAGS)).slice(0, 2);
    s.anteVoucher = null;
    s.voucherSold = false;
  }
  function blindInfo(s, index = s.blind) {
    const guard = BOSSES[s.bossId];
    const base = s.ante <= 8 ? BASE_TARGETS[s.ante - 1] : Math.round(50000 * Math.pow(1.9, s.ante - 8));
    const kind = ["Small Blind","Big Blind","Boss Blind"][index];
    return {
      name: index === 2 ? guard.name : kind, kind,
      description: index === 2 ? (s.bossDisabled ? "Boss rule dispelled." : guard.description) : "Beat the target before you run out of hands.",
      target: Math.floor(base * (stake(s).targetScale || 1) * (s.rules.targetScale || 1) *
        [1, 1.5, !s.bossDisabled && guard.scale || 2][index]),
      reward: Math.max(0,[3,4,5][index] - (index === 0 ? stake(s).rewardReduction || 0 : 0)),
      tag: index < 2 ? (TAGS[s.tags[index]]?.description || TAGS[s.tags[index]]) : null
    };
  }
  function handSize(s) {
    return Math.max(2,s.rules.handSize + power(s,"handSize") + s.blindMods.handSize -
      Number(boss(s) && s.bossId === "moon") - bossValue(s,"reduceHand"));
  }
  function refill(s) {
    while (s.hand.length < handSize(s) && s.draw.length) s.hand.push(s.draw.pop());
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
    const s = {
      version:1, seed:token, deckId, stakeId, challengeId, rng:hash(token), rules, unlocks:unlocked,
      phase:"select", ante:1, blind:0, round:1, bossId:null, tags:[], regularBosses:[], finalBosses:[],
      runId:unique, seeded:Boolean(explicitSeed), victory:false,
      money:rules.money, earnedBonus:0, freeReroll:false, rerolls:0, shopsVisited:0, shopOfferCount:2,
      deck:[], hand:[], draw:[], discardPile:[], nextId:1, familiars:[...rules.starter],
      consumables:[...(rules.startingConsumables || [])], vouchers:[...(rules.startingVouchers || [])],
      levels:{...Object.fromEntries(Object.keys(HANDS).map(name=>[name,1])),...rules.handLevels},
      seenHands:{}, offers:[], pack:null, lastScore:null, payout:null,
      familiarMemory:{}, nextBlind:{}, blindMods:{hands:0,discards:0,handSize:0},
      discovered:["deck_" + deckId,"stake_" + stakeId,...rules.starter,...(rules.startingConsumables || []),...(rules.startingVouchers || [])],
      stats:{handsPlayed:0,discardsUsed:0,bestHand:"",bestScore:0,roundsWon:0,skipped:0,
        moneyEarned:0,purchases:0,packsOpened:0,bossesWon:0,spellsCast:0}
    };
    const composition = rules.composition || Object.keys(SUITS).flatMap(suit =>
      Array.from({length:13},(_,i)=>({suit,rank:i + 2})));
    for (const {copies = 1,...card} of composition) {
      for (let i = 0; i < copies; i++) s.deck.push({id:"c" + s.nextId++,...card});
    }
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
    s.rules = {...DEFAULT_RULES,...DECKS[s.deckId],...CHALLENGES[s.challengeId]?.rules,...s.rules};
    s.stakeId = STAKES[s.stakeId] ? s.stakeId : BASE_STAKE;
    s.regularBosses ??= [];
    s.finalBosses ??= [];
    s.blindMods ??= {hands:0,discards:0,handSize:0};
    s.nextBlind ??= {};
    s.familiarMemory ??= {};
    s.discovered ??= [s.deckId,...s.familiars,...s.consumables,...s.vouchers];
    s.runId ??= "legacy-" + s.seed;
    s.seeded ??= false;
    s.victory ??= s.phase === "won" || s.ante > 8;
    s.bossRerollsUsed ??= 0;
    s.shopsVisited ??= s.phase === "shop" ? 1 : Math.max(0,s.round - 1);
    s.shopOfferCount ??= s.phase === "shop" ? 3 : 2;
    s.stats = {moneyEarned:0,purchases:0,packsOpened:0,bossesWon:0,spellsCast:0,...s.stats};
    if (s.pack && !s.pack.hand && ["spell","spectral"].includes(s.pack.pool)) s.pack.hand = drawPackHand(s);
    return s;
  }
  function startBlind(s) {
    if (s.phase !== "select") return false;
    s.phase = "play";
    s.target = blindInfo(s).target;
    s.score = 0;
    s.blindMods = {hands:0,discards:0,handSize:0,...s.nextBlind};
    s.nextBlind = {};
    s.hands = Math.max(1,s.rules.hands + power(s,"hands") + s.blindMods.hands - bossValue(s,"reduceHands"));
    s.discards = boss(s) && s.bossId === "famine" ? 0 :
      Math.max(0,s.rules.discards + (stake(s).discards || 0) + power(s,"discards") + s.blindMods.discards);
    s.handCounts = {};
    s.lastType = "";
    s.playedCount = 0;
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
    refill(s);
    if (s.blind === 2) discover(s,"boss_" + s.bossId);
    dispatch(s,"blindStart");
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
    discover(s,"tag_" + tag);
    if (tag === "coins") earn(s,7);
    if (tag === "fortune") earn(s,4 + s.discards);
    if (tag === "doubled") s.earnedBonus += 8;
    if (tag === "reroll") s.freeReroll = true;
    if (tag === "stars") {
      s.levels[mostPlayed(s)]++;
    }
    const {effect,value} = TAGS[tag] || {};
    if (effect === "cash") earn(s,value);
    if (effect === "bonus") s.earnedBonus += value;
    if (effect === "freeReroll") s.freeReroll = true;
    if (effect === "handLevel") s.levels[value.hand === "mostPlayed" ? mostPlayed(s) : value.hand] += value.levels;
    if (effect === "nextHands") s.nextBlind.hands = (s.nextBlind.hands || 0) + value;
    if (effect === "nextDiscards") s.nextBlind.discards = (s.nextBlind.discards || 0) + value;
    if (effect === "nextHandSize") s.nextBlind.handSize = (s.nextBlind.handSize || 0) + value;
    if (effect === "bossReroll") s.freeBossRerolls = (s.freeBossRerolls || 0) + 1;
    if (effect === "pack") (s.rewardPacks ??= []).push(value);
    if (effect === "edition" && !inventoryEdition(s,{kind:"familiar",edition:value})) s.nextEdition = value;
    if (effect === "shopDiscount") s.nextShopDiscount = Math.min(s.nextShopDiscount || 1,value);
    s.stats.skipped++;
    advance(s);
    return true;
  }
  const mostPlayed = s => Object.keys(HANDS).reduce((a,b) => (s.seenHands[b] || 0) > (s.seenHands[a] || 0) ? b : a);
  const bossRerollPrice = s => s.freeBossRerolls ? 0 : 10;
  const canRerollBoss = s => s.phase === "select" && s.blind === 2 && !s.bossDisabled &&
    (s.freeBossRerolls || s.bossRerollsUsed < power(s,"bossRerolls")) && s.money >= bossRerollPrice(s);
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
    (s.bossWard || (s.bossDisablesUsed || 0) < power(s,"bossDisables")) && s.money >= bossDisablePrice(s);
  function disableBoss(s) {
    if (!canDisableBoss(s)) return false;
    s.money -= bossDisablePrice(s);
    if (s.bossWard) s.bossWard--;
    else s.bossDisablesUsed = (s.bossDisablesUsed || 0) + 1;
    s.bossDisabled = true;
    s.target = blindInfo(s).target;
    return true;
  }
  function matching(ids, min, max, source) {
    if (!Array.isArray(ids) || ids.length < min || ids.length > max || new Set(ids).size !== ids.length) return null;
    const cards = ids.map(id => source.find(c=>c.id === id));
    return cards.every(Boolean) ? cards : null;
  }
  function evaluate(cards) {
    const stones = cards.filter(c=>c.enhancement === "stone");
    const ranked = cards.filter(c=>c.enhancement !== "stone");
    if (!ranked.length) return {name:"High Card",scoring:stones,suited:ranked};
    const ranks = new Map();
    for (const c of ranked) {
      if (!ranks.has(c.rank)) ranks.set(c.rank, []);
      ranks.get(c.rank).push(c);
    }
    const groups = [...ranks.values()].sort((a,b)=>b.length-a.length || b[0].rank-a[0].rank);
    const values = [...ranks.keys()].sort((a,b)=>a-b);
    const flushSuit = Object.keys(SUITS).find(suit => ranked.every(c=>c.suit === suit || c.enhancement === "wild"));
    const flush = ranked.length === 5 && Boolean(flushSuit);
    const straight = values.length === 5 && (values[4] - values[0] === 4 || (values[0] === 2 && values[3] === 5 && values[4] === 14));
    const many = groups[0].length;
    const second = groups[1]?.length || 0;
    let name, scoring;
    if (many === 5) name = flush ? "Flush Five" : "Five of a Kind";
    else if (many === 3 && second === 2) name = flush ? "Flush House" : "Full House";
    else if (flush && straight) name = "Straight Flush";
    else if (many === 4) { name = "Four of a Kind"; scoring = groups[0]; }
    else if (flush) name = "Flush";
    else if (straight) name = "Straight";
    else if (many === 3) { name = "Three of a Kind"; scoring = groups[0]; }
    else if (many === 2 && second === 2) { name = "Two Pair"; scoring = [...groups[0], ...groups[1]]; }
    else if (many === 2) { name = "Pair"; scoring = groups[0]; }
    else { name = "High Card"; scoring = groups[0]; }
    return {name,scoring:scoring ? cards.filter(c=>scoring.includes(c) || stones.includes(c)) : cards,flushSuit:flush ? flushSuit : null};
  }
  function debuffed(s, card) {
    const guard = boss(s);
    if (!guard || !card || card.enhancement === "stone") return false;
    return (guard.suit && (guard.suit === card.suit || card.enhancement === "wild")) ||
      (s.bossId === "veil" && card.rank >= 11 && card.rank <= 13);
  }
  const baseId = id => market.splitVariant(id).id;
  function earn(s,amount) {
    s.money += amount;
    s.stats.moneyEarned += Math.max(0,amount);
  }
  function countUse(s,id) {
    const uses = s.stats.itemUses ??= {};
    const key = baseId(id);
    uses[key] = (uses[key] || 0) + 1;
  }
  const contextCard = card => card.enhancement === "stone" ? {...card,rank:undefined,suit:undefined} : card;
  function makeContext(s,extra = {}) {
    const context = {name:s.lastType,level:s.levels[s.lastType] || 1,cards:[],scoring:[],held:s.hand,
      ante:s.ante,blind:s.blind,round:s.round,money:s.money,handsLeft:s.hands,discardsLeft:s.discards,
      playedCount:s.playedCount || 0,handCounts:s.handCounts || {},discardCount:s.discardCount || 0,
      totalDiscards:s.stats.discardsUsed,totalHands:s.stats.handsPlayed,deckSize:s.deck.length,
      ownedCount:s.familiars.length,familiarOrder:s.familiars.map(baseId),consumableCount:s.consumables.length,
      random:()=>random(s),...extra};
    for (const group of ["cards","scoring","held"]) context[group] = context[group].map(contextCard);
    return context;
  }
  function familiarEffect(s,index,event,ctx,memory,resolveCopy = true) {
    const id = s.familiars[index];
    if (!id || index < bossValue(s,"noJokers") || s.rules.noFamiliarEffects) return {};
    const {id:key,sticker} = market.splitVariant(id);
    const data = memory[key] ??= {};
    if (sticker === "perishable" && (data.age || 0) >= 5) return {};
    const effect = content.trigger(key,event,ctx,data);
    if (resolveCopy && effect.copy) {
      const offset = effect.copy === "previous" ? -1 : 1;
      return familiarEffect(s,index + offset,event,ctx,JSON.parse(JSON.stringify(memory)),false);
    }
    return effect;
  }
  function applyReward(s,effect) {
    if (effect.money) earn(s,effect.money);
    if (effect.generate) generate(s,effect.generate);
  }
  function dispatch(s,event,extra) {
    const ctx = makeContext(s,extra);
    for (let i=0;i<s.familiars.length;i++) {
      const id = s.familiars[i];
      const effect = familiarEffect(s,i,event,ctx,s.familiarMemory);
      if (effect.money || effect.generate) countUse(s,id);
      applyReward(s,effect);
      ctx.money = s.money;
    }
  }
  function preview(s,ids) {
    if (s.phase !== "play") return null;
    const cards = matching(ids,1,5,s.hand);
    if (!cards) return null;
    const {name,scoring,flushSuit} = evaluate(cards);
    const base = HANDS[name], level = s.levels[name];
    const guard = boss(s);
    const previous = s.handCounts[name] || 0;
    const blocked = guard && ((s.bossId === "lock" && cards.length !== 5) ||
      (s.bossId === "mirror" && s.lastType === name) ||
      (guard.rule === "capCards" && cards.length > guard.value) ||
      (guard.rule === "minCards" && cards.length < guard.value) ||
      (guard.rule === "uniqueHands" && previous >= guard.value));
    if (blocked) return {name,level,chips:0,mult:0,total:0,money:0,scoring:[],blocked:true,
      steps:[{label:guard.name,text:guard.description}]};

    let chips = base.chips + (level - 1) * base.chipStep;
    let mult = base.mult + (level - 1) * base.multStep;
    let money = 0;
    const steps = [{label:name,text:chips + " chips x " + mult,chips,mult}];
    const memory = JSON.parse(JSON.stringify(s.familiarMemory));
    const roll = {rng:s.rng};
    const generated = [];
    const used = new Set();
    const active = scoring.filter(c=>!debuffed(s,c));
    const held = s.hand.filter(c=>!ids.includes(c.id) && !debuffed(s,c));
    const ctx = makeContext(s,{name,level,flushSuit,cards,scoring:active,held,handsLeft:s.hands - 1,totalHands:s.stats.handsPlayed + 1,
      playedCount:s.playedCount + 1,handCounts:{...s.handCounts,[name]:previous + 1},random:()=>random(roll)});
    function apply(effect,label,source = {}) {
      const labels = [];
      if (effect.chips) { chips += effect.chips; labels.push("+" + effect.chips + " chips"); }
      if (effect.mult) { mult += effect.mult; labels.push("+" + effect.mult + " Mult"); }
      if (effect.xmult != null && effect.xmult !== 1) { mult *= effect.xmult; labels.push("x" + +effect.xmult.toFixed(3) + " Mult"); }
      if (effect.money) { money += effect.money; ctx.money += effect.money; labels.push("+$" + effect.money); }
      if (effect.generate) { generated.push(effect.generate); labels.push("Create a card"); }
      if (effect.retriggers) labels.push("Retrigger");
      if (labels.length) {
        if (source.familiarId) used.add(source.familiarId);
        steps.push({label,text:labels.join(" · "),...source,chips,mult});
      }
    }
    function familiarAt(i,event,extra) {
      const id = s.familiars[i];
      const effect = familiarEffect(s,i,event,{...ctx,...extra},memory);
      apply(effect,content.familiars[baseId(id)].name,{familiarId:id,...(extra.card && {cardId:extra.card.id})});
      return effect.retriggers || 0;
    }
    function scoreCard(card,cardIndex,isHeld) {
      const event = isHeld ? "heldCard" : "scoredCard";
      const enhancement = !isHeld && cardIndex < bossValue(s,"noEnhancements") ? null : card.enhancement;
      const label = cardLabel(card);
      let repeats = card.seal === "red" ? 1 : 0;
      for (let pass=0;pass<=repeats;pass++) {
        if (isHeld) {
          if (enhancement === "steel") apply({xmult:1.5},label,{cardId:card.id});
        } else {
          const rank = cardIndex < bossValue(s,"noCardChips") ? 0 : card.rank === 14 ? 11 : Math.min(10,card.rank);
          const lucky = enhancement === "lucky";
          const luckyMult = lucky && random(roll) < 0.2;
          const luckyMoney = lucky && random(roll) < 0.12;
          apply({chips:enhancement === "stone" ? 40 : rank + (enhancement === "bonus" ? 30 : 0),
            mult:enhancement === "mult" ? 4 : luckyMult ? 12 : 0,
            xmult:enhancement === "glass" ? 2 : 1,money:Number(card.seal === "gold") * 3 + Number(luckyMoney) * 8},
          pass ? "Retrigger · " + label : label,{cardId:card.id});
          const edition = market.editions[card.edition];
          if (edition) apply(edition,edition.name,{cardId:card.id});
        }
        for (let i=0;i<s.familiars.length;i++) {
          const effective = contextCard(card);
          const more = familiarAt(i,event,{card:effective.enhancement === enhancement ? effective : {...effective,enhancement},
            cardIndex,retrigger:pass > 0});
          if (!pass) repeats = Math.min(8,repeats + more);
        }
      }
    }
    active.forEach((card,i)=>scoreCard(card,i,false));
    held.forEach((card,i)=>scoreCard(card,i,true));
    for (let i=0;i<s.familiars.length;i++) {
      const id = s.familiars[i];
      const {edition,sticker} = market.splitVariant(id);
      const editionDef = market.editions[edition];
      const live = i >= bossValue(s,"noJokers") && !s.rules.noFamiliarEffects &&
        (sticker !== "perishable" || (memory[baseId(id)]?.age || 0) < 5);
      if (live && editionDef && edition !== "polychrome") apply(editionDef,editionDef.name,{familiarId:id});
      familiarAt(i,"hand",{});
      if (live && editionDef && edition === "polychrome") apply(editionDef,editionDef.name,{familiarId:id});
    }
    if (s.rules.chipToMult) {
      apply({mult:Math.min(8,Math.floor(chips / s.rules.chipToMult))},DECKS[s.deckId].name);
    }
    if (guard) {
      const before = [chips,mult];
      if (guard.rule === "firstHand" && !s.playedCount) chips *= guard.value;
      if (guard.rule === "slowStart" && s.playedCount < 2) chips = Math.max(0,chips - guard.value);
      if (guard.rule === "halveChips") chips *= guard.value;
      if (guard.rule === "halveMult") mult *= guard.value;
      if (chips !== before[0] || mult !== before[1]) steps.push({label:guard.name,text:guard.description,chips,mult});
    }
    const score = {name,level,chips,mult,total:Math.floor(chips * mult),money,scoring:active.map(c=>c.id),steps};
    Object.defineProperty(score,"commit",{value:{memory,rng:roll.rng,generated,used}});
    return score;
  }

  function clearBlind(s,result,heldCards) {
    s.stats.roundsWon++;
    if (s.blind === 2) s.stats.bossesWon++;
    dispatch(s,"roundEnd",{name:result.name,held:heldCards,succeeded:true});
    for (const card of heldCards) {
      if (debuffed(s,card)) continue;
      if (card.enhancement === "gold") earn(s,card.seal === "red" ? 4 : 2);
      if (card.seal === "blue") {
        const star = Object.values(content.spells).find(def=>def.effect === "level" && def.value === result.name);
        if (star) acquire(s,star.id);
      }
    }
    for (const ref of s.familiars) {
      const {id,sticker} = market.splitVariant(ref);
      if (sticker === "rental") s.money = Math.max(0,s.money - 3);
      if (sticker === "perishable") {
        const memory = s.familiarMemory[id] ??= {};
        memory.age = (memory.age || 0) + 1;
      }
    }
    const blind = blindInfo(s).reward;
    const interest = s.rules.noInterest ? 0 : Math.min(Math.floor(s.money / Math.max(2,5 - power(s,"interestDiscount"))),
      5 + power(s,"interestCap"));
    const bonus = s.earnedBonus;
    s.payout = {blind,hands:s.hands,interest,bonus,total:blind + s.hands + interest + bonus};
    s.phase = "payout";
  }
  function play(s,ids) {
    const result = preview(s,ids);
    if (!result) return null;
    const {commit} = result;
    if (commit) {
      s.familiarMemory = commit.memory;
      s.rng = commit.rng;
      commit.used.forEach(id=>countUse(s,id));
      commit.generated.forEach(effect=>generate(s,effect));
    }
    s.hands--;
    s.score += result.total;
    earn(s,result.money);
    s.handCounts[result.name] = (s.handCounts[result.name] || 0) + 1;
    s.seenHands[result.name] = (s.seenHands[result.name] || 0) + 1;
    s.lastType = result.name;
    s.playedCount++;
    s.stats.handsPlayed++;
    if (result.total > s.stats.bestScore) { s.stats.bestScore = result.total; s.stats.bestHand = result.name; }
    const used = s.hand.filter(c=>ids.includes(c.id));
    const enchantedScorers = result.scoring.slice(bossValue(s,"noEnhancements"));
    result.broken = used.filter(c=>c.enhancement === "glass" && enchantedScorers.includes(c.id) && random(s) < 0.25).map(c=>c.id);
    s.deck = s.deck.filter(c=>!result.broken.includes(c.id));
    s.discardPile.push(...used.filter(c=>!result.broken.includes(c.id)));
    s.hand = s.hand.filter(c=>!ids.includes(c.id));
    s.lastScore = result;
    if (s.score >= s.target) clearBlind(s,result,s.hand);
    else {
      refill(s);
      if (s.hands === 0 || !s.hand.length) s.phase = "lost";
    }
    return result;
  }
  function discard(s,ids) {
    if (s.phase !== "play" || s.discards === 0) return false;
    const cards = matching(ids,1,5,s.hand);
    if (!cards) return false;
    s.discards -= Math.min(s.discards,!s.discardCount && bossValue(s,"firstDiscard") || 1);
    s.money = Math.max(0,s.money - bossValue(s,"taxDiscard"));
    s.discardCount++;
    s.stats.discardsUsed++;
    dispatch(s,"discard",{cards});
    for (const card of cards) if (card.seal === "purple" && !debuffed(s,card)) generate(s,"spell");
    s.discardPile.push(...cards);
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
      if (!edition && !sticker) return definition;
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
    return {id,name:face + " of " + SUITS[suit],kind:"card",cost:3 + effects.length,rank,suit,enhancement,edition:cardEdition,seal,
      rarity:effects.map(x=>x.name).join(" · ") || "Standard",art:"card",icon:SYMBOLS[suit],
      description:effects.map(x=>x.description).join(" ") || "Add this card to your permanent deck."};
  }
  function ownedItem(s,category,index) {
    const def = item(s[category]?.[index]);
    if (def?.sticker !== "perishable") return def;
    const remaining = Math.max(0,5 - (s.familiarMemory[baseId(def.id)]?.age || 0));
    return {...def,perishRounds:remaining,debuffed:!remaining};
  }
  function price(s,id) {
    const def = item(id);
    const discount = (1 - power(s,"discount")) * (s.shopDiscount || 1);
    return Math.max(1,Math.floor((def?.cost || 0) * discount) - (def?.kind === "pack" ? power(s,"packDiscount") : 0));
  }
  const sellPrice = (s,id) => Math.max(1,Math.floor((item(id)?.cost || 0)/2));
  const rerollPrice = s => s.freeReroll ? 0 : Math.max(1,5 - power(s,"rerollDiscount")) + s.rerolls;
  const unlocked = (s,group,id,def) => !def.unlock || !s.unlocks?.[group] || s.unlocks[group].includes(id);
  function randomFamiliar(s,excluded = [],legendary = false) {
    if (s.rules.noFamiliars) return null;
    const owned = s.familiars.map(baseId);
    const pool = Object.values(content.familiars).filter(def=>(def.rarity === "Legendary") === legendary &&
      unlocked(s,"familiars",def.id,def) && !owned.includes(def.id) && !excluded.includes(def.id));
    if (!pool.length) return null;
    if (legendary) return choose(s,pool).id;
    const roll = random(s);
    const rarity = roll < 0.58 ? "Common" : roll < 0.89 ? "Uncommon" : "Rare";
    const tier = pool.filter(def=>def.rarity === rarity);
    return choose(s,tier.length ? tier : pool).id;
  }
  function spellPool(s,pool) {
    if (s.rules.noSpells) return [];
    return Object.values(content.spells).filter(def=>{
      const family = def.effect === "level" ? "star" : def.pool || "spell";
      if (pool !== family) return false;
      return family !== "star" || !HANDS[def.value].secret || Boolean(s.seenHands[def.value]);
    });
  }
  function drawPackHand(s) {
    return shuffle(s,[...s.deck]).slice(0,Math.min(s.deck.length,handSize(s)));
  }
  const marketApi = {random,choose,shuffle,hash,has,power,randomFamiliar,spellPool,item,drawPackHand,
    suits:SUITS,packs:content.packs,vouchers:content.vouchers};
  function stock(s) {
    return market.stock(s,marketApi);
  }
  function enterShop(s) {
    s.phase = "shop";
    s.rerolls = 0;
    s.pack = null;
    s.shopDiscount = s.nextShopDiscount || 1;
    s.nextShopDiscount = 1;
    s.shopOfferCount = Math.max(1,2 + power(s,"shopSlots") + (s.rules.shopSlots || 0));
    if (!s.anteVoucher) s.anteVoucher = market.voucherOffer(s,{...marketApi,
      isUnlocked:(_,run,id)=>!run.unlocks?.vouchers || run.unlocks.vouchers.includes(id)});
    const packs = market.packsForShop(s,marketApi);
    s.offers = [...stock(s),...packs,s.voucherSold ? null : s.anteVoucher];
    s.shopsVisited++;
    dispatch(s,"shop");
  }
  function cashOut(s) {
    if (s.phase !== "payout") return false;
    earn(s,s.payout.total);
    s.earnedBonus = 0;
    if (s.ante === s.rules.anteLimit && s.blind === 2) { s.phase = "won"; s.victory = true; }
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
    s.freeReroll = false;
    s.round++;
    advance(s);
    s.offers = [];
    s.phase = "select";
    return true;
  }
  function reroll(s) {
    const cost = rerollPrice(s);
    if (s.phase !== "shop" || s.pack || s.money < cost || s.rules.noReroll) return false;
    s.money -= cost;
    if (s.freeReroll) s.freeReroll = false;
    else s.rerolls++;
    s.offers.splice(0,s.shopOfferCount,...stock(s));
    dispatch(s,"reroll");
    return true;
  }
  function space(s,def) {
    const {edition} = market.splitVariant(def.id);
    const extra = Number(edition === "negative");
    if (def.kind === "familiar") return !s.rules.noFamiliars && s.familiars.length < capacity(s).familiars + extra &&
      !s.familiars.some(ref=>baseId(ref) === baseId(def.id));
    if (def.kind === "spell") return !s.rules.noSpells && s.consumables.length < capacity(s).consumables + extra;
    return true;
  }
  function discoverCard(s,card) {
    if (card.enhancement) discover(s,"enhance_" + card.enhancement);
    if (card.seal) discover(s,"seal_" + card.seal);
    if (card.edition) discover(s,"edition_" + card.edition);
  }
  function addCard(s,card) {
    const copy = {rank:card.rank,suit:card.suit,id:"c" + s.nextId++};
    for (const key of ["enhancement","edition","seal"]) if (card[key]) copy[key] = card[key];
    s.deck.push(copy);
    if (s.phase === "play") {
      if (s.hand.length < handSize(s)) s.hand.push(copy);
      else s.draw.push(copy);
    }
    discoverCard(s,copy);
    return copy;
  }
  function acquire(s,ref) {
    let def = item(ref);
    if (!def || !space(s,def)) return false;
    if (def.kind === "familiar" && s.nextEdition && !def.edition) {
      const {sticker} = market.splitVariant(ref);
      ref = market.withVariant(baseId(ref),s.nextEdition,sticker);
      s.nextEdition = null;
      def = item(ref);
    }
    if (def.kind === "familiar") s.familiars.push(ref);
    if (def.kind === "spell") s.consumables.push(ref);
    if (def.kind === "card") addCard(s,def);
    if (def.kind !== "card") discover(s,baseId(ref));
    if (def.edition) discover(s,"edition_" + def.edition);
    if (def.sticker) discover(s,"sticker_" + def.sticker);
    return true;
  }
  function generate(s,value) {
    const {pool,count = 1} = typeof value === "string" ? {pool:value} : value;
    const ids = [];
    for (let i=0;i<count;i++) {
      const ref = pool === "legendary" ? randomFamiliar(s,[],true) :
        choose(s,spellPool(s,pool).filter(def=>!ids.includes(def.id)))?.id;
      if (!ref || !acquire(s,ref)) break;
      ids.push(ref);
    }
    return ids.length > 0;
  }
  function shopItem(s,index) {
    if (s.phase !== "shop" || s.pack || !Number.isInteger(index)) return null;
    const def = item(s.offers[index]);
    return def && s.money >= price(s,def.id) ? def : null;
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
    if (ids === undefined && def.minTargets) return hand.length >= def.minTargets &&
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
    s.pack = null;
    return true;
  }
  const inventoryOpen = s => s.phase === "play" || s.phase === "shop";
  function canSell(s,category,index) {
    if (!inventoryOpen(s) || !["familiars","consumables"].includes(category) || !Number.isInteger(index)) return false;
    const ref = s[category][index];
    return Boolean(ref) && market.splitVariant(ref).sticker !== "eternal";
  }
  function sellFrom(s,index,category) {
    if (!canSell(s,category,index)) return false;
    const [id] = s[category].splice(index,1);
    earn(s,sellPrice(s,id));
    if (category === "familiars") delete s.familiarMemory[baseId(id)];
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
    refs[target.index] = market.withVariant(target.id,value.edition,target.sticker);
    discover(s,"edition_" + value.edition);
    return true;
  }
  function canCast(s,def,ids,source,excluded) {
    if (def.minTargets && !matching(ids,def.minTargets,def.maxTargets,source)) return false;
    if (def.effect === "inventoryEdition") return Boolean(editionCandidates(s,def.value,excluded).length);
    if (def.effect === "remove") return ids.length < (s.phase === "play" ? s.hand.length + s.draw.length : s.deck.length);
    if (def.effect === "generate" && def.value.pool === "legendary") {
      return !s.rules.noFamiliars && s.familiars.length < capacity(s).familiars &&
        Object.values(content.familiars).some(f=>f.rarity === "Legendary" && !s.familiars.some(ref=>baseId(ref) === f.id));
    }
    return true;
  }
  function updateCard(s,card,updates) {
    for (const zone of [s.deck,s.hand,s.draw,s.discardPile,s.pack?.hand || []]) {
      const ref = zone.find(c=>c.id === card.id);
      if (!ref) continue;
      for (const [key,value] of Object.entries(updates)) {
        if (value == null) delete ref[key];
        else ref[key] = value;
      }
    }
    discoverCard(s,card);
  }
  function cast(s,def,ids,source) {
    const value = def.value;
    const targets = def.minTargets ? matching(ids,def.minTargets,def.maxTargets,source) : [];
    discover(s,baseId(def.id));
    if (def.edition) discover(s,"edition_" + def.edition);
    countUse(s,def.id);
    s.stats.spellsCast++;
    switch (def.effect) {
      case "money": earn(s,Math.min(s.money,value)); break;
      case "cash": earn(s,value); break;
      case "level": s.levels[value]++; break;
      case "levelMost": s.levels[mostPlayed(s)] += value; break;
      case "levelMany": value.hands.forEach(hand=>{ s.levels[hand] += value.amount; }); break;
      case "generate": generate(s,value); break;
      case "inventoryEdition": inventoryEdition(s,value); break;
      case "bossDisable":
        if (boss(s) && s.phase === "play") s.bossDisabled = true;
        else s.bossWard = (s.bossWard || 0) + value;
        if (s.blind === 2) s.target = blindInfo(s).target;
        break;
      case "remove":
        for (const key of ["deck","hand","draw","discardPile"]) s[key] = s[key].filter(c=>!ids.includes(c.id));
        if (s.pack?.hand) s.pack.hand = s.pack.hand.filter(c=>!ids.includes(c.id));
        if (s.phase === "play") refill(s);
        break;
      case "copy": for (let i=0;i<value;i++) addCard(s,targets[0]); break;
      case "rankCopy": updateCard(s,targets[1],{rank:targets[0].rank}); break;
      case "swapModifiers": {
        const [a,b] = targets.map(card=>({enhancement:card.enhancement,edition:card.edition,seal:card.seal}));
        updateCard(s,targets[0],b); updateCard(s,targets[1],a);
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
          if (def.effect === "suitRotate") {
            const suits = Object.keys(SUITS);
            updateCard(s,c,{suit:suits[(suits.indexOf(c.suit) + value) % suits.length]});
          }
        }
    }
  }
  const useHand = s => s.pack?.hand || (s.phase === "play" ? s.hand : []);
  function canUse(s,index,ids) {
    if (!inventoryOpen(s) || !Number.isInteger(index)) return false;
    const def = item(s.consumables[index]);
    if (!def) return false;
    const source = useHand(s);
    if (ids === undefined && def.minTargets) return source.length >= def.minTargets &&
      (def.effect !== "remove" || s.deck.length > def.minTargets);
    return canCast(s,def,ids || [],source,def.effect === "inventoryEdition" && def.value.kind === "spell" ? index : undefined);
  }
  function use(s,index,ids = []) {
    if (!canUse(s,index,ids)) return false;
    const def = item(s.consumables[index]);
    s.consumables.splice(index,1);
    cast(s,def,ids,useHand(s));
    return true;
  }

  const api = {HANDS,DECKS,STAKES,CHALLENGES,SUITS,BOSSES,TAGS,newRun,restore,blindInfo,handSize,startBlind,skipBlind,debuffed,
    evaluate,preview,play,discard,cashOut,endless,leaveShop,item,ownedItem,price,sellPrice,rerollPrice,reroll,
    capacity,canBuy,buy,canBuyAndUse,buyAndUse,canPick,pick,closePack,claimRewardPack,canSell,sell,sellConsumable,reorder,
    canUse,use,canRerollBoss,rerollBoss,bossRerollPrice,canDisableBoss,disableBoss};
  root.CW = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
