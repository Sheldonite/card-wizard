(function (root) {
  "use strict";

  const familiars = {};
  const spells = {};
  const vouchers = {};
  const packs = {};
  const effects = {};
  const colors = {
    merlin: "#ab89eb", owl: "#efc577", orb: "#8cc9ee",
    grimoire: "#b6c883", moth: "#f49aaa", dragon: "#eb9a70",
    key: "#e3bc76", potion: "#98dfc3"
  };
  const glyphs = { merlin: "✦", owl: "◈", orb: "✧", grimoire: "☷", moth: "✥", dragon: "✷", key: "⚿", potion: "◒" };

  function definition(catalog, kind, id, name, art, cost, rarity, description, details = {}) {
    catalog[id] = {
      id, name, kind, cost, rarity, description, art,
      icon: glyphs[art], color: colors[art], ...details
    };
  }

  function familiar(id, name, art, cost, rarity, description, effect) {
    definition(familiars, "familiar", id, name, art, cost, rarity, description);
    effects[id] = typeof effect === "function" ? { hand: effect } : effect;
  }

  const count = (cards, test) => cards.filter(test).length;
  const wild = card => card.enhancement === "wild";
  const red = card => wild(card) || card.suit === "D" || card.suit === "H";
  const black = card => wild(card) || card.suit === "C" || card.suit === "S";
  const isFace = card => card.rank >= 11 && card.rank <= 13;
  const ranksOf = cards => cards.map(card => card.rank).filter(Number.isInteger);
  const suitKinds = cards => {
    const suits = new Set(cards.filter(card => card.suit && !wild(card)).map(card => card.suit));
    return Math.min(4, suits.size + count(cards, wild));
  };
  function largestSuit(cards) {
    return Math.max(...["H", "D", "C", "S"].map(suit => count(cards, card => card.suit === suit || wild(card))));
  }
  function longestRun(cards) {
    const ranks = new Set(ranksOf(cards));
    if (ranks.has(14)) ranks.add(1);
    let longest = 0, streak = 0;
    for (let rank = 1; rank <= 14; rank++) {
      streak = ranks.has(rank) ? streak + 1 : 0;
      longest = Math.max(longest, streak);
    }
    return longest;
  }

  familiar("merlin", "Merlin", "merlin", 4, "Common",
    "+4 Mult, plus +3 Mult per consumable you carry.", c => ({ mult: 4 + 3 * c.consumableCount }));
  familiar("ember_moth", "Ember Moth", "moth", 5, "Common",
    "Each scoring card gives +2 Mult. Lead with a red scoring card to double the bonus.", {
      scoredCard: c => ({ mult: red(c.scoring[0]) ? 4 : 2 })
    });
  familiar("thornwing", "Thornwing", "moth", 5, "Common",
    "Each scoring card gives +12 Chips. Black cards also give +2 Mult.", {
      scoredCard: c => ({ chips: 12, mult: black(c.card) ? 2 : 0 })
    });
  familiar("night_owl", "Night Owl", "owl", 5, "Common",
    "+20 Chips per black card you play, including kickers.", c => ({ chips: 20 * count(c.cards, black) }));
  familiar("gilded_eye", "Gilded Eye", "orb", 6, "Uncommon",
    "Earn $1 per suit among scoring cards, up to $3 per hand.", c => ({ money: Math.min(3, suitKinds(c.scoring)) }));
  familiar("twin_lights", "Twin Lights", "orb", 4, "Common",
    "+3 Mult. Each extra copy of a rank you play adds +5 more.",
    c => {
      const ranks = ranksOf(c.cards);
      return { mult: 3 + 5 * (ranks.length - new Set(ranks).size) };
    });
  familiar("pocket_grimoire", "Pocket Grimoire", "grimoire", 5, "Common",
    "+75 Chips for playing one card. Each extra played card reduces this bonus by 12.",
    c => ({ chips: 75 - 12 * (c.cards.length - 1) }));
  familiar("royal_reader", "Royal Reader", "merlin", 5, "Common",
    "Scoring cards give +8 Chips. Face cards give +25 Chips and +3 Mult instead.", {
      scoredCard: c => isFace(c.card) ? { chips: 25, mult: 3 } : { chips: 8 }
    });
  familiar("opal_owl", "Opal Owl", "owl", 5, "Common",
    "+20 Chips per suit you play. Kickers count and Wild cards fill missing suits.",
    c => ({ chips: 20 * suitKinds(c.cards) }));
  familiar("mooncalf", "Mooncalf", "owl", 5, "Common",
    "Each scoring card ranked 2 through 7 gives +6 Mult. All other scoring cards give +1 Mult.", {
      scoredCard: c => ({ mult: c.card.rank <= 7 ? 6 : 1 })
    });
  familiar("cold_reader", "Cold Reader", "merlin", 5, "Common",
    "+3 Mult per hand left after playing. On your last hand, earn $3 instead.",
    c => c.handsLeft === 0 ? { money: 3 } : { mult: 3 * c.handsLeft });
  familiar("tidal_lens", "Tidal Lens", "orb", 6, "Uncommon",
    "Start at x1 Mult. Gain x0.25 per card in your largest played suit.",
    c => ({ xmult: 1 + 0.25 * largestSuit(c.cards) }));
  familiar("wayfinder", "Wayfinder", "owl", 6, "Uncommon",
    "Start at x1 Mult. Gain x0.3 per rank in your longest played sequence. Aces count high or low.",
    c => ({ xmult: 1 + 0.3 * longestRun(c.cards) }));
  familiar("many_minds", "Many Minds", "dragon", 7, "Uncommon",
    "Each scoring card gives +2 Mult. Then gain x1.5 Mult if two scoring ranks match.",
    c => {
      const ranks = ranksOf(c.scoring);
      return { mult: 2 * c.scoring.length, xmult: ranks.length > new Set(ranks).size ? 1.5 : 1 };
    });
  familiar("echo_book", "Book of Echoes", "grimoire", 5, "Uncommon",
    "+4 Mult. Each earlier play of this hand type in the blind adds +8 more.",
    c => ({ mult: 4 + 8 * Math.max(0, (c.handCounts[c.name] || 0) - 1) }));
  familiar("empty_inkwell", "Empty Inkwell", "potion", 6, "Uncommon",
    "Start each blind at x1.25 Mult. Each discard adds x0.4, up to x2.85.",
    c => ({ xmult: 1.25 + 0.4 * Math.min(4, c.discardCount) }));
  familiar("vesper", "Vesper", "moth", 6, "Uncommon",
    "x1.25 Mult on your opening hand. Each later play this blind raises it by x0.45, up to x3.05.",
    c => ({ xmult: 1.25 + 0.45 * Math.min(4, Math.max(0, c.playedCount - 1)) }));
  familiar("vault_watcher", "Vault Watcher", "owl", 6, "Uncommon",
    "+20 Chips plus +2 per dollar you hold, up to +170 Chips total.", c => ({ chips: 20 + Math.min(150, 2 * c.money) }));
  familiar("dust_scribe", "Dust Scribe", "merlin", 6, "Uncommon",
    "+20 Chips plus +4 for every discard action taken this run.", c => ({ chips: 20 + 4 * c.totalDiscards }));
  familiar("tower_oracle", "Tower Oracle", "merlin", 7, "Uncommon",
    "+3 Mult per Ante. During Boss Blinds, gain +3 more per Ante.", c => ({ mult: c.ante * (c.blind === 2 ? 6 : 3) }));
  familiar("last_leaf", "Last Leaf", "moth", 6, "Uncommon",
    "Earn $3 on the first hand of each blind. Every later hand earns $1.", c => ({ money: c.playedCount === 1 ? 3 : 1 }));
  familiar("folio", "Endless Folio", "grimoire", 7, "Uncommon",
    "+1 Chip per card in your deck. Each card above 52 gives another +8 Chips.",
    c => ({ chips: c.deckSize + 8 * Math.max(0, c.deckSize - 52) }));
  familiar("crown_glass", "Crown Glass", "orb", 8, "Rare",
    "Retrigger your first scoring face card each hand. If no face scores, retrigger the first scoring card.", {
      scoredCard: c => {
        const firstFace = c.scoring.findIndex(isFace);
        return c.cardIndex === Math.max(0, firstFace) ? { retriggers: 1 } : {};
      }
    });
  familiar("prism_wing", "Prism Wing", "moth", 8, "Rare",
    "Each suit you play adds x0.5 Mult to x1. Wild cards fill missing suits.",
    c => ({ xmult: 1 + 0.5 * suitKinds(c.cards) }));
  familiar("star_eater", "Star Eater", "dragon", 9, "Rare",
    "x1.4 Mult at hand level 1. Each extra level adds x0.4 Mult.",
    c => ({ xmult: 1 + 0.4 * c.level }));
  familiar("quiet_court", "Quiet Court", "merlin", 8, "Rare",
    "Each held face card or Ace gives x1.25 Mult.", {
      heldCard: c => isFace(c.card) || c.card.rank === 14 ? { xmult: 1.25 } : {}
    });
  familiar("coven", "The Coven", "grimoire", 9, "Rare",
    "Each equipped familiar, including this one, adds x0.35 Mult to x1.",
    c => ({ xmult: 1 + 0.35 * c.ownedCount }));
  familiar("paper_king", "Paper King", "merlin", 8, "Rare",
    "x1.5 Mult. Each card below a 52-card deck adds x0.2 Mult, up to x3.5.",
    c => ({ xmult: 1.5 + 0.2 * Math.min(10, Math.max(0, 52 - c.deckSize)) }));
  familiar("horizon_owl", "Horizon Owl", "owl", 8, "Rare",
    "Your highest scoring rank sets your Mult bonus, from x1.2 on a 2 to x2.4 on an Ace.",
    c => ({ xmult: 1 + Math.max(0, ...ranksOf(c.scoring)) / 10 }));

  function spell(id, name, art, cost, description, effect, value, minTargets = 0, maxTargets = 0) {
    definition(spells, "spell", id, name, art, cost, effect === "level" ? "Constellation" : "Spell", description,
      { effect, value, minTargets, maxTargets });
  }

  const constellations = [
    ["candle", "The Candle", "High Card"], ["twins", "The Twins", "Pair"], ["mirrors", "The Mirrors", "Two Pair"],
    ["trident", "The Trident", "Three of a Kind"], ["serpent", "The Serpent", "Straight"],
    ["chalice", "The Chalice", "Flush"], ["hearth", "The Hearth", "Full House"],
    ["throne", "The Throne", "Four of a Kind"], ["comet", "The Comet", "Straight Flush"],
    ["hydra", "The Hydra", "Five of a Kind"], ["palace", "The Palace", "Flush House"], ["crown", "The Crown", "Flush Five"]
  ];
  for (const [id, name, hand] of constellations) {
    spell("star_" + id, name, "orb", 3, "Permanently raise " + hand + " by one level this run.", "level", hand);
  }

  spell("blue_ink", "Sapphire Ink", "potion", 3, "Enchant up to 2 cards. Each gains +30 Chips when it scores.", "enhance", "bonus", 1, 2);
  spell("red_ink", "Crimson Ink", "potion", 3, "Enchant up to 2 cards. Each gains +4 Mult when it scores.", "enhance", "mult", 1, 2);
  spell("glasswork", "Glasswork", "orb", 3, "A scoring Glass card gives ×2 Mult and has a 1 in 4 chance to break.", "enhance", "glass", 1, 1);
  spell("iron_skin", "Iron Skin", "merlin", 3, "Enchant 1 card with Steel. It gives ×1.5 Mult while held in hand.", "enhance", "steel", 1, 1);
  spell("heartfire", "Heartfire", "moth", 3, "Change up to 3 cards into Hearts.", "suit", "H", 1, 3);
  spell("thorncall", "Thorncall", "moth", 3, "Change up to 3 cards into Clubs.", "suit", "C", 1, 3);
  spell("duskwater", "Duskwater", "orb", 3, "Change up to 3 cards into Spades.", "suit", "S", 1, 3);
  spell("goldwake", "Goldwake", "orb", 3, "Change up to 3 cards into Diamonds.", "suit", "D", 1, 3);
  spell("ascend", "Ascend", "potion", 3, "Raise up to 2 cards by one rank. An Ace becomes a 2.", "rank", 1, 1, 2);
  spell("mirror_image", "Mirror Image", "orb", 4, "Add a permanent copy of 1 chosen card to your deck.", "copy", 1, 1, 1);
  spell("unwrite", "Unwrite", "grimoire", 4, "Permanently remove up to 2 chosen cards from your deck.", "remove", null, 1, 2);
  spell("alchemy", "Alchemy", "potion", 4, "Double your money, gaining up to $20.", "money", 20);

  function voucher(id, name, art, cost, description, value) {
    definition(vouchers, "voucher", id, name, art, cost, "Voucher", description, { effect: id, value });
  }
  voucher("deep_pockets", "Treasury Seal", "key", 10, "Raise the maximum interest paid after a blind from $5 to $10.", 10);
  voucher("long_sleeve", "Long Sleeve", "merlin", 10, "Draw and hold 1 additional card in every blind.", 1);
  voucher("second_wind", "Second Wind", "moth", 10, "Gain 1 additional discard every blind.", 1);
  voucher("extra_turn", "Borrowed Time", "orb", 10, "Gain 1 additional hand every blind.", 1);
  voucher("trade_route", "Merchant's Pass", "key", 10, "Start each shop at a $3 reroll price.", 3);
  voucher("silver_tongue", "Silver Tongue", "merlin", 10, "Take 20% off shop items, rounded down to the nearest dollar.", 0.8);
  voucher("menagerie", "Menagerie", "owl", 12, "Equip 1 additional familiar.", 1);

  function pack(id, name, art, cost, pool, description) {
    definition(packs, "pack", id, name, art, cost, "Booster", description, { pool, choices: 3, picks: 1 });
  }
  pack("travelers_pack", "Traveler's Pack", "grimoire", 4, "standard", "Choose 1 of 3 playing cards to add permanently to your deck.");
  pack("scroll_case", "Scroll Case", "grimoire", 4, "spell", "Choose 1 of 3 spells to cast.");
  pack("star_chart", "Star Chart", "orb", 4, "star", "Choose 1 of 3 constellations to strengthen a poker hand.");
  pack("familiar_egg", "Familiar Egg", "owl", 6, "familiar", "Choose 1 of 3 familiars for your circle.");

  const expansion = root.CWFamiliars || (typeof require === "function" && require("./familiars.js"));
  const market = root.CWMarket || (typeof require === "function" && require("./market.js"));
  Object.assign(familiars, expansion.definitions);
  for (const familiar of Object.values(familiars)) familiar.art = "familiars/" + familiar.id;
  Object.assign(spells, market.spells);
  Object.assign(vouchers, market.vouchers);
  Object.assign(packs, market.packs);

  function get(id) {
    return familiars[id] || spells[id] || vouchers[id] || packs[id];
  }

  function score(id, context) {
    const effect = effects[typeof id === "string" ? id : id.id];
    const result = effect?.hand?.(context) || {};
    return { chips: 0, mult: 0, xmult: 1, money: 0, ...result };
  }

  function trigger(id, event, context, memory) {
    if (effects[id]) return event === "hand" ? score(id, context) : effects[id][event]?.(context, memory) || {};
    return expansion.trigger(id, event, context, memory) || {};
  }

  function portrait(name) {
    return root.CWEmbeddedArt?.[name] || "art/" + name + ".png";
  }
  function colorStats(container) {
    const walker=document.createTreeWalker(container,NodeFilter.SHOW_TEXT);
    const nodes=[];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    for(const node of nodes){
      if(node.parentElement?.closest('[data-colored-term], .stat-money, .stat-chips, .stat-mult, .term-familiar, .term-constellation, option, svg, [aria-hidden="true"]')) continue;
      const matches=node.data.matchAll(/(?:[+x\u00d7-]?\d+(?:\.\d+)?\s+)?\b(chips?|mult(?:i|iplier)?s?|familiars?|constellations?|spectral(?: cards?)?|spells?|vouchers?|(?:booster )?packs?|boosters?)\b|([+\u2212-]?\$\d+(?:,\d{3})*(?:\.\d+)?(?:\s*[-\u2013]\s*\$\d+(?:,\d{3})*(?:\.\d+)?)?|(?:\d+(?:\.\d+)?\s+)?\b(?:dollars?|cash|money|interest|coins?)\b)|(\+\d+(?:\.\d+)?|\bx\d+(?:\.\d+)?|\u00d7\d+(?:\.\d+)?)(?:\s+(?:more|total|instead)\b)?/gi);
      const parts=document.createDocumentFragment();
      let end=0, scoringStat='';
      for(const match of matches){
        const term=match[1]?.toLowerCase();
        let color;
        if(term?.startsWith('chip'))color=scoringStat='stat-chips';
        else if(term?.startsWith('mult'))color=scoringStat='stat-mult';
        else if(term) {
          let family=term.replace(/s$/,'');
          if(term.startsWith('spectral'))family='spectral';
          if(term.startsWith('booster'))family='pack';
          color='term-'+family;
        }
        else if(match[2])color='stat-money';
        else color=scoringStat;
        if(!color)continue;
        parts.append(node.data.slice(end,match.index));
        const stat=document.createElement('span');
        stat.className=color;
        stat.dataset.coloredTerm='';
        stat.textContent=match[0];
        parts.append(stat);
        end=match.index+match[0].length;
      }
      if(end){parts.append(node.data.slice(end));node.replaceWith(parts);}
    }
  }
  const cardTypes = {
    standard: ['Playing card','<path d="M5 5h13v16H5z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m8 3 12-1 2 16M12 8l3 5-3 5-4-5z" fill="currentColor"/>'],
    familiar: ['Familiar','<path fill="currentColor" d="M5 17c0-2 2-3 3-5 2-3 5-3 7 0 1 2 4 3 4 5 0 4-4 3-7 2-3 1-7 2-7-2Z"/><g fill="currentColor"><ellipse cx="4" cy="10" rx="2" ry="3"/><ellipse cx="9" cy="6" rx="2" ry="3"/><ellipse cx="15" cy="6" rx="2" ry="3"/><ellipse cx="20" cy="10" rx="2" ry="3"/></g>'],
    spell: ['Spell','<path d="M8 3h8m-6 1v5L5 17q-2 4 3 4h8q5 0 3-4l-5-8V4M7 15q3-2 5 0t5 0" fill="none" stroke="currentColor" stroke-width="2"/>'],
    constellation: ['Constellation','<path d="m3 16 6-11 7 12 5-9" fill="none" stroke="currentColor" stroke-width="1.8"/><g fill="currentColor"><circle cx="3" cy="16" r="2.4"/><circle cx="9" cy="5" r="3"/><circle cx="16" cy="17" r="2.7"/><circle cx="21" cy="8" r="2"/></g>'],
    spectral: ['Spectral','<path d="M4 20v-8a8 8 0 1 1 16 0v8l-4-3-4 3-4-3z" fill="currentColor"/><path d="M9 10v3m6-3v3" stroke="#182638" stroke-width="2.5"/>'],
    voucher: ['Voucher','<path d="M2 6h20v4q-4 2 0 4v4H2v-4q4-2 0-4zm14 0v12" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>'],
    pack: ['Booster','<path d="m3 8 9-5 9 5-9 5zm0 0v9l9 5 9-5V8m-9 5v9M7 6l9 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>']
  };
  function cardType(d) {
    if (d.kind === 'spell' && d.rarity === 'Constellation') return 'constellation';
    if (d.kind === 'spell' && d.rarity === 'Spectral') return 'spectral';
    return Object.hasOwn(cardTypes,d.kind) ? d.kind : '';
  }
  function typeBadge(type, compact = false) {
    if (!type) return '';
    const [name, drawing] = cardTypes[type];
    return '<span class="type-badge"'+(compact?' title="'+name+'"':'')+'><svg aria-hidden="true" viewBox="0 0 24 24">'+drawing+'</svg><span'+(compact?' class="visually-hidden"':'')+'>'+name+'</span></span>';
  }
  function familiarFinish(d, elapsed = Infinity) {
    if (d.kind !== 'familiar') return '';
    const edition = ['foil','holographic','polychrome','negative'].includes(d.edition) ? d.edition : '';
    const value = Number(d.stackAmount?.replace(/^x/, ''));
    const charged = value > (d.stackStat === 'xmult' ? 1 : 0);
    const finish = edition || (charged && (d.stackStat === 'chips' ? 'chips' : 'mult'));
    if (!finish) return '';
    const burst = elapsed < 1050 ? '<i class="familiar-burst" style="animation-delay:-'+elapsed+'ms">✦</i>' : '';
    return '<span class="familiar-finish finish-'+finish+'" aria-hidden="true">'+burst+'</span>';
  }
  const api = { familiarFinish, cardTypes, cardType, typeBadge, familiars, spells, vouchers, packs, get, score, trigger, portrait, colorStats };
  root.CWContent = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
