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
  const odd = card => numbered(card) && card.rank % 2 === 1;
  const even = card => numbered(card) && card.rank % 2 === 0;
  const onCard = (key, value, test) => when(c => c.card && test(c.card, c), add(key, value));
  const handIs = name => c => c.name === name;
  const size = c => c.cards?.length || 0;
  const held = c => c.held?.length || 0;
  const scored = c => c.scoring?.length || 0;
  const opposite = cards => (cards || []).some(red) && (cards || []).some(black);
  const growth = (event, test, step, limit, key, baseline = 0) => ({
    [event](c, memory) {
      if (test(c)) memory.bonus = Math.min(limit, (memory.bonus || 0) + step);
    },
    hand: (c, memory) => add(key, baseline + (memory.bonus || 0))
  });

  register("Common", [
    ["Candle Wisp", "moth", "+22 Chips when your first card scores.", "scoredCard", onCard("chips", 22, (_, c) => c.cardIndex === 0)],
    ["Cricket Courier", "moth", "+17 Chips for each scoring card ranked 2–5.", "scoredCard", onCard("chips", 17, low)],
    ["Ivory Mite", "moth", "+2 Mult for each scoring even-numbered card.", "scoredCard", onCard("mult", 2, even)],
    ["Copper Plover", "owl", "+18 Chips for each scoring odd-numbered card.", "scoredCard", onCard("chips", 18, odd)],
    ["Umbra Kit", "owl", "+2 Mult for every black card held in hand.", "heldCard", onCard("mult", 2, black)],
    ["Daybreak Minnow", "orb", "+5 Chips for every red card held in hand.", "heldCard", onCard("chips", 5, red)],
    ["Window Basilisk", "dragon", "+3 Mult for each scoring 5 or 10.", "scoredCard", onCard("mult", 3, card => [5, 10].includes(card.rank))],
    ["Bramble Newt", "potion", "+12 Chips for each scoring Diamond.", "scoredCard", onCard("chips", 12, suited("D"))],
    ["Sorrel Finch", "owl", "+16 Chips for each scoring Club.", "scoredCard", onCard("chips", 16, suited("C"))],
    ["Ruby Jay", "owl", "+13 Chips for each scoring Heart.", "scoredCard", onCard("chips", 13, suited("H"))],
    ["Plume Ferret", "owl", "+3 Mult for each scoring Spade ranked 9 or lower.", "scoredCard", onCard("mult", 3, card => suited("S")(card) && card.rank <= 9)],
    ["Twilit Vole", "owl", "+5 Mult when red and black cards both score.", "hand", when(c => opposite(c.scoring), { mult: 5 })],
    ["Mantle Rabbit", "owl", "+38 Chips when exactly four cards are played.", "hand", when(c => size(c) === 4, { chips: 38 })],
    ["Tin Echo", "grimoire", "+34 Chips when exactly two cards score.", "hand", when(c => scored(c) === 2, { chips: 34 })],
    ["Mist Hare", "moth", "+6 Mult when exactly five cards are played.", "hand", when(c => size(c) === 5, { mult: 6 })],
    ["Dustfin", "moth", "+12 Chips per nonscoring card played.", "hand", c => ({ chips: 12 * (size(c) - scored(c)) })],
    ["Lattice Toad", "potion", "+5 Mult when you hold at least four cards after playing.", "hand", when(c => held(c) >= 4, { mult: 5 })],
    ["Marrow Lark", "owl", "+3 Mult for every pair of cards left in hand.", "hand", c => ({ mult: 3 * Math.floor(held(c) / 2) })],
    ["Crooked Tern", "owl", "+25 Chips on the first hand of a blind.", "hand", when(c => c.playedCount === 1, { chips: 25 })],
    ["Wicker Lamp", "orb", "+8 Mult on the second hand of a blind.", "hand", when(c => c.playedCount === 2, { mult: 8 })],
    ["Ripple Snail", "potion", "+40 Chips when you have no hands left.", "hand", when(c => c.handsLeft === 0, { chips: 40 })],
    ["Briar Lamprey", "dragon", "+7 Mult when you have exactly one discard left.", "hand", when(c => c.discardsLeft === 1, { mult: 7 })],
    ["Parchment Bee", "grimoire", "+9 Chips for every discard still available.", "hand", c => ({ chips: 9 * (c.discardsLeft || 0) })],
    ["Briar Piper", "merlin", "+5 Mult if you’ve discarded at least once this blind.", "hand", when(c => c.discardCount > 0, { mult: 5 })],
    ["Moss Badger", "owl", "+32 Chips on a Pair.", "hand", when(handIs("Pair"), { chips: 32 })],
    ["Juniper Kite", "owl", "+7 Mult on Two Pair.", "hand", when(handIs("Two Pair"), { mult: 7 })],
    ["Basalt Sprite", "orb", "+35 Chips on a Straight.", "hand", when(handIs("Straight"), { chips: 35 })],
    ["Willow Cricket", "moth", "+9 Mult on a Full House.", "hand", when(handIs("Full House"), { mult: 9 })],
    ["Alabaster Finch", "owl", "+24 Chips on High Card if your scoring card is a face card.", "hand", when(c => c.name === "High Card" && includes(c.scoring, face), { chips: 24 })],
    ["Fox in Ink", "grimoire", "+8 Mult on Three of a Kind.", "hand", when(handIs("Three of a Kind"), { mult: 8 })],
    ["Swamp Lantern", "orb", "+40 Chips on any hand ranked above Full House.", "hand", when(c => ["Four of a Kind", "Straight Flush", "Five of a Kind", "Flush House", "Flush Five"].includes(c.name), { chips: 40 })],
    ["Ochre Scribe", "merlin", "+18 Chips per enhanced scoring card.", "scoredCard", onCard("chips", 18, card => Boolean(card.enhancement))],
    ["Milkglass Fawn", "owl", "+3 Mult per unenhanced face card that scores.", "scoredCard", onCard("mult", 3, card => !card.enhancement && face(card))],
    ["Veil Firefly", "moth", "+7 Chips for each held 6, 7, or 8.", "heldCard", onCard("chips", 7, card => [6, 7, 8].includes(card.rank))],
    ["Rookery Gecko", "dragon", "+4 Mult when you hold both a Jack and a King.", "hand", when(c => includes(c.held, card => card.rank === 11) && includes(c.held, card => card.rank === 13), { mult: 4 })],
    ["Coin Cicada", "key", "Earn $1 when your first discard contains exactly one card.", "discard", when(c => c.discardCount === 1 && size(c) === 1, { money: 1 })],
    ["Linen Sprite", "grimoire", "Earn $1 when you discard a four-card set of different ranks.", "discard", when(c => size(c) === 4 && new Set(c.cards.map(card => card.rank)).size === 4, { money: 1 })],
    ["Nimble Wren", "owl", "Earn $1 when you win a blind with no discards left.", "roundEnd", when(c => c.succeeded !== false && c.discardsLeft === 0, { money: 1 })],
    ["Satchel Mouse", "key", "Earn $1 when you enter a shop with $6 or less.", "shop", when(c => c.money <= 6, { money: 1 })],
    ["Lacquer Eel", "potion", "+6 Mult when you have even cash.", "hand", when(c => c.money % 2 === 0, { mult: 6 })],
    ["Ribbon Crow", "owl", "+33 Chips when you have an odd number of familiars.", "hand", when(c => c.ownedCount % 2 === 1, { chips: 33 })],
    ["Soot Aphid", "moth", "+31 Chips on odd-numbered antes.", "hand", when(c => c.ante % 2 === 1, { chips: 31 })]
  ]);

  register("Uncommon", [
    ["Mantled Viper", "dragon", "x1.45 Mult when exactly three cards score.", "hand", when(c => scored(c) === 3, { xmult: 1.45 })],
    ["Glimmer Orca", "potion", "x1.65 Mult when you play five cards and only two score.", "hand", when(c => size(c) === 5 && scored(c) === 2, { xmult: 1.65 })],
    ["Cinder Coil", "dragon", "x1.5 Mult when no face card is played.", "hand", when(c => !includes(c.cards, face), { xmult: 1.5 })],
    ["Pale Axolotl", "potion", "x1.5 Mult when an enhanced card is held and a plain card scores.", "hand", when(c => includes(c.held, card => card.enhancement) && includes(c.scoring, card => !card.enhancement), { xmult: 1.5 })],
    ["Clover Adder", "dragon", "x1.6 Mult when three or more Clubs score.", "hand", when(c => count(c.scoring, suited("C")) >= 3, { xmult: 1.6 })],
    ["Carmine Crab", "potion", "+4 Mult for each pair of Hearts in hand.", "hand", c => ({ mult: 4 * Math.floor(count(c.held, suited("H")) / 2) })],
    ["Slate Salamander", "dragon", "x1.55 Mult when every scoring card is red and at least two score.", "hand", when(c => scored(c) >= 2 && c.scoring.every(red), { xmult: 1.55 })],
    ["Coalwing Roc", "owl", "x1.55 Mult when every scoring card is black and at least two score.", "hand", when(c => scored(c) >= 2 && c.scoring.every(black), { xmult: 1.55 })],
    ["Kettle Hag", "merlin", "+10 Chips per played rank that also appears in your held cards.", "hand", c => ({ chips: 10 * new Set((c.cards || []).filter(card => card.rank && includes(c.held, other => other.rank === card.rank)).map(card => card.rank)).size })],
    ["Furnace Mink", "potion", "+10 Mult when you play two or more cards of the same rank as a held card.", "hand", when(c => includes(c.held, card => card.rank && count(c.cards, other => other.rank === card.rank) >= 2), { mult: 10 })],
    ["Vesper's Twin", "moth", "x1.55 Mult if you have exactly one hand left after this play.", "hand", when(c => c.handsLeft === 1, { xmult: 1.55 })],
    ["Kiln Crawler", "dragon", "+13 Chips per card discarded this action the next time you play.", {
      discard(c, memory) { memory.fuel = size(c); },
      hand(c, memory) { const chips = 13 * (memory.fuel || 0); memory.fuel = 0; return { chips }; },
      blindStart(c, memory) { memory.fuel = 0; }
    }],
    ["Memorist Owlet", "owl", "+15 Mult every third hand you play in this run.", "hand", when(c => every(3, c.totalHands), { mult: 15 })],
    ["Orbit Scribe", "merlin", "+11 Mult every second hand of the blind.", "hand", when(c => every(2, c.playedCount), { mult: 11 })],
    ["Cloud Quill", "grimoire", "x1.6 Mult when you repeat a hand type within this blind.", "hand", when(c => (c.handCounts?.[c.name] || 0) >= 2, { xmult: 1.6 })],
    ["Ivory Chamberlain", "merlin", "+24 Chips and +2 Mult for each held King.", "heldCard", when(c => c.card?.rank === 13, { chips: 24, mult: 2 })],
    ["Cradle Mantis", "moth", "+20 Chips and +1 Mult for each scoring 4, 6, or 8.", "scoredCard", when(c => [4, 6, 8].includes(c.card?.rank), { chips: 20, mult: 1 })],
    ["Needle Crow", "owl", "x1.18 Mult for every scoring 9.", "scoredCard", onCard("xmult", 1.18, card => card.rank === 9)],
    ["Beacon Urchin", "orb", "x1.2 Mult if a Heart scores last.", "scoredCard", onCard("xmult", 1.2, (card, c) => suited("H")(card) && c.cardIndex === scored(c) - 1)],
    ["Quarry Gull", "owl", "+70 Chips if at least one Glass card scores.", "hand", when(c => includes(c.scoring, card => card.enhancement === "glass"), { chips: 70 })],
    ["Iron Dormouse", "owl", "+4 Mult for each held Steel card.", "heldCard", onCard("mult", 4, card => card.enhancement === "steel")],
    ["Velvet Scarab", "moth", "x1.12 Mult for each held card with an edition.", "heldCard", onCard("xmult", 1.12, card => Boolean(card.edition))],
    ["Chalk Beetle", "moth", "+2 Mult per unenhanced scoring card without a seal or edition.", "scoredCard", onCard("mult", 2, card => !card.enhancement && !card.edition && !card.seal)],
    ["Citrine Spider", "potion", "+27 Chips for every sealed card that scores.", "scoredCard", onCard("chips", 27, card => Boolean(card.seal))],
    ["Mercury Skink", "dragon", "+8 Mult when you play a hand at level 3 or higher.", "hand", when(c => c.level >= 3, { mult: 8 })],
    ["Dust Telescope", "orb", "+12 Chips per hand level, up to 120 Chips.", "hand", c => ({ chips: Math.min(120, 12 * (c.level || 0)) })],
    ["Good Omen", "grimoire", "+3 Mult per familiar equipped, capped at +15 Mult.", "hand", c => ({ mult: Math.min(15, 3 * (c.ownedCount || 0)) })],
    ["Silt Phoenix", "dragon", "+3 Mult for each dollar below $12.", "hand", c => ({ mult: 3 * Math.max(0, 12 - (c.money || 0)) })],
    ["Marmalade Bat", "moth", "Earn $2 when you discard three even-numbered cards in one draw.", "discard", when(c => count(c.cards, even) >= 3, { money: 2 })],
    ["Pearl Pigeon", "owl", "Earn $2 when you clear with two or more hands remaining.", "roundEnd", when(c => c.succeeded !== false && c.handsLeft >= 2, { money: 2 })],
    ["Shopbell Sprite", "orb", "Earn $2 the first time you reroll stock in a shop.", {
      shop(c, memory) { memory.paid = false; },
      reroll(c, memory) { if (!memory.paid) { memory.paid = true; return { money: 2 }; } }
    }],
    ["Silken Broker", "key", "Refund $2 for the first booster you open each shop.", {
      shop(c, memory) { memory.paid = false; },
      packOpen(c, memory) { if (!memory.paid) { memory.paid = true; return { money: 2 }; } }
    }],
    ["Garden Almanac", "grimoire", "Create a Spell after your third discard of a blind, if there is room.", "discard", when(c => c.discardCount === 3, { generate: "spell" })],
    ["Clockwork Mage", "merlin", "Create a Constellation after every third won blind, if there is room.", {
      roundEnd(c, memory) {
        if (c.succeeded === false) return;
        memory.wins = (memory.wins || 0) + 1;
        if (every(3, memory.wins)) return { generate: "star" };
      }
    }],
    ["Tallow Idol", "orb", "+4 Mult. Gain +1 Mult when you discard exactly three cards, up to +15 more.", growth("discard", c => size(c) === 3, 1, 15, "mult", 4)],
    ["Mire Printer", "grimoire", "+22 Chips. Gain +8 Chips each time you sell something, up to +72 more.", growth("sell", () => true, 8, 72, "chips", 22)],
    ["Granite Tinker", "merlin", "+25 Chips. Gain +5 Chips for every booster opened, up to +65 more.", growth("packOpen", () => true, 5, 65, "chips", 25)],
    ["Ash Ledger", "grimoire", "+6 Mult. Gain +1 Mult every time you start a Boss Blind, up to +10 more.", growth("blindStart", c => c.blind === 2, 1, 10, "mult", 6)],
    ["Root Harp", "grimoire", "Gain +9 Chips for each blind won with a discard remaining, up to +108.", growth("roundEnd", c => c.succeeded !== false && c.discardsLeft > 0, 9, 108, "chips")],
    ["Ivy Telescope", "orb", "+17 Chips per held Ace.", "heldCard", onCard("chips", 17, card => card.rank === 14)],
    ["Hush Raven", "owl", "+40 Chips if a Queen scores and another Queen stays in your hand.", "hand", when(c => includes(c.scoring, card => card.rank === 12) && includes(c.held, card => card.rank === 12), { chips: 40 })],
    ["Glass Kestrel", "owl", "x1.45 Mult with exactly three different suits among played cards.", "hand", when(c => new Set((c.cards || []).map(card => card.suit)).size === 3, { xmult: 1.45 })],
    ["Porcelain Octopus", "potion", "+9 Mult when at least five cards remain held in hand.", "hand", when(c => held(c) >= 5, { mult: 9 })],
    ["Jasper Clock", "orb", "+12 Chips for each 5 cards missing from a 52-card deck.", "hand", c => ({ chips: 12 * Math.floor(Math.max(0, 52 - (c.deckSize || 52)) / 5) })],
    ["Quilted Elk", "owl", "+10 Mult when both played and held cards contain red and black suits.", "hand", when(c => opposite(c.cards) && opposite(c.held), { mult: 10 })]
  ]);

  register("Rare", [
    ["Porcelain Wyrm", "dragon", "Retrigger the first scoring numbered card each hand if it has an enhancement.", "scoredCard", onCard("retriggers", 1, (card, c) => c.cardIndex === 0 && numbered(card) && card.enhancement)],
    ["Wisp Weaver", "moth", "Retrigger your last scoring card when exactly three cards score.", "scoredCard", onCard("retriggers", 1, (_, c) => scored(c) === 3 && c.cardIndex === 2)],
    ["Night Scintilla", "orb", "Retrigger each held 5 with a seal.", "heldCard", onCard("retriggers", 1, card => card.rank === 5 && Boolean(card.seal))],
    ["Iridescent Loom", "grimoire", "Retrigger unenhanced scoring Aces when you have no discards left.", "scoredCard", onCard("retriggers", 1, (card, c) => card.rank === 14 && !card.enhancement && c.discardsLeft === 0)],
    ["Marble Wasp", "moth", "Retrigger the last scoring face card if it finishes your first hand.", "scoredCard", onCard("retriggers", 1, (card, c) => c.playedCount === 1 && c.cardIndex === scored(c) - 1 && face(card))],
    ["Mirror Grebe", "owl", "Copy the hand-scoring effect of the next familiar to the right on your first hand of each blind.", "hand", when(c => c.playedCount === 1, { copy: "next" })],
    ["Second Shadow", "moth", "Copy the hand-scoring effect of the familiar immediately to the left on the last hand of a blind.", "hand", when(c => c.handsLeft === 0, { copy: "previous" })],
    ["Thimble Griffin", "dragon", "x2 Mult if all scored cards are 6 or lower and at least two cards score.", "hand", when(c => scored(c) >= 2 && c.scoring.every(card => card.rank <= 6), { xmult: 2 })],
    ["Amber Magpie", "owl", "x2.25 Mult when Two Pair leaves two or more face cards in hand.", "hand", when(c => c.name === "Two Pair" && count(c.held, face) >= 2, { xmult: 2.25 })],
    ["Riddle Fox", "owl", "x2 Mult if your Straight includes both red and black scoring cards.", "hand", when(c => c.name === "Straight" && opposite(c.scoring), { xmult: 2 })],
    ["Flint Lich", "merlin", "x2 Mult when a played hand has three or more unenhanced face cards.", "hand", when(c => count(c.cards, card => face(card) && !card.enhancement) >= 3, { xmult: 2 })],
    ["Comet Imp", "moth", "x1.3 Mult for every enhanced card that scores.", "scoredCard", onCard("xmult", 1.3, card => Boolean(card.enhancement))],
    ["Rook of Glass", "orb", "x1.75 Mult when you hold two or more sealed cards.", "hand", when(c => count(c.held, card => card.seal) >= 2, { xmult: 1.75 })],
    ["Quicksilver Lynx", "potion", "x2 Mult if a card with both a seal and an edition scores.", "hand", when(c => includes(c.scoring, card => card.seal && card.edition), { xmult: 2 })],
    ["Umbral Tutor", "merlin", "x2 Mult on hand levels ending in 3, 6, or 9, or a positive multiple of 10.", "hand", when(c => c.level >= 3 && [0, 3, 6, 9].includes(c.level % 10), { xmult: 2 })],
    ["Ebon Sundial", "orb", "x2.25 Mult when the number of hands and discards left are equal.", "hand", when(c => c.handsLeft === c.discardsLeft, { xmult: 2.25 })],
    ["Sugar Locust", "moth", "x2 Mult from the second hand onward while you’ve used no discards this blind.", "hand", when(c => c.playedCount >= 2 && c.discardCount === 0, { xmult: 2 })],
    ["Dusk Undertaker", "merlin", "x2.2 Mult on the next hand after you discard five cards.", {
      discard(c, memory) { memory.ready ||= size(c) === 5; },
      hand(c, memory) { const xmult = memory.ready ? 2.2 : 1; memory.ready = false; return { xmult }; },
      blindStart(c, memory) { memory.ready = false; }
    }],
    ["Gilded Harrier", "owl", "x2 Mult when playing exactly three cards with $12–$24 in your wallet.", "hand", when(c => c.money >= 12 && c.money <= 24 && size(c) === 3, { xmult: 2 })],
    ["Leviathan Husk", "dragon", "x2 Mult when your deck holds 60 cards or more.", "hand", when(c => c.deckSize >= 60, { xmult: 2 })],
    ["Monastic Eel", "potion", "x2.25 Mult while equipped with only two or three familiars.", "hand", when(c => [2, 3].includes(c.ownedCount), { xmult: 2.25 })],
    ["Golden Mycelium", "grimoire", "Earn $5 when you win on your last hand of a blind.", "roundEnd", when(c => c.succeeded !== false && c.handsLeft === 0, { money: 5 })],
    ["Bounty Sparrow", "owl", "Earn $4 when you clear a Boss Blind without using a discard.", "roundEnd", when(c => c.succeeded !== false && c.blind === 2 && c.discardCount === 0, { money: 4 })],
    ["Specter Crown", "orb", "Create a Spectral card when you clear a Boss Blind, if there is room.", "roundEnd", when(c => c.succeeded !== false && c.blind === 2, { generate: "spectral" })],
    ["Brass Lantern", "orb", "Earn $3 and create a Spell after every second distinct shop entered, if there is room.", "shop", (c, memory) => {
      memory.shops = (memory.shops || 0) + 1;
      return every(2, memory.shops) ? { money: 3, generate: "spell" } : {};
    }],
    ["Vault Maggot", "moth", "Start at x1.1 Mult. Each paid or free reroll adds x0.15 Mult, up to x2.6.", growth("reroll", () => true, 0.15, 1.5, "xmult", 1.1)],
    ["Oracle in Amber", "merlin", "Start at x1.2 Mult. Clearing a boss with a spare hand adds x0.25 Mult, up to x3.2.", growth("roundEnd", c => c.succeeded !== false && c.blind === 2 && c.handsLeft > 0, 0.25, 2, "xmult", 1.2)],
    ["Gull in Chains", "owl", "+45 Chips. Every shop purchase adds +6 Chips, up to +90 more.", growth("buy", () => true, 6, 90, "chips", 45)],
    ["Frost Warden", "merlin", "Start at x1.15 Mult. Discarding three different suits adds x0.1 Mult, up to x2.65.", growth("discard", c => new Set((c.cards || []).map(card => card.suit)).size >= 3, 0.1, 1.5, "xmult", 1.15)]
  ]);

  register("Legendary", [
    ["Aurelia of the Eclipse", "merlin", "During Boss Blinds, the first and last cards that score each retrigger.", "scoredCard", onCard("retriggers", 1, (_, c) => c.blind === 2 && (c.cardIndex === 0 || c.cardIndex === scored(c) - 1))],
    ["The Orchard Below", "grimoire", "Each red card held gives x1.18 Mult while a black card scores. Each black card held does the same while a red card scores.", "heldCard", onCard("xmult", 1.18, (card, c) => (red(card) && includes(c.scoring, black)) || (black(card) && includes(c.scoring, red)))],
    ["Saffron, Keeper of Doors", "key", "Starts at x1.4 Mult. Gain x0.25 Mult each time you start a Boss Blind, up to x3.9.", growth("blindStart", c => c.blind === 2, 0.25, 2.5, "xmult", 1.4)],
    ["Ravel the Weaver", "moth", "Copies the hand-scoring effect of its left neighbor on odd hands and its right neighbor on even hands.", "hand", c => ({ copy: c.playedCount % 2 ? "previous" : "next" })],
    ["Nacre, Sea of Stars", "dragon", "Every scoring card on a hand of level 4 or more adds x1.18 Mult. Create a Constellation whenever you clear a blind, if there is room.", {
      scoredCard: onCard("xmult", 1.18, (_, c) => c.level >= 4),
      roundEnd: when(c => c.succeeded !== false, { generate: "star" })
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
