(function (root) {
  "use strict";

  const definitions = {};
  const effects = {};
  const portraits = {
    merlin: ["✦", "#ab89eb"], owl: ["◆", "#efc577"], orb: ["◉", "#8cc9ee"],
    grimoire: ["▤", "#b6c883"], moth: ["✧", "#f49aaa"], dragon: ["▲", "#eb9a70"],
    key: ["✥", "#e3bc96"], potion: ["◈", "#98dfc3"]
  };
  const prices = { Common: 5, Uncommon: 6, Rare: 8, Legendary: 10 };

  function register(rarity, entries) {
    for (const [name, art, description, event, effect] of entries) {
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      if (definitions[id]) throw new Error("Duplicate familiar " + id);
      const [icon, color] = portraits[art];
      definitions[id] = { id, name, kind: "familiar", cost: prices[rarity], rarity, description, art, icon, color };
      if (event.trackedStat) definitions[id].trackedStat = event.trackedStat;
      effects[id] = typeof event === "string" ? { [event]: effect } : event;
    }
  }

  function trigger(id, event, context, memory = {}) {
    return effects[id]?.[event]?.(context, memory) || {};
  }

  const when = (test, effect) => c => test(c) ? effect : {};
  const add = (key, amount) => ({ [key]: amount });
  const every = (period, value) => Number(value) > 0 && Number(value) % period === 0;
  const count = (cards, test) => (cards || []).filter(test).length;
  const includes = (cards, test) => (cards || []).some(test);
  const face = card => card.rank >= 11 && card.rank <= 13;
  const suited = suit => card => card.suit === suit || card.enhancement === "wild";
  const red = card => suited("H")(card) || suited("D")(card);
  const black = card => suited("S")(card) || suited("C")(card);
  const numbered = card => card.rank <= 10;
  const low = card => card.rank <= 5;
  const even = card => numbered(card) && card.rank % 2 === 0;
  const onCard = (key, value, test) => when(c => c.card && test(c.card, c), add(key, value));
  const size = c => c.cards?.length || 0;
  const held = c => c.held?.length || 0;
  const scored = c => c.scoring?.length || 0;
  const opposite = cards => (cards || []).some(red) && (cards || []).some(black);
  const growth = (event, test, step, limit, key, baseline = 0) => ({
    trackedStat: key,
    [event](c, memory) {
      if (test(c)) memory.bonus = Math.min(limit, (memory.bonus || 0) + step);
    },
    hand: (c, memory) => add(key, baseline + Math.min(limit, memory.bonus || 0))
  });

  register("Common", [
    ["Candle Wisp", "moth", "Your first scoring card lights up for +25 Chips and +2 Mult.", "scoredCard", when(c => c.cardIndex === 0, { chips: 25, mult: 2 })],
    ["Cricket Courier", "moth", "Number cards score +12 Chips. Ranks 2-5 score +30 instead.", "scoredCard", c => ({ chips: !numbered(c.card) ? 0 : low(c.card) ? 30 : 12 })],
    ["Ivory Mite", "moth", "Each scoring card gives +1 Mult, or +3 Mult if its rank is even (2-10).", "scoredCard", c => ({ mult: even(c.card) ? 3 : 1 })],
    ["Copper Plover", "owl", "Your last scoring card gives +30 Chips. Every time it retriggers, earn $1.", "scoredCard", c => c.cardIndex === scored(c) - 1 ? { chips: 30, money: c.retrigger ? 1 : 0 } : {}],
    ["Umbra Kit", "owl", "Each held card gives +1 Mult. Black cards give +2 instead.", "heldCard", c => ({ mult: black(c.card) ? 2 : 1 })],
    ["Daybreak Minnow", "orb", "Each held card gives +7 Chips. Red cards give +14 instead.", "heldCard", c => ({ chips: red(c.card) ? 14 : 7 })],
    ["Window Basilisk", "dragon", "Your last scoring card gives +4 Mult, doubled if it has an enhancement, seal, or edition.", "scoredCard", c => c.cardIndex === scored(c) - 1 ? { mult: c.card.enhancement || c.card.seal || c.card.edition ? 8 : 4 } : {}],
    ["Bramble Newt", "potion", "Scoring red cards give +15 Chips. Diamonds also give +2 Mult.", "scoredCard", c => ({ chips: red(c.card) ? 15 : 0, mult: suited("D")(c.card) ? 2 : 0 })],
    ["Sorrel Finch", "owl", "Scoring black cards give +20 Chips. Clubs give +35 instead.", "scoredCard", c => ({ chips: suited("C")(c.card) ? 35 : black(c.card) ? 20 : 0 })],
    ["Ruby Jay", "owl", "Your first scoring red card each hand earns $1. Every scoring Heart gives +2 Mult.", {
      scoredCard(c, memory) {
        const first = red(c.card) && memory.paidHand !== c.totalHands;
        if (first) memory.paidHand = c.totalHands;
        return { money: first ? 1 : 0, mult: suited("H")(c.card) ? 2 : 0 };
      }
    }],
    ["Plume Ferret", "owl", "Each scoring black card gives +2 Mult. Spades also give +12 Chips.", "scoredCard", c => ({ mult: black(c.card) ? 2 : 0, chips: suited("S")(c.card) ? 12 : 0 })],
    ["Twilit Vole", "owl", "+3 Mult for each color that scores. Score both colors for +25 Chips too.", "hand", c => ({ mult: 3 * (Number(includes(c.scoring, red)) + Number(includes(c.scoring, black))), chips: opposite(c.scoring) ? 25 : 0 })],
    ["Mantle Rabbit", "owl", "+12 Chips per card played, including cards outside the scoring hand.", "hand", c => ({ chips: 12 * size(c) })],
    ["Tin Echo", "grimoire", "Retrigger the last scoring card of every hand.", "scoredCard", when(c => c.cardIndex === scored(c) - 1, { retriggers: 1 })],
    ["Mist Hare", "moth", "+2 Mult per card played. Fill all five spots for +20 Chips too.", "hand", c => ({ mult: 2 * size(c), chips: size(c) === 5 ? 20 : 0 })],
    ["Dustfin", "moth", "+15 Chips. Each extra card played outside the scoring hand adds +15 more.", "hand", c => ({ chips: 15 * (1 + size(c) - scored(c)) })],
    ["Lattice Toad", "potion", "+3 Mult for each different rank you keep in hand, up to +12.", "hand", c => ({ mult: 3 * Math.min(4, new Set(c.held.map(card => card.rank).filter(Number.isInteger)).size) })],
    ["Marrow Lark", "owl", "Your first held card gives +4 Mult. Each other held card gives +1.", "heldCard", c => ({ mult: c.cardIndex === 0 ? 4 : 1 })],
    ["Crooked Tern", "owl", "Start each blind at +70 Chips. Lose 15 Chips with each hand played, down to +10.", "hand", c => ({ chips: Math.max(10, 70 - 15 * (c.playedCount - 1)) })],
    ["Wicker Lamp", "orb", "Start each blind at +3 Mult. Each hand played adds +3 more for the next hand.", "hand", c => ({ mult: 3 * c.playedCount })],
    ["Ripple Snail", "potion", "+25 Chips every hand. Double that with one hand left after playing, or quadruple it on your last hand.", "hand", c => ({ chips: c.handsLeft === 0 ? 100 : c.handsLeft === 1 ? 50 : 25 })],
    ["Briar Lamprey", "dragon", "+3 Mult. Each discard used this blind adds +3 more.", "hand", c => ({ mult: 3 + 3 * c.discardCount })],
    ["Parchment Bee", "grimoire", "+15 Chips for each discard left. Win with any discards left to earn $1.", {
      hand: c => ({ chips: 15 * c.discardsLeft }),
      roundEnd: when(c => c.succeeded !== false && c.discardsLeft > 0, { money: 1 })
    }],
    ["Briar Piper", "merlin", "Each discarded card banks +2 Mult for your next hand, up to +14.", {
      trackedStat: "mult",
      discard(c, memory) { memory.charge = Math.min(14, (memory.charge || 0) + 2 * size(c)); },
      hand(c, memory) { const mult = memory.charge || 0; memory.charge = 0; return { mult }; },
      blindStart(c, memory) { memory.charge = 0; }
    }],
    ["Moss Badger", "owl", "+25 Chips per scoring card that shares its rank with another scoring card.", "scoredCard", onCard("chips", 25, (card, c) => card.rank && count(c.scoring, other => other.rank === card.rank) >= 2)],
    ["Juniper Kite", "owl", "+2 Mult for each different rank you play. Extra cards count too.", "hand", c => ({ mult: 2 * new Set(c.cards.map(card => card.rank).filter(Number.isInteger)).size })],
    ["Basalt Sprite", "orb", "+20 Chips for each different rank that scores.", "hand", c => ({ chips: 20 * new Set(c.scoring.map(card => card.rank).filter(Number.isInteger)).size })],
    ["Willow Cricket", "moth", "After your first scoring card, every scoring card adds +3 Mult.", "scoredCard", when(c => c.cardIndex > 0, { mult: 3 })],
    ["Alabaster Finch", "owl", "Your first scoring card gives +30 Chips. If it's your only scoring card, gain +4 Mult too.", "scoredCard", c => c.cardIndex === 0 ? { chips: 30, mult: scored(c) === 1 ? 4 : 0 } : {}],
    ["Fox in Ink", "grimoire", "+4 Mult. Each consumable you cast adds +1 Mult for the run, up to +12 more.", growth("cast", () => true, 1, 12, "mult", 4)],
    ["Swamp Lantern", "orb", "+15 Chips for each different hand type you've played this blind, including this one.", "hand", c => ({ chips: 15 * Object.keys(c.handCounts).filter(name => c.handCounts[name] > 0).length })],
    ["Ochre Scribe", "merlin", "Each scoring card gives +8 Chips, plus +15 per enhancement, seal, or edition on it.", "scoredCard", c => ({ chips: 8 + 15 * [c.card.enhancement, c.card.seal, c.card.edition].filter(Boolean).length })],
    ["Milkglass Fawn", "owl", "Each scoring card without an enhancement gives +2 Mult. Unenhanced faces give +5 instead.", "scoredCard", c => ({ mult: c.card.enhancement ? 0 : face(c.card) ? 5 : 2 })],
    ["Veil Firefly", "moth", "+20 Chips. Each different suit you hold adds +10 more. Wild cards count as every suit.", "hand", c => ({ chips: 20 + 10 * ["S", "H", "C", "D"].filter(suit => includes(c.held, suited(suit))).length })],
    ["Rookery Gecko", "dragon", "Held face cards give +3 Mult each. If any face card scores, gain +25 Chips too.", {
      heldCard: onCard("mult", 3, face),
      hand: when(c => includes(c.scoring, face), { chips: 25 })
    }],
    ["Coin Cicada", "key", "Your first discard each blind earns $2, whatever you throw away.", "discard", when(c => c.discardCount === 1, { money: 2 })],
    ["Linen Sprite", "grimoire", "Your first discard each blind creates a Spell if you have room.", "discard", when(c => c.discardCount === 1, { generate: "spell" })],
    ["Nimble Wren", "owl", "Win a blind to earn $1, plus $1 for each unspent hand (up to $4 total).", "roundEnd", c => ({ money: c.succeeded === false ? 0 : Math.min(4, 1 + c.handsLeft) })],
    ["Satchel Mouse", "key", "Find $2 on entering a shop, or $4 if you arrive with $8 or less.", "shop", c => ({ money: c.money <= 8 ? 4 : 2 })],
    ["Lacquer Eel", "potion", "+3 Mult, plus +1 per $3 you hold, up to +12 Mult total.", "hand", c => ({ mult: Math.min(12, 3 + Math.floor(c.money / 3)) })],
    ["Ribbon Crow", "owl", "+12 Chips per equipped familiar, including itself. Each carried consumable adds +10 more.", "hand", c => ({ chips: 12 * c.ownedCount + 10 * c.consumableCount })],
    ["Soot Aphid", "moth", "+15 Chips. Each blind you win with Soot Aphid adds +5 Chips for the run, up to +75 more.", growth("roundEnd", c => c.succeeded !== false, 5, 75, "chips", 15)]
  ]);

  register("Uncommon", [
    ["Mantled Viper", "dragon", "Gain x1.2 Mult for each card that scores, up to five cards.", "hand",
      c => ({ xmult: 1.2 ** Math.min(5, scored(c)) })],
    ["Glimmer Orca", "potion", "+4 Mult. Each played card that doesn't score adds another +4 Mult.", "hand",
      c => ({ mult: 4 + 4 * (size(c) - scored(c)) })],
    ["Cinder Coil", "dragon", "The first scoring card gives +6 Mult each time it triggers.", "scoredCard",
      onCard("mult", 6, (_, c) => c.cardIndex === 0)],
    ["Pale Axolotl", "potion", "x1.25 Mult. Raise it to x1.75 if an enhanced card scores or stays in hand.", "hand",
      c => ({ xmult: [...c.scoring, ...c.held].some(card => card.enhancement) ? 1.75 : 1.25 })],
    ["Clover Adder", "dragon", "Earn $1 per scoring Club, up to $3 per hand. Wild cards count.", "hand",
      c => ({ money: Math.min(3, count(c.scoring, suited("C"))) })],
    ["Carmine Crab", "potion", "Each red card held gives +3 Mult. Wild cards count.", "heldCard", onCard("mult", 3, red)],
    ["Slate Salamander", "dragon", "Each red card that scores gives +12 Chips and +2 Mult.", "scoredCard",
      when(c => red(c.card), { chips: 12, mult: 2 })],
    ["Coalwing Roc", "owl", "Scoring a black card gives x1.5 Mult for the hand. Two or more give x1.8.", "hand",
      c => ({ xmult: [1, 1.5, 1.8][Math.min(2, count(c.scoring, black))] })],
    ["Kettle Hag", "merlin", "After a discard, the last scoring card of your next hand this blind retriggers once.", {
      discard(c, memory) { memory.brewed = true; },
      scoredCard(c, memory) {
        if (memory.brewed && !c.retrigger && c.cardIndex === scored(c) - 1) return { retriggers: 1 };
      },
      hand(c, memory) { memory.brewed = false; },
      blindStart(c, memory) { memory.brewed = false; }
    }],
    ["Furnace Mink", "potion", "Play a pair anywhere in your hand for +8 Mult. Three matching ranks give +16 instead.", "hand",
      c => {
        const ranks = c.cards.map(card => card.rank).filter(Number.isInteger);
        const copies = Math.max(0, ...ranks.map(rank => ranks.filter(other => other === rank).length));
        return { mult: copies >= 3 ? 16 : copies === 2 ? 8 : 0 };
      }],
    ["Vesper's Twin", "moth", "x1.3 Mult on your opening hand. All later hands this blind get x1.7.", "hand",
      c => ({ xmult: c.playedCount <= 1 ? 1.3 : 1.7 })],
    ["Kiln Crawler", "dragon", "+20 Chips. Each discarded card adds +10 Chips to your next hand this blind.", {
      trackedStat: "chips",
      discard(c, memory) { memory.fuel = (memory.fuel || 0) + size(c); },
      hand(c, memory) { const chips = 20 + 10 * (memory.fuel || 0); memory.fuel = 0; return { chips }; },
      blindStart(c, memory) { memory.fuel = 0; }
    }],
    ["Memorist Owlet", "owl", "Each different hand type played this blind gives +5 Mult, including this hand.", "hand",
      c => ({ mult: 5 * Object.values(c.handCounts).filter(Boolean).length })],
    ["Orbit Scribe", "merlin", "Alternates each blind: odd hands give +8 Mult, even hands give x1.7 Mult.", "hand",
      c => c.playedCount % 2 ? { mult: 8 } : { xmult: 1.7 }],
    ["Cloud Quill", "grimoire", "+6 Mult the first time you play a hand type each blind. Repeats give x1.75 Mult instead.", "hand",
      c => c.handCounts[c.name] > 1 ? { xmult: 1.75 } : { mult: 6 }],
    ["Ivory Chamberlain", "merlin", "Each face card held gives +20 Chips and +2 Mult.", "heldCard",
      when(c => face(c.card), { chips: 20, mult: 2 })],
    ["Cradle Mantis", "moth", "Each scoring card ranked 2 through 10 gives +12 Chips and +2 Mult.", "scoredCard",
      when(c => c.card.rank >= 2 && c.card.rank <= 10, { chips: 12, mult: 2 })],
    ["Needle Crow", "owl", "Every time a scoring card retriggers, it adds +8 Mult.", "scoredCard",
      when(c => c.retrigger, { mult: 8 })],
    ["Beacon Urchin", "orb", "Your last scoring card gets +20 Chips and x1.35 Mult each time it triggers.", "scoredCard",
      when(c => c.cardIndex === scored(c) - 1, { chips: 20, xmult: 1.35 })],
    ["Quarry Gull", "owl", "+30 Chips. Each enhanced card that scores adds +30 more.", "hand",
      c => ({ chips: 30 + 30 * count(c.scoring, card => card.enhancement) })],
    ["Iron Dormouse", "owl", "Each held card gives +6 Chips. Held enhanced cards give +18 instead.", "heldCard",
      c => ({ chips: c.card.enhancement ? 18 : 6 })],
    ["Velvet Scarab", "moth", "x1.25 Mult. Each scoring or held card with an edition adds x0.25, up to x2.5.", "hand",
      c => ({ xmult: 1.25 + 0.25 * Math.min(5, count([...c.scoring, ...c.held], card => card.edition)) })],
    ["Chalk Beetle", "moth", "Each scoring card gives +1 Mult, or +3 Mult if it has no enhancement.", "scoredCard",
      c => ({ mult: c.card.enhancement ? 1 : 3 })],
    ["Citrine Spider", "potion", "Each scoring card gives +10 Chips. Sealed cards also earn $1 each time they score.", "scoredCard",
      c => ({ chips: 10, money: c.card.seal ? 1 : 0 })],
    ["Mercury Skink", "dragon", "+4 Mult per level of the hand you play, up to +24 Mult.", "hand",
      c => ({ mult: Math.min(24, 4 * c.level) })],
    ["Dust Telescope", "orb", "+30 Chips. Casting a consumable permanently adds +8 Chips, up to +110 total.",
      growth("cast", () => true, 8, 80, "chips", 30)],
    ["Good Omen", "grimoire", "Each equipped familiar gives +3 Mult. Each carried consumable gives +2 more.", {
      trackedStat: "mult", hand: c => ({ mult: 3 * c.ownedCount + 2 * c.consumableCount })
    }],
    ["Silt Phoenix", "dragon", "+6 Mult. Each dollar below $10 adds +2 more.", {
      trackedStat: "mult", hand: c => ({ mult: 6 + 2 * Math.max(0, 10 - c.money) })
    }],
    ["Marmalade Bat", "moth", "Earn $2 for the first discard of each blind and $1 for each later discard.", "discard",
      c => ({ money: c.discardCount === 1 ? 2 : 1 })],
    ["Pearl Pigeon", "owl", "Win a blind to earn $2, plus $1 per consumable you carry.", "roundEnd",
      c => ({ money: 2 + c.consumableCount })],
    ["Shopbell Sprite", "orb", "Entering a shop pays $1. Your first reroll there pays another $2.", {
      shop(c, memory) { memory.paid = false; return { money: 1 }; },
      reroll(c, memory) { if (!memory.paid) { memory.paid = true; return { money: 2 }; } }
    }],
    ["Silken Broker", "key", "Opening any booster earns $2. Casting any consumable earns $1.", {
      packOpen: () => ({ money: 2 }),
      cast: () => ({ money: 1 })
    }],
    ["Garden Almanac", "grimoire", "Every second consumable you cast grows a Constellation if you have room.", {
      cast(c, memory) {
        memory.casts = (memory.casts || 0) + 1;
        if (every(2, memory.casts)) return { generate: "star" };
      }
    }],
    ["Clockwork Mage", "merlin", "Wins alternate between $2 and a Constellation. Leave a slot for the card.", {
      roundEnd(c, memory) {
        memory.wins = (memory.wins || 0) + 1;
        return memory.wins % 2 ? { money: 2 } : { generate: "star" };
      }
    }],
    ["Tallow Idol", "orb", "+4 Mult. Every discard adds +1 Mult permanently, up to +18 total.",
      growth("discard", () => true, 1, 14, "mult", 4)],
    ["Mire Printer", "grimoire", "+28 Chips. Selling an item adds +15 Chips permanently, up to +118 total.",
      growth("sell", () => true, 15, 90, "chips", 28)],
    ["Granite Tinker", "merlin", "+35 Chips. Opening a booster adds +12 Chips permanently, up to +131 total.",
      growth("packOpen", () => true, 12, 96, "chips", 35)],
    ["Ash Ledger", "grimoire", "+5 Mult. Entering a shop adds +1 Mult permanently, up to +20 total.",
      growth("shop", () => true, 1, 15, "mult", 5)],
    ["Root Harp", "grimoire", "+18 Chips. Each blind won adds +9 Chips permanently, up to +126 total.",
      growth("roundEnd", () => true, 9, 108, "chips", 18)],
    ["Ivy Telescope", "orb", "Your highest held rank gives five times its rank in Chips. Aces count as 14.", "hand",
      c => ({ chips: 5 * Math.max(0, ...c.held.map(card => card.rank || 0)) })],
    ["Hush Raven", "owl", "The first face card you score each hand retriggers.", "scoredCard",
      when(c => face(c.card) && c.cardIndex === c.scoring.findIndex(face), { retriggers: 1 })],
    ["Glass Kestrel", "owl", "The first time each suit scores in a blind, earn $1 and add +6 Mult. A Wild claims one new suit.", {
      blindStart(c, memory) { memory.suits = ""; },
      scoredCard(c, memory) {
        const seen = memory.suits || "";
        const suit = c.card.enhancement === "wild"
          ? ["H", "D", "C", "S"].find(s => !seen.includes(s)) : c.card.suit;
        if (!suit || seen.includes(suit) || c.retrigger) return;
        memory.suits = seen + suit;
        return { money: 1, mult: 6 };
      }
    }],
    ["Porcelain Octopus", "potion", "+2 Mult for each card left in hand, up to +16 Mult.", "hand",
      c => ({ mult: Math.min(16, 2 * held(c)) })],
    ["Jasper Clock", "orb", "+35 Chips. Each card below a 52-card deck adds +8 more, up to +155 total.", {
      trackedStat: "chips", hand: c => ({ chips: 35 + 8 * Math.min(15, Math.max(0, 52 - c.deckSize)) })
    }],
    ["Quilted Elk", "owl", "Each color that scores gives +5 Mult. Wild cards count as both colors.", "hand",
      c => ({ mult: 5 * (Number(includes(c.scoring, red)) + Number(includes(c.scoring, black))) })]
  ]);

  register("Rare", [
    ["Porcelain Wyrm", "dragon", "Your first scoring card retriggers once. Move your best card to the front.", "scoredCard",
      when(c => !c.retrigger && c.cardIndex === 0, { retriggers: 1 })],
    ["Wisp Weaver", "moth", "Every third scoring card retriggers twice. The count carries between hands and skips retriggers.", {
      scoredCard(c, memory) {
        if (c.retrigger) return;
        memory.thread = ((memory.thread || 0) + 1) % 3;
        if (!memory.thread) return { retriggers: 2 };
      }
    }],
    ["Night Scintilla", "orb", "Your leftmost held card gives +4 Mult and retriggers once, repeating its held effects.", "heldCard",
      c => c.cardIndex === 0 ? { mult: 4, retriggers: c.retrigger ? 0 : 1 } : {}],
    ["Iridescent Loom", "grimoire", "Each scoring card gives +3 Mult. A change of suit from the previous scoring card also triggers that card again.", "scoredCard",
      c => ({ mult: 3, retriggers: Number(!c.retrigger && c.cardIndex > 0 && c.card.suit != null && c.scoring[c.cardIndex - 1].suit != null && c.card.suit !== c.scoring[c.cardIndex - 1].suit) })],
    ["Marble Wasp", "moth", "On the opening hand of every blind, all scoring cards retrigger once.", "scoredCard",
      when(c => !c.retrigger && c.playedCount === 1, { retriggers: 1 })],
    ["Mirror Grebe", "owl", "Copy the familiar on your right whenever a card scores or triggers in hand.", {
      scoredCard: () => ({ copy: "next" }),
      heldCard: () => ({ copy: "next" })
    }],
    ["Second Shadow", "moth", "Every hand, copy the end-of-hand scoring ability of the familiar on your left.", "hand", () => ({ copy: "previous" })],
    ["Thimble Griffin", "dragon", "Each play slot you leave empty gives x1.3 Mult. A one-card play earns all four bonuses.", "hand",
      c => ({ xmult: 1.3 ** Math.max(0, 5 - size(c)) })],
    ["Amber Magpie", "owl", "Your last scoring card gives +20 Chips and earns $1 each time it scores.", "scoredCard",
      when(c => c.cardIndex === scored(c) - 1, { chips: 20, money: 1 })],
    ["Riddle Fox", "owl", "Start each blind at x1 Mult. Each different hand type played adds x0.5, including this hand.", "hand",
      c => ({ xmult: 1 + 0.5 * Object.keys(c.handCounts).length })],
    ["Flint Lich", "merlin", "Your first scoring card gives +7 Mult. Every scoring-card retrigger gives another +7 Mult.", "scoredCard",
      c => ({ mult: 7 * (Number(c.cardIndex === 0) + Number(c.retrigger)) })],
    ["Comet Imp", "moth", "Each scoring card gives +2 Mult. Enhanced scoring cards also give x1.3 Mult.", "scoredCard",
      c => ({ mult: 2, xmult: c.card.enhancement ? 1.3 : 1 })],
    ["Rook of Glass", "orb", "Gain +8 Mult. Multiply by 1.4 for each kind of upgrade in your held cards: enhancement, seal, edition.", "hand",
      c => ({ mult: 8, xmult: 1.4 ** count(["enhancement", "seal", "edition"], key => includes(c.held, card => card[key])) })],
    ["Quicksilver Lynx", "potion", "Each scoring card gives +4 Mult. If its rank already scored this hand, give x1.4 Mult instead.", "scoredCard",
      c => c.card.rank && (c.retrigger || c.scoring.slice(0, c.cardIndex).some(card => card.rank === c.card.rank)) ? { xmult: 1.4 } : { mult: 4 }],
    ["Umbral Tutor", "merlin", "Gain +5 Mult per level of the hand you play. Each boss you beat conjures a Constellation if there is room.", {
      hand: c => ({ mult: 5 * c.level }),
      roundEnd: when(c => c.blind === 2, { generate: "star" })
    }],
    ["Ebon Sundial", "orb", "Alternate each blind: the first hand gets +90 Chips, the next gets x2.2 Mult, then repeat.", "hand",
      c => c.playedCount % 2 ? { chips: 90 } : { xmult: 2.2 }],
    ["Sugar Locust", "moth", "Gain +4 Mult for each discard still available. Winning a blind pays $1 per unused discard.", {
      hand: c => ({ mult: 4 * c.discardsLeft }),
      roundEnd: c => ({ money: c.discardsLeft })
    }],
    ["Dusk Undertaker", "merlin", "Each card you discard adds x0.15 Mult to your next hand, up to x2.5. Resets after the hand or blind.", {
      trackedStat: "xmult",
      discard(c, memory) { memory.buried = Math.min(10, (memory.buried || 0) + size(c)); },
      hand(c, memory) {
        const xmult = 1 + 0.15 * (memory.buried || 0);
        memory.buried = 0;
        return { xmult };
      },
      blindStart(c, memory) { memory.buried = 0; }
    }],
    ["Gilded Harrier", "owl", "x1.25 Mult, plus x0.05 for every dollar in your purse, up to x2.5 total.", {
      trackedStat: "xmult",
      hand: c => ({ xmult: 1.25 + 0.05 * Math.min(25, c.money) })
    }],
    ["Leviathan Husk", "dragon", "Your first scoring card adds +1 Chip for every card in your full deck, each time it scores.", "scoredCard",
      c => c.cardIndex === 0 ? { chips: c.deckSize } : {}],
    ["Monastic Eel", "potion", "x3 Mult alone. Each other familiar lowers it by x0.35, down to x1.25.", {
      trackedStat: "xmult",
      hand: c => ({ xmult: Math.max(1.25, 3 - 0.35 * Math.max(0, c.ownedCount - 1)) })
    }],
    ["Golden Mycelium", "grimoire", "When you win a blind, earn $2 for each different hand type you played during it.", "roundEnd",
      c => ({ money: 2 * Object.keys(c.handCounts).length })],
    ["Bounty Sparrow", "owl", "Win a blind to earn $2. Bosses pay $6 instead.", "roundEnd", c => ({ money: c.blind === 2 ? 6 : 2 })],
    ["Specter Crown", "orb", "Every second blind you win conjures a Spectral card if there is room. Using any consumable earns $2.", {
      cast: () => ({ money: 2 }),
      roundEnd(c, memory) {
        memory.victories = (memory.victories || 0) + 1;
        if (every(2, memory.victories)) return { generate: "spectral" };
      }
    }],
    ["Brass Lantern", "orb", "Enter a shop to earn $2 and conjure a Spell if there is room.", "shop", () => ({ money: 2, generate: "spell" })],
    ["Vault Maggot", "moth", "Start at x1.3 Mult. Each shop reroll permanently adds x0.15, up to x2.8.", growth("reroll", () => true, 0.15, 1.5, "xmult", 1.3)],
    ["Oracle in Amber", "merlin", "Start at x1.2 Mult. Every blind you win permanently adds x0.1, up to x3.2.", growth("roundEnd", () => true, 0.1, 2, "xmult", 1.2)],
    ["Gull in Chains", "owl", "Start with +50 Chips. Every shop purchase permanently adds +10 Chips, up to +200 total.", growth("buy", () => true, 10, 150, "chips", 50)],
    ["Frost Warden", "merlin", "Start at x1.2 Mult. Your first discard each blind permanently adds x0.1, up to x2.8.", growth("discard", c => c.discardCount === 1, 0.1, 1.6, "xmult", 1.2)]
  ]);

  register("Legendary", [
    ["Aurelia of the Eclipse", "merlin", "The first and last scoring cards each retrigger once. On Boss Blinds, every scoring card retriggers once.", "scoredCard",
      when(c => !c.retrigger && (c.blind === 2 || c.cardIndex === 0 || c.cardIndex === scored(c) - 1), { retriggers: 1 })],
    ["The Orchard Below", "grimoire", "Every held card gives x1.2 Mult. Each time a held card retriggers, also earn $1.", "heldCard",
      c => ({ xmult: 1.2, money: Number(c.retrigger) })],
    ["Saffron, Keeper of Doors", "key", "Start at x1.5 Mult. Each consumable used adds x0.2, up to x4.5. Start a blind to conjure a Spell if there is room.", {
      ...growth("cast", () => true, 0.2, 3, "xmult", 1.5),
      blindStart: () => ({ generate: "spell" })
    }],
    ["Ravel the Weaver", "moth", "Copy your left neighbor's scoring and held-card abilities, then your right neighbor's end-of-hand scoring ability.", {
      scoredCard: () => ({ copy: "previous" }),
      heldCard: () => ({ copy: "previous" }),
      hand: () => ({ copy: "next" })
    }],
    ["Nacre, Sea of Stars", "dragon", "Each scoring card adds its hand level to Mult, then gives x1.15 Mult. Win a blind to conjure a Constellation if there is room.", {
      scoredCard: c => ({ mult: c.level, xmult: 1.15 }),
      roundEnd: () => ({ generate: "star" })
    }]
  ]);

  const milestones = {
    clear_blind: ["wicker_lamp", "porcelain_octopus", "shopbell_sprite"],
    bench_tested: ["memorist_owlet", "orbit_scribe", "cloud_quill"],
    small_fortune: ["silken_broker", "gilded_harrier", "vault_maggot"],
    boss_broken: ["bounty_sparrow", "specter_crown", "ash_ledger"],
    deckwright: ["citrine_spider", "quarry_gull", "quicksilver_lynx", "rook_of_glass"],
    second_circle: ["iridescent_loom", "golden_mycelium", "frost_warden"],
    first_victory: ["mirror_grebe", "second_shadow", "oracle_in_amber"],
    earn_your_stripes: ["ebon_sundial", "thimble_griffin"],
    trial_clear: ["monastic_eel", "gull_in_chains"]
  };
  for (const [unlock, ids] of Object.entries(milestones)) {
    for (const id of ids) definitions[id].unlock = unlock;
  }

  const api = { definitions, trigger };
  root.CWFamiliars = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
