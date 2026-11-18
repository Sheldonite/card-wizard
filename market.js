(function (root) {
  "use strict";

  const colors = {orb:"#8cc9ee", grimoire:"#b6c883", dragon:"#eea581", key:"#e3bc73", potion:"#99dfc3", moth:"#f49aaa", owl:"#efc577", merlin:"#ab89eb"};
  const icons = {orb:"✦", grimoire:"▤", dragon:"▲", key:"◆", potion:"✚", moth:"◇", owl:"◉", merlin:"✷"};
  const cards = {};
  const upgrades = {};
  const boosters = {};

  function define(catalog, kind, id, name, art, cost, rarity, description, details) {
    catalog[id] = {id, name, kind, cost, rarity, description, art, icon:icons[art], color:colors[art], ...details};
  }

  function spell(id, name, art, description, effect, value, minTargets = 0, maxTargets = minTargets) {
    define(cards, "spell", id, name, art, 3, "Spell", description, {effect, value, minTargets, maxTargets, pool:"spell"});
  }

  function spectral(id, name, art, description, effect, value, minTargets = 0, maxTargets = minTargets) {
    define(cards, "spell", id, name, art, 5, "Spectral", description, {effect, value, minTargets, maxTargets, pool:"spectral"});
  }

  spell("prism_dye", "Prism Dye", "orb", "Make up to 2 cards Wild. Each can match any suit.", "enhance", "wild", 1, 2);
  spell("basalt_imprint", "Basalt Imprint", "grimoire", "Make 1 card Stone. It always scores +40 Chips and has no rank or suit.", "enhance", "stone", 1);
  spell("sunwash", "Sunwash", "potion", "Make 1 card Gold. Earn $2 if it stays in hand when a blind ends.", "enhance", "gold", 1);
  spell("rabbit_chalk", "Rabbit Chalk", "moth", "Make up to 2 cards Lucky. Each can roll +12 Mult or $8 when scored.", "enhance", "lucky", 1, 2);
  spell("market_favor", "Market Favor", "key", "Gain $6.", "cash", 6);
  spell("turnback", "Turnback", "potion", "Lower up to 2 ranks by one. A 2 becomes an Ace.", "rank", -1, 1, 2);
  spell("rank_stencil", "Rank Stencil", "grimoire", "Set the rank of the second chosen card to match the first.", "rankCopy", null, 2);
  spell("quarter_turn", "Quarter Turn", "moth", "Advance up to 3 suits in order: ♠ → ♥ → ♣ → ♦.", "suitRotate", 1, 1, 3);
  spell("rehearsal", "Rehearsal", "orb", "Raise your most-played hand by one level.", "levelMost", 1);
  spell("split_scroll", "Split Scroll", "grimoire", "Conjure up to 2 random spells if you have room.", "generate", {pool:"spell", count:2});

  spectral("sanguine_wax", "Sanguine Wax", "moth", "Mark 1 card with a Red Seal. It repeats its card effects.", "seal", "red", 1);
  spectral("coin_stamp", "Coin Stamp", "key", "Mark 1 card with a Gold Seal. Earn $3 each time it scores.", "seal", "gold", 1);
  spectral("winter_stamp", "Winter Stamp", "orb", "Mark 1 card with a Blue Seal. Hold it through a win to conjure the last hand's constellation.", "seal", "blue", 1);
  spectral("violet_post", "Violet Post", "grimoire", "Mark 1 card with a Purple Seal. Conjure a spell when it is discarded.", "seal", "purple", 1);
  spectral("silver_beam", "Silver Beam", "orb", "Make up to 2 cards Foil. Each adds +50 Chips when scored.", "edition", "foil", 1, 2);
  spectral("shimmer_cut", "Shimmer Cut", "moth", "Make 1 card Holographic. It adds +10 Mult when scored.", "edition", "holographic", 1);
  spectral("dawn_fracture", "Dawn Fracture", "dragon", "Make 1 card Polychrome. It gives ×1.5 Mult when scored.", "edition", "polychrome", 1);
  spectral("old_name", "The Old Name", "merlin", "Summon a Legendary Familiar if you have room.", "generate", {pool:"legendary", count:1});
  spectral("hollow_scroll", "Hollow Scroll", "grimoire", "Make another carried spell Negative. It opens one spell slot.", "inventoryEdition", {kind:"spell", edition:"negative"});
  spectral("midnight_collar", "Midnight Collar", "dragon", "Make one eligible Familiar Negative. It opens one Familiar slot.", "inventoryEdition", {kind:"familiar", edition:"negative"});
  spectral("paper_swarm", "Paper Swarm", "moth", "Add 2 copies of a chosen card to your deck.", "copy", 2, 1);
  spectral("mantle_exchange", "Mantle Exchange", "grimoire", "Swap the enhancements, seals, and editions of 2 cards.", "swapModifiers", null, 2);
  spectral("buried_tithe", "Buried Tithe", "key", "Gain $12.", "cash", 12);
  spectral("cornerstone", "Cornerstone", "potion", "Make 1 card a Stone 2 with a Red Seal.", "modify", {rank:2, enhancement:"stone", seal:"red"}, 1);
  spectral("quiet_ash", "Quiet Ash", "potion", "Remove up to 3 cards from your deck.", "remove", null, 1, 3);
  spectral("threefold_moon", "Threefold Moon", "orb", "Raise Pair, Three of a Kind, and Full House by one level each.", "levelMany", {hands:["Pair", "Three of a Kind", "Full House"], amount:1});
  spectral("silence_bell", "Silence Bell", "key", "Silence the current or upcoming boss's special rule.", "bossDisable", 1);
  spectral("jackpot_comet", "Jackpot Comet", "dragon", "Turn 1 card into a Lucky Ace with a Purple Seal.", "modify", {rank:14, enhancement:"lucky", seal:"purple"}, 1);

  function voucher(id, name, description, power, requires = null, unlock = null) {
    define(upgrades, "voucher", id, name, "key", requires ? 13 : 9, "Voucher", description,
      {effect:id, power, value:Object.values(power)[0], requires, unlock});
  }

  voucher("sealed_reserve", "Sealed Reserve", "Raise your interest limit by another $5.", {interestCap:5}, "deep_pockets");
  voucher("sky_sleeve", "Sky Sleeve", "Hold 1 more card every blind.", {handSize:1}, "long_sleeve");
  voucher("third_wind", "Third Wind", "Gain 1 more discard every blind.", {discards:1}, "second_wind");
  voucher("borrowed_tomorrow", "Borrowed Tomorrow", "Gain 1 more hand every blind.", {hands:1}, "extra_turn");
  voucher("wayfarers_license", "Wayfarer's License", "First paid reroll costs $1 less.", {rerollDiscount:1}, "trade_route");
  voucher("moon_market", "Moon Market", "Bring your shop discount from 20% to 35%.", {discount:0.15}, "silver_tongue");
  voucher("grand_menagerie", "Grand Menagerie", "Equip 1 more Familiar.", {familiarSlots:1}, "menagerie", "first_victory");
  voucher("counter_extension", "Counter Extension", "Shops display 1 more card.", {shopSlots:1});
  voucher("night_bazaar", "Night Bazaar", "Shops display 1 more card.", {shopSlots:1}, "counter_extension");
  voucher("hidden_shelf", "Hidden Shelf", "Carry 1 more consumable.", {spellSlots:1});
  voucher("folding_archive", "Folding Archive", "Carry 1 more consumable.", {spellSlots:1}, "hidden_shelf", "deckwright");
  voucher("omen_license", "Omen License", "Pay $10 to reroll the boss once per ante.", {bossRerolls:1}, null, "boss_broken");
  voucher("council_edict", "Council Edict", "Reroll the boss again and pay to silence its rule once per ante.", {bossRerolls:1, bossDisables:1}, "omen_license");
  voucher("parcel_stamps", "Parcel Stamps", "Booster packs cost $1 less.", {packDiscount:1});
  voucher("wholesale_pact", "Wholesale Pact", "Booster packs cost another $1 less.", {packDiscount:1}, "parcel_stamps");
  voucher("star_index", "Star Index", "Constellations show up more often in the shop.", {stockStars:4});
  voucher("glass_observatory", "Glass Observatory", "Constellations show up even more often.", {stockStars:6}, "star_index");
  voucher("scroll_routes", "Scroll Routes", "Spells show up more often in the shop.", {stockSpells:4});
  voucher("ghost_routes", "Ghost Routes", "Spells are more common. Spectral cards can now appear in stock.", {stockSpells:4, stockSpectral:3}, "scroll_routes", "second_circle");
  voucher("savings_bond", "Savings Bond", "Earn interest for every $4 held, down from $5.", {interestDiscount:1});
  voucher("silver_ledger", "Silver Ledger", "Earn interest for every $3 held, down from $4.", {interestDiscount:1}, "savings_bond", "small_fortune");
  voucher("lamplight", "Lamplight", "Editions show up more often on shop and pack cards.", {editionChance:0.05});
  voucher("refraction_lens", "Refraction Lens", "Shop and pack editions become even more common.", {editionChance:0.08}, "lamplight");
  voucher("loose_wrapping", "Loose Wrapping", "Opened booster packs show 1 more option.", {packOptions:1});
  voucher("open_crate", "Open Crate", "Packs show another option. Playing cards can appear in stock.", {packOptions:1, cardStock:3}, "loose_wrapping");

  function pack(id, name, art, pool, choices, picks, tier, cost, reward) {
    const description = "Choose " + picks + " of " + choices + " " + reward + ".";
    define(boosters, "pack", id, name, art, cost, "Booster", description, {pool, choices, picks, tier});
  }

  pack("travelers_satchel", "Traveler's Satchel", "grimoire", "standard", 4, 1, 1, 6, "playing cards");
  pack("travelers_trunk", "Traveler's Trunk", "grimoire", "standard", 5, 2, 2, 8, "playing cards");
  pack("scroll_chest", "Scroll Chest", "grimoire", "spell", 4, 1, 1, 6, "spells to cast");
  pack("scroll_vault", "Scroll Vault", "grimoire", "spell", 5, 2, 2, 8, "spells to cast");
  pack("star_atlas", "Star Atlas", "orb", "star", 4, 1, 1, 6, "constellations");
  pack("star_archive", "Star Archive", "orb", "star", 5, 2, 2, 8, "constellations");
  pack("familiar_nest", "Familiar Nest", "owl", "familiar", 4, 1, 1, 7, "Familiars");
  pack("familiar_roost", "Familiar Roost", "owl", "familiar", 5, 2, 2, 9, "Familiars");
  pack("veil_fragment", "Veil Fragment", "dragon", "spectral", 3, 1, 0, 5, "Spectral spells to cast");
  pack("veil_casket", "Veil Casket", "dragon", "spectral", 4, 1, 1, 7, "Spectral spells to cast");
  pack("veil_rift", "Veil Rift", "dragon", "spectral", 5, 2, 2, 9, "Spectral spells to cast");

  const enhancements = {
    bonus:{name:"Bonus", description:"+30 Chips when scored."},
    mult:{name:"Mult", description:"+4 Mult when scored."},
    glass:{name:"Glass", description:"×2 Mult when scored. Has a 1 in 4 chance to break after scoring."},
    steel:{name:"Steel", description:"×1.5 Mult when held during scoring."},
    wild:{name:"Wild", description:"Can match any suit."},
    stone:{name:"Stone", description:"Always scores +40 Chips. It has no rank or suit."},
    gold:{name:"Gold", description:"Earn $2 when held at the end of a winning blind."},
    lucky:{name:"Lucky", description:"When scored, independently rolls a 20% chance for +12 Mult and a 12% chance for $8."}
  };

  const seals = {
    red:{name:"Red Seal", description:"Repeat this card's own scoring or held effect."},
    gold:{name:"Gold Seal", description:"Earn $3 each time this card scores."},
    blue:{name:"Blue Seal", description:"Keep this in hand to conjure the last hand's constellation after a win."},
    purple:{name:"Purple Seal", description:"Conjure a spell when this card is discarded."}
  };

  const editions = {
    foil:{name:"Foil", description:"+50 Chips.", kinds:["card", "familiar"], chips:50, premium:2},
    holographic:{name:"Holographic", description:"+10 Mult.", kinds:["card", "familiar"], mult:10, premium:3},
    polychrome:{name:"Polychrome", description:"×1.5 Mult.", kinds:["card", "familiar"], xmult:1.5, premium:4},
    negative:{name:"Negative", description:"+1 inventory slot for this item's type.", kinds:["familiar", "spell"], slots:1, premium:4}
  };

  const stickers = {
    eternal:{name:"Eternal", description:"It cannot be sold."},
    perishable:{name:"Perishable", description:"It stops working after 5 winning blinds."},
    rental:{name:"Rental", description:"Costs $3 per winning blind."}
  };

  function splitVariant(ref) {
    const [id, edition, sticker] = String(typeof ref === "object" ? ref?.id || "" : ref || "").split("~");
    return {id, edition:edition || null, sticker:sticker || null};
  }

  function withVariant(id, edition, sticker) {
    if (sticker) return id + "~" + (edition || "") + "~" + sticker;
    return edition ? id + "~" + edition : id;
  }

  function voucherPower(s, key) {
    return (s.vouchers || []).reduce((amount, id) => amount + (upgrades[id]?.power[key] || 0), 0);
  }

  const power = (s, key, api) => api.power ? api.power(s, key) : voucherPower(s, key);

  function weighted(s, values, random) {
    let roll = random(s) * values.reduce((total, row) => total + row[1], 0);
    for (const [value, weight] of values) {
      roll -= weight;
      if (roll < 0) return value;
    }
    return values.at(-1)?.[0] || null;
  }

  function variant(s, ref, kind, api) {
    if (!ref || (kind !== "familiar" && kind !== "spell")) return ref;
    const data = splitVariant(ref);
    const chance = power(s, "editionChance", api);
    if (!data.edition) {
      const pool = kind === "familiar"
        ? [["negative", 0.009], ["polychrome", 0.014], ["holographic", 0.024], ["foil", 0.037]]
        : [["negative", 0.006]];
      let roll = api.random(s);
      const chancePerEdition = chance / pool.length;
      for (const [name, weight] of pool) {
        roll -= weight + chancePerEdition;
        if (roll >= 0) continue;
        data.edition = name;
        break;
      }
    }
    if (kind === "familiar" && !data.sticker) {
      const rules = s.rules || {};
      const pool = Object.keys(stickers).filter(name => rules[name]);
      if (pool.length) {
        let roll = api.random(s);
        for (const name of pool) {
          roll -= rules[name] === true ? 0.2 : Number(rules[name]);
          if (roll >= 0) continue;
          data.sticker = name;
          break;
        }
      }
    }
    return withVariant(data.id, data.edition, data.sticker);
  }

  function cardRef(s, api, excluded = []) {
    const suits = Array.isArray(api.suits) ? api.suits : Object.keys(api.suits || {S:1, H:1, C:1, D:1});
    const modifiers = ["plain", "plain", "plain", ...Object.keys(enhancements)];
    const editionBonus = power(s, "editionChance", api);
    for (let attempt = 0; attempt < 20; attempt++) {
      const enhancement = api.choose(s, modifiers);
      const edition = weighted(s, [["polychrome", 0.018 + editionBonus / 3], ["holographic", 0.04 + editionBonus / 3],
        ["foil", 0.07 + editionBonus / 3], ["", 0.872 - editionBonus]], api.random);
      const seal = weighted(s, [["red", 0.03], ["gold", 0.035], ["blue", 0.029], ["purple", 0.026], ["", 0.88]], api.random);
      const ref = ["card", api.choose(s, suits), 2 + Math.floor(api.random(s) * 13), enhancement, edition, seal].filter(Boolean).join("_");
      if (!excluded.includes(ref)) return ref;
    }
    return null;
  }

  function spellChoices(s, pool, api) {
    return api.spellPool(s, pool).map(entry => typeof entry === "string" ? entry : entry.id);
  }

  function stock(s, api) {
    const rules = s.rules || {};
    const count = s.shopOfferCount || 2 + power(s, "shopSlots", api);
    const weights = [["familiar", rules.noFamiliars ? 0 : 21]];
    if (!rules.noSpells) {
      weights.push(["star", 5 + power(s, "stockStars", api)], ["spell", 6 + power(s, "stockSpells", api)],
        ["spectral", (Number(rules.spectralShop) || 0) + power(s, "stockSpectral", api)]);
    }
    weights.push(["standard", Math.max(0, Number(rules.cardStock) || 0) + power(s, "cardStock", api)]);
    const offers = [];
    for (let i = 0; i < count; i++) {
      const types = weights.filter(row => row[1] > 0);
      const blocked = offers.filter(Boolean).map(ref => splitVariant(ref).id);
      let ref = null;
      while (types.length && !ref) {
        const pool = weighted(s, types, api.random);
        types.splice(types.findIndex(row => row[0] === pool), 1);
        if (pool === "familiar") ref = variant(s, api.randomFamiliar(s, blocked), "familiar", api);
        else if (pool === "standard") ref = cardRef(s, api, blocked);
        else {
          const options = spellChoices(s, pool, api).filter(id => !blocked.includes(id));
          if (options.length) ref = variant(s, api.choose(s, options), "spell", api);
        }
      }
      offers.push(ref);
    }
    return offers;
  }

  function packsForShop(s, api) {
    const rules = s.rules || {};
    const options = Object.values({...api.packs, ...boosters}).filter(def => {
      if (def.pool === "familiar") return !rules.noFamiliars;
      return def.pool === "standard" || !rules.noSpells;
    });
    const first = !s.shopsVisited ? options.find(def => def.id === "familiar_egg") : null;
    const def = first || weighted(s, options.map(p => [p, [9, 3, 1][p.tier || 0]]), api.random);
    const rest = options.filter(p => p.pool !== def?.pool);
    const other = weighted(s, (rest.length ? rest : options.filter(p => p.id !== def?.id))
      .map(p => [p, [9, 3, 1][p.tier || 0]]), api.random);
    return [def?.id || null, other?.id || null];
  }

  function voucherOffer(s, api) {
    if (s.anteVoucher) return s.anteVoucher;
    const options = Object.values({...api.vouchers, ...upgrades}).filter(def => {
      const owned = api.has ? api.has(s, def.id) : (s.vouchers || []).includes(def.id);
      const prereq = !def.requires || (api.has ? api.has(s, def.requires) : (s.vouchers || []).includes(def.requires));
      const unlocked = !def.unlock || !api.isUnlocked || api.isUnlocked(def.unlock, s, def.id);
      return !owned && prereq && unlocked;
    });
    return options.length ? api.choose(s, options).id : null;
  }

  function openPack(s, def, api) {
    const choices = [];
    const count = def.choices + power(s, "packOptions", api);
    if (def.pool === "familiar") {
      for (let i = 0; i < count; i++) {
        const next = api.randomFamiliar(s, choices.map(ref => splitVariant(ref).id));
        if (next) choices.push(variant(s, next, "familiar", api));
      }
    } else if (def.pool === "standard") {
      for (let i = 0; i < count; i++) {
        const next = cardRef(s, api, choices);
        if (next) choices.push(next);
      }
    } else {
      const options = api.shuffle(s, spellChoices(s, def.pool, api));
      choices.push(...options.slice(0, count));
    }
    const targeted = def.pool === "spell" || def.pool === "spectral";
    return {id:def.id, name:def.name, pool:def.pool, choices, remaining:Math.min(def.picks, choices.length),
      hand:targeted && api.drawPackHand ? api.drawPackHand(s) : []};
  }

  const canDirectUse = def => def?.kind === "spell" && def.minTargets === 0;
  const api = {spells:cards, vouchers:upgrades, packs:boosters, enhancements, seals, editions, stickers, voucherPower,
    splitVariant, withVariant, variant, stock, packsForShop, voucherOffer, openPack, canDirectUse};
  root.CWMarket = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
