// Original decks, difficulty rules, trials, bosses and rewards for Card Wizard.
(function (root) {
  "use strict";

  const suits = ["S", "H", "C", "D"];
  const ranks = Array.from({ length: 13 }, (_, index) => index + 2);

  function composition(countCopies) {
    return suits.flatMap(suit => ranks.flatMap(rank => {
      const copies = countCopies(suit, rank);
      return copies ? [{ suit, rank, copies }] : [];
    }));
  }

  const form = (handSize, hands, discards, money, starter, extra = {}) => ({
    handSize, hands, discards, money, starter, ...extra
  });

  const courts = composition((_, rank) => rank >= 11 ? 2 : Number(rank >= 9));
  const clubs = composition((suit, rank) => {
    if (suit === "C") return 2;
    if (suit === "H") return 1;
    return Number(rank % 2 === 0);
  });
  const cinders = composition((suit, rank) => {
    if (rank <= 5) return 0;
    return rank <= 10 && (suit === "H" || suit === "D") ? 2 : 1;
  });
  const orchard = composition((_, rank) => rank <= 7 ? 2 : Number(rank === 8 || rank === 14));
  const forged = composition((suit, rank) => Number(suit === "C" || suit === "S" || rank > 4));
  const prism = composition((suit, rank) => {
    // Each suit favors a different span, with two overlapping ranks at each seam.
    const starts = { S: 2, H: 5, C: 8, D: 10 };
    const start = starts[suit];
    return Number(rank >= start && rank <= start + 5) + Number(rank % 2 === 0);
  });
  const mosaic = composition((suit, rank) => {
    // This pattern puts matching ranks on either opposing or adjacent suits.
    const suitIndex = suits.indexOf(suit);
    const anchor = (rank - 2) % suits.length;
    const partner = rank % 2 === 0 ? (anchor + 2) % suits.length : (anchor + 1) % suits.length;
    return suitIndex === anchor || suitIndex === partner ? 2 : 0;
  });
  const moonlit = composition((suit, rank) => {
    if (rank === 7 || rank === 8 || rank === 9) return suit === "S" ? 3 : 1;
    return Number(rank !== 4 && rank !== 5);
  });

  const decks = {
    gossip: {
      name: "Court Gossip",
      description: "Only 9s and up, with doubled Jacks through Aces. Hold 7 cards. Royal Reader replaces Merlin once unlocked.",
      ...form(7, 4, 3, 5, ["royal_reader"], { composition: courts }),
      unlock: { bestAnte: 2 }, unlockText: "Reach Ante 2."
    },
    thornmail: {
      name: "Thornmail",
      description: "Double Clubs, full Hearts and sparse Spades and Diamonds. Start with Thornwing and 2 discards.",
      ...form(8, 4, 2, 4, ["thornwing"], { composition: clubs }),
      unlock: { bestAnte: 2 }, unlockText: "Reach Ante 2."
    },
    cinder: {
      name: "Cinderwright",
      description: "No 2s through 5s. Double the red 6s through 10s and begin with Ember Moth.",
      ...form(8, 4, 3, 4, ["ember_moth"], { composition: cinders }),
      unlock: { bestAnte: 3 }, unlockText: "Reach Ante 3."
    },
    mosaic: {
      name: "Mosaic",
      description: "Each rank has two matching copies in two suits. Begin with Two Pair at level 2 and Twin Lights.",
      ...form(8, 4, 3, 3, ["twin_lights"], { composition: mosaic, handLevels: { "Two Pair": 2 } }),
      unlock: { bestAnte: 4 }, unlockText: "Reach Ante 4."
    },
    orchard: {
      name: "Moon Orchard",
      description: "Double the 2s through 7s. Aces and 8s fill out the rest. Begin with Mooncalf and 2 discards.",
      ...form(8, 4, 2, 3, ["mooncalf"], { composition: orchard }),
      unlock: { bestAnte: 3 }, unlockText: "Reach Ante 3."
    },
    inkbound: {
      name: "Inkbound",
      description: "Straights and Straight Flushes start at level 2. Begin with Dust Scribe, $3 and only 3 hands.",
      ...form(8, 3, 4, 3, ["dust_scribe"], { handLevels: { Straight: 2, "Straight Flush": 2 } }),
      unlock: { bestAnte: 5 }, unlockText: "Reach Ante 5."
    },
    vault: {
      name: "Vault Charter",
      description: "Start with $12, Vault Watcher and Treasury Seal. Play with 3 hands and 2 discards.",
      ...form(8, 3, 2, 12, ["vault_watcher"], { startingVouchers: ["deep_pockets"] }),
      unlock: { bestAnte: 6 }, unlockText: "Reach Ante 6."
    },
    forge: {
      name: "Paper Forge",
      description: "A 46-card deck with no low Hearts or Diamonds. Begin with Paper King and only 1 discard.",
      ...form(8, 4, 1, 2, ["paper_king"], { composition: forged }),
      unlock: { wins: 1 }, unlockText: "Win a run."
    },
    hush: {
      name: "Hushwood",
      description: "Start without a Familiar. Hold 10 cards and get 4 discards, $7 and only 3 hands.",
      ...form(10, 3, 4, 7, []),
      unlock: { bestAnte: 4 }, unlockText: "Reach Ante 4."
    },
    emberchain: {
      name: "Emberchain",
      description: "Begin with Last Leaf and 5 hands. Hold 7 cards and get only 1 discard per blind.",
      ...form(7, 5, 1, 4, ["last_leaf"]),
      unlock: { bestAnte: 5 }, unlockText: "Reach Ante 5."
    },
    moonlace: {
      name: "Moonlace",
      description: "Extra Spade 7s, 8s and 9s, and no 4s or 5s. Begin with Night Owl, Ascend and $2.",
      ...form(8, 4, 3, 2, ["night_owl"], { composition: moonlit, startingConsumables: ["ascend"] }),
      unlock: { wins: 2 }, unlockText: "Win 2 runs."
    },
    prism: {
      name: "Prism Archive",
      description: "Gain +1 Mult per 30 Chips, up to +8. Each suit favors a different rank range. Play with 3 hands and +8% blind targets. Opal Owl replaces Merlin once unlocked.",
      ...form(8, 3, 3, 4, ["opal_owl"], { composition: prism, chipToMult: 30, targetScale: 1.08 }),
      unlock: { wins: 3 }, unlockText: "Win 3 runs."
    }
  };

  const stakes = {
    ember: {
      name: "Ember", description: "Standard scores and rewards.",
      targetScale: 1, ante1Scale: 1, discards: 0, rewardReduction: 0, eternal: 0, perishable: 0, rental: 0
    },
    copper: {
      name: "Copper", description: "Targets rise 6% (gentler in Ante 1). Small Blinds pay $1 less.",
      targetScale: 1.06, ante1Scale: 1.02, discards: 0, rewardReduction: 1, eternal: 0, perishable: 0, rental: 0
    },
    verdigris: {
      name: "Verdigris", description: "Targets rise 15% (gentler in Ante 1). Small Blinds pay $1 less.",
      targetScale: 1.15, ante1Scale: 1.05, discards: 0, rewardReduction: 1, eternal: 0, perishable: 0, rental: 0
    },
    obsidian: {
      name: "Obsidian", description: "Targets rise 24% (gentler in Ante 1). Small Blinds pay $1 less. Some shop Familiars are Eternal.",
      targetScale: 1.24, ante1Scale: 1.08, discards: 0, rewardReduction: 1, eternal: 0.2, perishable: 0, rental: 0
    },
    cobalt: {
      name: "Cobalt", description: "Targets rise 32% (gentler in Ante 1). Small Blinds pay $1 less. Eternal Familiars appear and each blind gives 1 fewer discard.",
      targetScale: 1.32, ante1Scale: 1.12, discards: -1, rewardReduction: 1, eternal: 0.2, perishable: 0, rental: 0
    },
    amethyst: {
      name: "Amethyst", description: "Targets rise 48% (gentler in Ante 1). Small Blinds pay $2 less. Eternal and Perishable Familiars appear, with 1 fewer discard per blind.",
      targetScale: 1.48, ante1Scale: 1.18, discards: -1, rewardReduction: 2, eternal: 0.2, perishable: 0.16, rental: 0
    },
    amber: {
      name: "Amber", description: "Targets rise 62% (gentler in Ante 1). Small Blinds pay $2 less. Eternal, Perishable and Rental Familiars appear, with 1 fewer discard per blind.",
      targetScale: 1.62, ante1Scale: 1.24, discards: -1, rewardReduction: 2, eternal: 0.2, perishable: 0.16, rental: 0.14
    },
    blackstar: {
      name: "Blackstar", description: "Targets rise 80% (gentler in Ante 1). Small Blinds give no base payout. More Familiars have upkeep or restrictions, and each blind gives 1 fewer discard.",
      targetScale: 1.8, ante1Scale: 1.3, discards: -1, rewardReduction: 3, eternal: 0.24, perishable: 0.2, rental: 0.2
    }
  };

  const omen = (name, description, rule, value, minAnte, extras = {}) => ({
    name, description, rule, value, minAnte, ...extras
  });
  const finale = (name, description, rule, value, scale) =>
    omen(name, description, rule, value, 1, { scale, final: true });

  const bosses = {
    quiet_bell: omen("The Quiet Bell", "Play at most 4 cards at a time.", "capCards", 4, 2),
    paper_door: omen("The Paper Door", "Play at least 3 cards at a time.", "minCards", 3, 1),
    inkspout: omen("The Inkspout", "Your opening hand earns half its usual Chips.", "firstHand", 0.5, 1),
    echo_chamber: omen("The Echo Chamber", "Each hand type can score twice this blind.", "uniqueHands", 2, 3),
    hollow_crown: omen("The Hollow Crown", "Your leftmost Familiar falls silent.", "noJokers", 1, 3),
    sandglass: omen("The Sandglass", "The first scoring card earns no Chips from its rank.", "noCardChips", 1, 1),
    copper_fog: omen("The Copper Fog", "The first two scoring cards lose their enhancement bonuses this hand.", "noEnhancements", 2, 3),
    turnstile: omen("The Turnstile", "Hold 2 fewer cards throughout this blind.", "reduceHand", 2, 4),
    silver_bolt: omen("The Silver Bolt", "Play 1 fewer hand during this blind.", "reduceHands", 1, 4),
    tollkeeper: omen("The Tollkeeper", "Each discard costs up to $2 from your wallet.", "taxDiscard", 2, 2),
    dust_lantern: omen("The Dust Lantern", "Each hand keeps 70% of its total Chips.", "halveChips", 0.7, 3),
    twilight_prism: omen("The Twilight Prism", "Each hand keeps 65% of its total Mult.", "halveMult", 0.65, 4),
    open_circuit: omen("The Open Circuit", "Your first discard spends up to 2 discard uses.", "firstDiscard", 2, 2),
    sunk_clock: omen("The Sunk Clock", "Your first two plays lose up to 30 Chips each.", "slowStart", 30, 2),
    starwell: finale("The Starwell", "A larger target, with 1 fewer hand to reach it.", "reduceHands", 1, 2.3),
    braided_seal: finale("The Braided Seal", "Each hand type can score once this blind.", "uniqueHands", 1, 2.2),
    candle_eater: finale("The Candle Eater", "Your two leftmost Familiars fall silent.", "noJokers", 2, 2.1),
    frost_refinery: finale("The Frost Refinery", "Scoring cards lose their enhancement bonuses this blind.", "noEnhancements", 5, 2.3)
  };

  const reward = (name, description, effect, value) => ({ name, description, effect, value });
  const lesson = (name, description, hand, levels) => reward(name, description, "handLevel", { hand, levels });

  const tags = {
    copper_satchel: reward("Copper Satchel", "Collect $4 now.", "cash", 4),
    silver_reserve: reward("Silver Reserve", "Collect $11 now.", "cash", 11),
    payment_due: reward("Payment Due", "Add $5 to your next payout.", "bonus", 5),
    distant_bounty: reward("Distant Bounty", "Add $12 to your next payout.", "bonus", 12),
    pocket_hatchling: reward("Pocket Hatchling", "A free Familiar Egg in your next shop.", "pack", "familiar_egg"),
    backroom: reward("Backroom Bargain", "Get 30% off in your next shop.", "shopDiscount", 0.7),
    replay_note: lesson("Replay Note", "Raise your most-played hand by 2 levels.", "mostPlayed", 2),
    solo_recital: lesson("Solo Recital", "Raise High Card by 2 levels.", "High Card", 2),
    twin_recital: lesson("Twin Recital", "Raise Pair by 2 levels.", "Pair", 2),
    suit_recital: lesson("Suit Recital", "Raise Flush by 2 levels.", "Flush", 2),
    second_script: reward("Second Script", "Get 1 extra hand in your next played blind.", "nextHands", 1),
    open_well: reward("Open Well", "Get 2 extra discards in your next played blind.", "nextDiscards", 2),
    widening: reward("Widening", "Hold 1 extra card in your next played blind.", "nextHandSize", 1),
    change_order: reward("Change Order", "Get a free boss reroll.", "bossReroll", true),
    moon_parcel: reward("Moon Parcel", "A free Star Chart in your next shop.", "pack", "star_chart"),
    green_parcel: reward("Green Parcel", "A free Scroll Case in your next shop.", "pack", "scroll_case"),
    gilded_parcel: reward("Gilded Parcel", "A free Traveler's Pack in your next shop.", "pack", "travelers_pack"),
    foil_dust: reward("Foil Dust", "A random Familiar without an edition becomes Foil. If none qualify, the next editionless Familiar you gain becomes Foil.", "edition", "foil"),
    rainbow_dust: reward("Rainbow Dust", "A random Familiar without an edition becomes Polychrome. If none qualify, the next editionless Familiar you gain becomes Polychrome.", "edition", "polychrome")
  };

  function trial(name, description, deck, rules, stake = "ember", unlock = { bestAnte: 3 }) {
    return { name, description, deck, stake, rules, unlock };
  }

  const challenges = {
    quiet_study: trial("Quiet Study", "Start without a Familiar. Limit your circle to 3 Familiars and carry only 1 spell.", "arcane",
      { starter: [], familiarCap: 3, consumableCap: 1 }),
    last_petal: trial("Last Petal", "Play with only 2 hands and 5 discards per blind. Shops cannot reroll.", "arcane",
      { hands: 2, discards: 5, noReroll: true, starter: ["tidal_lens", "merlin"], handLevels: { Flush: 2 } }),
    short_ledger: trial("Short Ledger", "Start with $0 and never earn interest. Alchemy begins in your spell slot.", "alchemist",
      { money: 0, noInterest: true, startingConsumables: ["alchemy"], hands: 4 }),
    fire_drill: trial("Fire Drill", "Beat 5 antes with 6 hands and no discards. Start with Last Leaf and Cold Reader.", "emberchain",
      { hands: 6, discards: 0, anteLimit: 5, starter: ["last_leaf", "cold_reader"] }),
    white_bell: trial("White Bell", "Play each blind and take each initial shop display as it comes.", "arcane",
      { noSkip: true, noReroll: true, starter: ["merlin", "paper_king"] }),
    double_exposure: trial("Double Exposure", "Start with a doubled-rank deck and a level 4 Pair. Only 2 Familiars fit.", "mosaic",
      { handLevels: { Pair: 4 }, familiarCap: 2, starter: ["twin_lights", "echo_book"] }),
    guild_trial: trial("Guild Trial", "Fill just 3 Familiar slots. Start with 2 Familiars and finish on Verdigris.", "arcane",
      { starter: ["cold_reader", "folio"], familiarCap: 3, money: 7 }, "verdigris"),
    blue_hour: trial("The Blue Hour", "Start with Sapphire Ink and Iron Skin. Clear six antes with 2 Familiar slots.", "oracle",
      { consumableCap: 2, startingConsumables: ["blue_ink", "iron_skin"], familiarCap: 2, anteLimit: 6 }),
    untouchable: trial("Untouchable", "Hold 6 cards. Start with the Quiet Court and upgraded High Card, but carry no spells.", "gossip",
      { handSize: 6, consumableCap: 0, starter: ["quiet_court", "merlin"], handLevels: { "High Card": 3 } }),
    second_shift: trial("Second Shift", "Take every blind with 3 hands and 2 Familiar slots. Start with an extra $4.", "arcane",
      { noSkip: true, hands: 3, familiarCap: 2, money: 8, starter: ["merlin", "tower_oracle"] }, "copper"),
    no_change: trial("No Change Back", "Start with $16. Shop rerolls and interest are disabled. Your circle holds 3 Familiars.", "vault",
      { noInterest: true, noReroll: true, familiarCap: 3, money: 16, startingVouchers: [] }),
    ninth_chair: trial("The Ninth Chair", "Hold 9 cards with 2 hands per blind. Begin with Merlin, Vesper and Cold Reader.", "oracle",
      { hands: 2, discards: 4, starter: ["merlin", "vesper", "cold_reader"] }),
    narrow_gate: trial("The Narrow Gate", "Play with 6 held cards, 2 discards, one spell slot and a level 3 Straight.", "inkbound",
      { handSize: 6, discards: 2, handLevels: { Straight: 3 }, consumableCap: 1, hands: 5 }),
    paper_guard: trial("Paper Guard", "Begin with a 46-card deck and no redraws. Gain 5 hands and use Unwrite to cut further.", "forge",
      { discards: 0, hands: 5, starter: ["merlin", "paper_king"], startingConsumables: ["unwrite"] }, "copper"),
    estate_sale: trial("Estate Sale", "Start with three Familiars, $1 and a cheaper shop. Interest is disabled.", "arcane",
      { starter: ["night_owl", "empty_inkwell", "folio"], money: 1, noInterest: true, startingVouchers: ["silver_tongue"] }, "obsidian", { wins: 1 }),
    hearthwatch: trial("Hearthwatch", "Start with level 3 Flush, two Heart Familiars, and 3 Familiar slots. Every blind must be played.", "cinder",
      { noSkip: true, starter: ["ember_moth", "carmine_crab"], handLevels: { Flush: 3 }, familiarCap: 3 }, "cobalt", { wins: 1 }),
    small_coven: trial("The Small Coven", "Start with The Coven filling one of just 2 Familiar slots. No rerolls, but use 5 hands.", "arcane",
      { familiarCap: 2, noReroll: true, hands: 5, starter: ["coven"], money: 8 }, "obsidian", { wins: 1 }),
    little_kingdom: trial("Little Kingdom", "Play with 46 cards and only 5 held cards. Start with level 4 Three of a Kind.", "forge",
      { handSize: 5, hands: 5, discards: 4, handLevels: { "Three of a Kind": 4 }, starter: ["paper_king", "many_minds"] }, "ember", { wins: 1 }),
    open_suit: trial("Open Suit", "Start with a Prism Archive and two suit-changing spells. Use at most 3 Familiars.", "prism",
      { familiarCap: 3, hands: 4, startingConsumables: ["heartfire", "thorncall"], starter: ["opal_owl", "prism_wing"] }, "amethyst", { wins: 1 }),
    final_circuit: trial("The Final Circuit", "Face Amber with no skips, rerolls or interest. A strong starting circle helps pay the price.", "arcane",
      { noSkip: true, noReroll: true, noInterest: true, hands: 5, money: 8, starter: ["merlin", "tower_oracle", "star_eater"], handLevels: { Pair: 3 } }, "amber", { wins: 2 })
  };

  const api = { decks, stakes, bosses, tags, challenges };
  root.CWCatalog = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
